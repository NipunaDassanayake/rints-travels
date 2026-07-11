const bcrypt = require("bcryptjs");

// salt_rounds is the cost factor for hashing the password. A higher value increases security but also increases computation time.
const SALT_ROUNDS = 12; // 12 is industry standard for bcrypt and provides a good balance between security and performance.

/**
 * Hash a plain text password.
 *
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain password with a stored hash.
 *
 * @param {string} password
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
};