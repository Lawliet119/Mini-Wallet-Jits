/**
 * pinService.js
 *
 * Hashes and verifies login/transaction PIN values.
 */
var bcrypt = require('bcryptjs');
var SALT_ROUNDS = 10;

module.exports = {
  hash: async function(pin) {
    return bcrypt.hash(String(pin), SALT_ROUNDS);
  },

  verify: async function(pin, pinHash) {
    if (!pinHash) {
      return false;
    }

    return bcrypt.compare(String(pin), pinHash);
  }
};
