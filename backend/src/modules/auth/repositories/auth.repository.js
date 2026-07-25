const prisma = require("../../../config/prisma");

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

const createRefreshToken = async (data) => {
  return prisma.refreshToken.create({
    data,
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

const updateRefreshTokenUsage = async (id, data) => {
  return prisma.refreshToken.update({
    where: {
      id,
    },
    data: {
      ...data,
      lastUsedAt: new Date(),
    },
  });
};

const revokeRefreshToken = async (id) => {
  return prisma.refreshToken.update({
    where: {
      id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

const revokeAllUserRefreshTokens = async (userId) => {
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  findRefreshTokenBySessionId,
  updateRefreshTokenUsage,
};