const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { UUID, parseGeneration, verifyBoundRefreshToken } = require("../helpers/auth.boundProtocol");
const { classifySession, decideBoundRefresh, recoveryDeadline } = require("../helpers/auth.boundSession");
const { generateBinding, parseBinding, requireBinding } = require("../helpers/auth.browserBinding");
const { createRefreshRecovery } = require("../helpers/auth.refreshRecovery");
const { invalidCredential, authFailure } = require("../helpers/auth.recoveryError");
const { hashToken } = require("../helpers/auth.tokenHash");

// Dependencies are explicit for deterministic tests; production uses the same
// repository and DB clock. No HTTP fault-injection or runtime test switches.
const createBoundSessionService = ({ repository: repo, config }) => {
  const recovery = createRefreshRecovery({ ...config.refreshRecovery, jwtSecret: config.jwt.refreshSecret });
  const access = (user, sid, now) => jwt.sign({ sub: user.id, sid, role: user.role,
    type: "access", iat: Math.floor(now.getTime() / 1000) }, config.jwt.accessSecret,
  { algorithm: "HS256", expiresIn: config.jwt.accessExpiresIn });
  const issue = (userId, sessionId, generation, absoluteExpiresAt, now) => {
    const claims = { sub: userId, jti: sessionId, rid: crypto.randomUUID(), gen: generation,
      aexp: absoluteExpiresAt, iat: Math.floor(now.getTime() / 1000), type: "refresh_bound_v2" };
    // Let the existing JWT library interpret the configured duration. Only the
    // capped final token is returned or persisted (encrypted).
    const configured = jwt.decode(jwt.sign(claims, config.jwt.refreshSecret,
      { algorithm: "HS256", expiresIn: config.jwt.refreshExpiresIn })).exp;
    const exp = Math.min(configured, absoluteExpiresAt,
      Math.floor((now.getTime() + config.cookie.refreshTokenMaxAgeMs) / 1000));
    if (exp <= claims.iat) throw invalidCredential();
    const token = jwt.sign({ ...claims, exp }, config.jwt.refreshSecret, { algorithm: "HS256" });
    return { token, expiresAt: new Date(exp * 1000), hash: hashToken(token) };
  };
  const metadata = (session, absoluteExpiresAt) => ({ sessionId: session.sessionId,
    userId: session.userId, generation: session.refreshGeneration.toString(), tokenHash: session.tokenHash,
    browserBindingHash: session.browserBindingHash, effectiveExpiresAt: session.expiresAt,
    recoveryExpiresAt: session.refreshRecoveryExpiresAt, absoluteExpiresAt });
  const active = (user) => user.status === "ACTIVE" && user.deletedAt == null;
  const create = (user, context = {}) => repo.withUser(user.id, async (tx, lockedUser) => {
    if (!active(lockedUser)) throw authFailure("AUTH_ACCOUNT_INACTIVE", 403);
    const now = await repo.now(tx);
    const sessionId = crypto.randomUUID();
    const binding = generateBinding(sessionId);
    const aexp = Math.floor((now.getTime() + config.session.absoluteMaxAgeMs) / 1000);
    const issued = issue(user.id, sessionId, "0", aexp, now);
    await tx.refreshToken.create({ data: { userId: user.id, sessionId, tokenHash: issued.hash,
      browserBindingHash: binding.hash, refreshGeneration: 0n, expiresAt: issued.expiresAt,
      createdAt: now, deviceName: context.deviceName || null, ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null } });
    return { user: lockedUser, bound: true, sessionId, generation: "0", refreshToken: issued.token,
      accessToken: access(lockedUser, sessionId, now), expiresAt: issued.expiresAt,
      binding: binding.value, bindingExpiresAt: new Date(aexp * 1000) };
  });

  const identify = (observed) => {
    const binding = parseBinding(observed.binding); // Missing binding never reaches a writer.
    const candidates = [];
    for (const candidate of observed.candidates) {
      if (candidate.sessionId !== binding.sessionId) continue;
      try {
        // Identity routing only. Expiry and every claim are rechecked under the
        // lock using the database clock; cookie names are never credentials.
        const p = jwt.verify(candidate.token, config.jwt.refreshSecret, { algorithms: ["HS256"], ignoreExpiration: true });
        if (p.type !== "refresh_bound_v2" || typeof p.sub !== "string" || !UUID.test(p.sub) ||
            p.jti !== binding.sessionId || p.gen !== candidate.generation) continue;
        parseGeneration(p.gen);
        candidates.push({ ...candidate, payload: p, hash: hashToken(candidate.token) });
      } catch { /* Invalid siblings cannot override a usable signed current token. */ }
    }
    if (!candidates.length || new Set(candidates.map((c) => c.payload.sub)).size !== 1) throw invalidCredential();
    return { userId: candidates[0].payload.sub, sessionId: binding.sessionId, candidates };
  };
  const execute = async (observed, context, logout) => {
    const identity = identify(observed);
    const result = await repo.withUser(identity.userId, async (tx, user) => {
      const session = await repo.lockSession(tx, user.id, identity.sessionId);
      const now = await repo.now(tx);
      if (!session || classifySession(session) !== "BOUND") throw invalidCredential();
      requireBinding(observed.binding, session);
      const valid = identity.candidates.flatMap((candidate) => {
        try {
          const payload = verifyBoundRefreshToken(candidate.token, { secret: config.jwt.refreshSecret,
            now, userId: user.id, sessionId: session.sessionId });
          return [{ ...candidate, payload }];
        } catch { return []; }
      });
      if (!valid.length) throw invalidCredential();
      if (logout) {
        if (!session.revokedAt) await repo.revoke(tx, session.id, now);
        return { bound: true, sessionId: session.sessionId };
      }
      // A stale sibling must never revoke a session when its current token is
      // also present. Compare both signed generation and the persisted hash.
      const current = valid.find((c) => c.hash === session.tokenHash && BigInt(c.payload.gen) === session.refreshGeneration);
      const predecessor = valid.find((c) => c.hash === session.previousTokenHash && BigInt(c.payload.gen) === session.refreshGeneration - 1n);
      const selected = current || predecessor || valid[0];
      const decision = decideBoundRefresh({ session, presented: { ...selected.payload, hash: selected.hash },
        now, bindingVerified: true, accountActive: active(user) });
      if (decision.action === "REVOKE") {
        await repo.revoke(tx, session.id, now);
        return { rejected: true }; // Commit before converting this to 401.
      }
      if (decision.action === "REJECT") throw invalidCredential();
      let token;
      let row = session;
      if (decision.action === "RECOVER") {
        token = recovery.decrypt(session.refreshRecoveryCiphertext, metadata(session, selected.payload.aexp), now);
      } else {
        const issued = issue(user.id, session.sessionId, decision.generation, selected.payload.aexp, now);
        row = { ...session, refreshGeneration: BigInt(decision.generation), tokenHash: issued.hash,
          previousTokenHash: session.tokenHash, expiresAt: issued.expiresAt,
          refreshRecoveryExpiresAt: recoveryDeadline({ now, effectiveExpiresAt: issued.expiresAt,
            predecessorExpiresAt: new Date(selected.payload.exp * 1000) }) };
        const ciphertext = recovery.encrypt(issued.token, metadata(row, selected.payload.aexp), now);
        await tx.refreshToken.update({ where: { id: session.id }, data: {
          refreshGeneration: row.refreshGeneration, tokenHash: row.tokenHash, previousTokenHash: row.previousTokenHash,
          expiresAt: row.expiresAt, refreshRecoveryExpiresAt: row.refreshRecoveryExpiresAt,
          refreshRecoveryCiphertext: ciphertext, lastUsedAt: now,
          ipAddress: context.ipAddress || null, userAgent: context.userAgent || null } });
        token = issued.token;
      }
      return { user, bound: true, sessionId: row.sessionId, generation: row.refreshGeneration.toString(),
        refreshToken: token, expiresAt: row.expiresAt, accessToken: access(user, row.sessionId, now) };
    });
    if (result.rejected) throw invalidCredential();
    return result;
  };
  return { create, refresh: (observed, context = {}) => execute(observed, context, false),
    logout: (observed) => execute(observed, {}, true) };
};

module.exports = { createBoundSessionService };
