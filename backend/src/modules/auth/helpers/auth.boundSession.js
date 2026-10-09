const { parseGeneration, nextGeneration, UUID } = require("./auth.boundProtocol");
const { invalidSessionState } = require("./auth.recoveryError");

const hash = (value) => typeof value === "string" && value.length === 64 && /^[0-9a-f]{64}$/.test(value);
const instant = (value) => value instanceof Date && Number.isFinite(value.getTime());

const classifySession = (session) => {
  if (!session || !UUID.test(session.sessionId)) throw invalidSessionState();
  const { browserBindingHash: binding, refreshGeneration: generation,
    refreshRecoveryCiphertext: ciphertext, refreshRecoveryExpiresAt: deadline } = session;
  if (binding === null && generation === null && ciphertext === null && deadline === null) return "LEGACY";
  if (!hash(binding) || typeof generation !== "bigint" || generation < 0n || generation > 9223372036854775807n ||
      (ciphertext === null) !== (deadline === null) || ciphertext === undefined || deadline === undefined) throw invalidSessionState();
  if (ciphertext !== null && (typeof ciphertext !== "string" || !ciphertext || !instant(deadline) ||
      !hash(session.previousTokenHash) || generation === 0n || session.revokedAt !== null)) throw invalidSessionState();
  return "BOUND";
};

const isRecoveryActive = (now, deadline) => {
  if (!instant(now) || (deadline !== null && !instant(deadline))) throw invalidSessionState();
  return deadline !== null && now.getTime() < deadline.getTime();
};

const recoveryDeadline = ({ now, effectiveExpiresAt, predecessorExpiresAt }) => {
  if (![now, effectiveExpiresAt, predecessorExpiresAt].every(instant) ||
      effectiveExpiresAt <= now || predecessorExpiresAt <= now) throw invalidSessionState();
  return new Date(Math.min(now.getTime() + 30_000, effectiveExpiresAt.getTime(), predecessorExpiresAt.getTime()));
};

// No mutation/issuance. Stage 2 must provide a signature-verified token, a binding
// check, and CURRENT locked-row metadata. Returned revocation decisions must be
// committed before translating the result into an HTTP failure.
const decideBoundRefresh = ({ session, presented, now, bindingVerified, accountActive }) => {
  if (classifySession(session) !== "BOUND") throw invalidSessionState();
  if (!instant(now)) throw invalidSessionState();
  if (bindingVerified !== true) return { action: "REJECT", reason: "BINDING" };
  if (!presented || presented.type !== "refresh_bound_v2" || presented.jti !== session.sessionId ||
      presented.sub !== session.userId || !hash(presented.hash)) return { action: "REJECT", reason: "PROTOCOL" };
  const generation = parseGeneration(presented.gen);
  if (!Number.isSafeInteger(presented.exp) || !Number.isSafeInteger(presented.aexp) ||
      presented.exp > presented.aexp || presented.exp * 1000 <= now.getTime()) return { action: "REJECT", reason: "TOKEN_EXPIRED" };
  if (session.revokedAt !== null) return { action: "REJECT", reason: "REVOKED" };
  if (!instant(session.expiresAt)) throw invalidSessionState();
  if (session.expiresAt <= now || presented.aexp * 1000 <= now.getTime()) return { action: "REVOKE", reason: "EXPIRED" };
  if (accountActive !== true) return { action: "REVOKE", reason: "ACCOUNT_INACTIVE" };
  const current = generation === session.refreshGeneration && presented.hash === session.tokenHash;
  const predecessor = generation === session.refreshGeneration - 1n && presented.hash === session.previousTokenHash;
  if (current || predecessor) {
    if (isRecoveryActive(now, session.refreshRecoveryExpiresAt)) {
      return { action: "RECOVER", generation: session.refreshGeneration.toString(), deadline: new Date(session.refreshRecoveryExpiresAt) };
    }
    if (current) return { action: "ROTATE", generation: nextGeneration(presented.gen) };
  }
  return { action: "REVOKE", reason: "REUSE" };
};

module.exports = { classifySession, isRecoveryActive, recoveryDeadline, decideBoundRefresh };
