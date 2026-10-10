const env = require("../../../config/env");
const prisma = require("../../../config/prisma");
const { createSessionRepository } = require("../repositories/session.repository");
const { createBoundSessionService } = require("./boundSession.service");
const { createBoundCookies } = require("../helpers/auth.boundCookies");

const repository = createSessionRepository(prisma);
const bound = createBoundSessionService({ repository, config: env });
const cookies = createBoundCookies({ ...env.cookie, nodeEnv: env.nodeEnv });
module.exports = { repository, bound, cookies };
