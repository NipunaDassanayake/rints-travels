const prisma = require("../../../config/prisma");
const { createSessionRepository } = require("./session.repository");
const { invalidCredential } = require("../helpers/auth.recoveryError");
const sessions = createSessionRepository(prisma);

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
};

const createUser = async (data) => {
  return prisma.user.create({
    data,
  });
};

const findActiveAdmins = async () => {
  return prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "SYSTEM_ADMIN"],
      },
      status: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
    orderBy: {
      firstName: "asc",
    },
  });
};

const createRefreshToken = async (data) => {
  return sessions.withUser(data.userId, async (tx, user) => {
    if (user.status !== "ACTIVE" || user.deletedAt != null) throw invalidCredential();
    return tx.refreshToken.create({ data });
  });
};

const findRefreshTokenByHash = async (tokenHash) => {
  return prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });
};

const findRefreshTokenBySessionId = async (sessionId) => {
  return prisma.refreshToken.findUnique({
    where: {
      sessionId,
    },
    include: {
      user: true,
    },
  });
};

/**
 * Atomic refresh-token rotation (compare-and-swap).
 *
 * Only succeeds while the session still holds expectedTokenHash
 * and is not revoked, so each refresh token can be rotated at
 * most once, even by concurrent requests, and a concurrent
 * logout always wins. In the same single UPDATE the replaced
 * hash becomes previousTokenHash and the new hash becomes
 * current. Returns true when this call rotated it.
 */
const rotateRefreshToken = async (id, expectedTokenHash, data) => {
  const result = await prisma.refreshToken.updateMany({
    where: {
      id,
      tokenHash: expectedTokenHash,
      revokedAt: null,
    },
    data: {
      ...data,
      previousTokenHash: expectedTokenHash,
      lastUsedAt: new Date(),
    },
  });

  return result.count === 1;
};

const revokeRefreshToken = async (id) => {
  const identity = await prisma.refreshToken.findUnique({ where: { id }, select: { userId: true, sessionId: true } });
  if (!identity) return null;
  return sessions.withUser(identity.userId, async (tx) => {
    const row = await sessions.lockSession(tx, identity.userId, identity.sessionId);
    if (!row || row.revokedAt) return row;
    return sessions.revoke(tx, row.id, await sessions.now(tx));
  });
};

const revokeAllUserRefreshTokens = async (userId) => {
  return sessions.withUser(userId, (tx) => sessions.revokeAll(tx, userId));
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  findActiveAdmins,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  findRefreshTokenBySessionId,
  rotateRefreshToken,
};
