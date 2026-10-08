const logger = require("../config/logger");
const { sendError } = require("../utils/apiResponse");

/*
 * Never log the error object itself (CR-032): a Prisma/database
 * error's message, stack and meta embed the failing query's
 * arguments -- e.g. a booking confirmation code hash -- and other
 * errors' messages can quote the request body. Only fields that are
 * safe by construction are logged; the logger's redaction paths stay
 * as defense in depth.
 */

const SAFE_ERROR_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

const MAX_STACK_FRAMES = 15;

const isDatabaseError = (err) =>
  typeof err?.name === "string" && err.name.startsWith("PrismaClient");

/** Stack frames only ("at ..." lines): the message text is dropped. */
const stackFrames = (err) =>
  typeof err?.stack === "string"
    ? err.stack
        .split("\n")
        .filter((line) => /^\s+at /.test(line))
        .slice(0, MAX_STACK_FRAMES)
        .map((line) => line.trim())
    : undefined;

/** "model.operation" from a Prisma message, e.g. "booking.create". */
const prismaOperation = (err) => {
  const match = /Invalid `(?:[\w$]+\.)?(\w+)\.(\w+)\(\)` invocation/.exec(
    typeof err?.message === "string" ? err.message : "",
  );

  return match ? `${match[1]}.${match[2]}` : undefined;
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err?.statusCode || 500;

  const database = isDatabaseError(err);

  const path = `${req.baseUrl || ""}${req.path || ""}`;

  const log = {
    event: "REQUEST_FAILED",
    method: req.method,
    path,
    correlationId: req.correlationId || null,
    statusCode,
    errorName: typeof err?.name === "string" ? err.name : typeof err,
    errorCode:
      typeof err?.code === "string" && SAFE_ERROR_CODE.test(err.code)
        ? err.code
        : undefined,
    prismaOperation: database ? prismaOperation(err) : undefined,
    // Only the application's own error messages are logged.
    message: err?.isOperational ? err.message : undefined,
    stack: stackFrames(err),
  };

  if (statusCode >= 500) {
    logger.error(log, `${req.method} ${path} failed`);
  } else {
    logger.warn(log, `${req.method} ${path} failed`);
  }

  // Database internals (including query values) never reach clients.
  const message = database
    ? "Internal server error"
    : err?.message || "Internal server error";

  return sendError(res, message, database ? null : err?.errors || null, statusCode);
};

module.exports = errorHandler;
