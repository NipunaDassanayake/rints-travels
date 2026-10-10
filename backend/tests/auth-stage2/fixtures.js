const { createBoundSessionService } = require("../../src/modules/auth/services/boundSession.service");
const { createBoundCookies } = require("../../src/modules/auth/helpers/auth.boundCookies");
const f = require("../auth/fixtures");

const config = () => ({
  jwt: { accessSecret: f.secret, refreshSecret: f.secret, accessExpiresIn: "15m", refreshExpiresIn: "1h" },
  cookie: { refreshTokenMaxAgeMs: 3600_000, secure: false, sameSite: "lax" },
  session: { absoluteMaxAgeMs: 7200_000 },
  refreshRecovery: { keys: new Map([["test", Buffer.alloc(32, 17)]]), activeKeyId: "test", issuanceEnabled: true },
});
const cookies = createBoundCookies({ secure: false, sameSite: "lax", nodeEnv: "test" });
const observed = (login, ...tokens) => cookies.parse([
  `${cookies.bindingName}=${login.binding}`,
  ...tokens.map((value) => `${cookies.cookieName(value.sessionId, value.generation)}=${value.refreshToken}`),
].join("; "));

const harness = () => {
  const cfg = config();
  const user = { id: f.userId, status: "ACTIVE", deletedAt: null, role: "TOURIST" };
  const state = { row: null, now: new Date(f.now), writes: 0, commits: 0 };
  const tx = { refreshToken: {
    async create({ data }) {
      state.writes++;
      state.row = { id: f.otherId, previousTokenHash: null, revokedAt: null, lastUsedAt: null,
        refreshRecoveryCiphertext: null, refreshRecoveryExpiresAt: null, ...data };
      return structuredClone(state.row);
    },
    async update({ data }) { state.writes++; Object.assign(state.row, data); return structuredClone(state.row); },
  } };
  const repo = {
    async withUser(_id, work) {
      const before = structuredClone(state);
      try { const result = await work(tx, user); state.commits++; return result; }
      catch (error) { Object.assign(state, before); throw error; }
    },
    async now() { return new Date(state.now); },
    async lockSession() { return structuredClone(state.row); },
    async revoke(_tx, _id, now) { return tx.refreshToken.update({ data: { revokedAt: now,
      previousTokenHash: null, refreshRecoveryCiphertext: null, refreshRecoveryExpiresAt: null } }); },
  };
  return { config: cfg, user, state, repo, service: createBoundSessionService({ repository: repo, config: cfg }) };
};
module.exports = { config, cookies, observed, harness };
