const crypto = require("crypto");

const env = require("../../config/env");

/**
 * =========================================================
 * Booking Lifecycle Confirmation Codes (CR-032)
 * =========================================================
 *
 * The traveler generates a short-lived 6-digit code and hands it
 * to the assigned guide, who must enter it to start or complete
 * the tour.
 *
 * Only an HMAC of the code is stored. With 1,000,000 possible
 * codes a slow hash (bcrypt/Argon2) would add latency without
 * adding protection, so the defence is the server-side secret
 * (a database copy alone cannot be brute-forced), the 5-minute
 * lifetime and the 5-attempt limit. The challenge id, booking id
 * and action are part of the HMAC input, so a code can never be
 * reused for another booking or the other action.
 *
 * The plaintext code exists only while generating it, in the one
 * traveler response and in the guide's verification request. It
 * is never persisted or logged.
 */

const CODE_TTL_MS = 5 * 60 * 1000;

const MAX_FAILED_ATTEMPTS = 5;

const CODE_PATTERN = /^\d{6}$/;

/**
 * The booking status each action starts from and moves to.
 */
const LIFECYCLE_TRANSITIONS = {
  START: {
    from: "CONFIRMED",
    to: "IN_PROGRESS",
  },

  COMPLETE: {
    from: "IN_PROGRESS",
    to: "COMPLETED",
  },
};

const generateCode = () => {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
};

const hashCode = ({ challengeId, bookingId, action, code }) => {
  return crypto
    .createHmac("sha256", env.bookingConfirmation.secret)
    .update(`${challengeId}:${bookingId}:${action}:${code}`)
    .digest("hex");
};

/**
 * Timing-safe comparison of a submitted code with a stored hash.
 */
const codeMatches = (challenge, code) => {
  if (typeof code !== "string" || !CODE_PATTERN.test(code)) {
    return false;
  }

  const expected = Buffer.from(challenge.codeHash, "hex");

  const actual = Buffer.from(
    hashCode({
      challengeId: challenge.id,
      bookingId: challenge.bookingId,
      action: challenge.action,
      code,
    }),
    "hex",
  );

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

module.exports = {
  CODE_TTL_MS,
  MAX_FAILED_ATTEMPTS,
  CODE_PATTERN,
  LIFECYCLE_TRANSITIONS,
  generateCode,
  hashCode,
  codeMatches,
};
