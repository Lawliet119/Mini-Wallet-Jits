/**
 * checksumService.js
 *
 * Signs wallet balances so manual balance edits can be detected later.
 */
var crypto = require('crypto');

var stringify = function(value) {
  return value === undefined || value === null ? '' : String(value);
};

module.exports = {
  signPocket: function(pocket) {
    var payload = [
      stringify(pocket.id),
      stringify(pocket.client),
      stringify(pocket.customer),
      stringify(pocket.currency),
      stringify(pocket.balance)
    ].join('|');

    return crypto
      .createHmac('sha256', sails.config.custom.checksumSecret)
      .update(payload)
      .digest('hex');
  },

  verifyPocket: function(pocket) {
    if (!pocket || !pocket.checksum) {
      return false;
    }

    return pocket.checksum === this.signPocket(pocket);
  }
};
