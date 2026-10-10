const { AppError } = require("../../../utils/AppError");
const { authFailure, invalidCredential } = require("../helpers/auth.recoveryError");

// Bound refresh, session creation and revocation take the account lock first.
// Creation cannot slip between logout-all's session scan and commit. The legacy
// refresh path retains its existing compare-and-swap algorithm.
const createSessionRepository = (prisma) => {
  const withUser = async (userId, operation) => {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '3s'");
        await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '8s'");
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw invalidCredential();
        return operation(tx, user);
      }, { maxWait: 5000, timeout: 10000, isolationLevel: "ReadCommitted" });
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Includes lock/deadlock/timeout and an ambiguous COMMIT result. Never
      // retry here: the next request must inspect the committed session state.
      throw authFailure("AUTH_SESSION_UNAVAILABLE", 503);
    }
  };
  const lockSession = async (tx, userId, sessionId) => {
    await tx.$queryRaw`SELECT id FROM refresh_tokens
      WHERE user_id = ${userId}::uuid AND session_id = ${sessionId}::uuid FOR UPDATE`;
    return tx.refreshToken.findFirst({ where: { userId, sessionId } });
  };
  const lockSessions = async (tx, userId) => {
    await tx.$queryRaw`SELECT id FROM refresh_tokens WHERE user_id = ${userId}::uuid ORDER BY id FOR UPDATE`;
  };
  const now = async (tx) => {
    // transaction_timestamp() would precede a wait for the row locks.
    const [row] = await tx.$queryRaw`SELECT clock_timestamp() AS now`;
    return row.now;
  };
  const revokedData = (time) => ({ revokedAt: time, previousTokenHash: null,
    refreshRecoveryCiphertext: null, refreshRecoveryExpiresAt: null });
  const revoke = (tx, id, time) => tx.refreshToken.update({ where: { id }, data: revokedData(time) });
  const revokeLockedSessions = async (tx, userId) => {
    return tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: revokedData(await now(tx)) });
  };
  const revokeAll = async (tx, userId) => {
    await lockSessions(tx, userId);
    return revokeLockedSessions(tx, userId);
  };
  return { withUser, lockSession, lockSessions, now, revoke, revokeAll, revokeLockedSessions };
};

module.exports = { createSessionRepository };
