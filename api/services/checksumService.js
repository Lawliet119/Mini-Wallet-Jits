/**
 * checksumService.js
 *
 * Signs wallet balances so manual balance edits can be detected later.
 */
var crypto = require('crypto');

var stringify = function(value) {
  return value === undefined || value === null ? '' : String(value);
};

var toBalanceNumber = function(value, fallback) {
  var amount = Number(value);

  if (!Number.isSafeInteger(amount)) {
    return fallback;
  }

  return amount;
};

var normalizePocketSnapshot = function(pocket) {
  var legacyBalance = toBalanceNumber(pocket.balance, 0);
  var availableBalance = toBalanceNumber(pocket.availableBalance, legacyBalance);
  var holdBalance = toBalanceNumber(pocket.holdBalance, 0);
  var settledBalance = toBalanceNumber(pocket.settledBalance, availableBalance + holdBalance);

  return Object.assign({}, pocket, {
    balance: availableBalance,
    availableBalance: availableBalance,
    holdBalance: holdBalance,
    settledBalance: settledBalance
  });
};

var normalizeLegacyPocketSnapshot = function(pocket) {
  var legacyBalance = toBalanceNumber(pocket.balance, 0);

  return Object.assign({}, pocket, {
    balance: legacyBalance,
    availableBalance: legacyBalance,
    holdBalance: 0,
    settledBalance: legacyBalance
  });
};

var signLegacyPocket = function(pocket) {
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
};

module.exports = {
  normalizePocketSnapshot: normalizePocketSnapshot,
  normalizeLegacyPocketSnapshot: normalizeLegacyPocketSnapshot,

  hasLegacySignature: function(pocket) {
    return Boolean(pocket && pocket.checksum && pocket.checksum === signLegacyPocket(pocket));
  },

  signPocket: function(pocket) {
    var normalizedPocket = normalizePocketSnapshot(pocket);
    var payload = [
      stringify(normalizedPocket.id),
      stringify(normalizedPocket.client),
      stringify(normalizedPocket.customer),
      stringify(normalizedPocket.currency),
      stringify(normalizedPocket.balance),
      stringify(normalizedPocket.availableBalance),
      stringify(normalizedPocket.holdBalance),
      stringify(normalizedPocket.settledBalance)
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

    return pocket.checksum === this.signPocket(pocket) ||
      this.hasLegacySignature(pocket);
  }
};
