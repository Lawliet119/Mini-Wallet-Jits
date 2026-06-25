/**
 * pocketService.js
 *
 * Centralizes pocket creation, checksum verification, and balance changes.
 */
var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

var assertPositiveAmount = function(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw makeError('INVALID_AMOUNT');
  }
};

var signPatch = function(pocket, patch) {
  return checksumService.signPocket(Object.assign({}, pocket, patch));
};

module.exports = {
  createInternalPocket: async function(client, options) {
    if (client !== 'bank' && client !== 'system') {
      throw makeError('BAD_REQUEST');
    }

    var existedPocket = await Pocket.findOne({
      client: client,
      currency: options.currency || 'VND'
    });

    if (existedPocket) {
      return this.getVerifiedPocket(existedPocket.id);
    }

    var pocket = await Pocket.create({
      client: client,
      currency: options.currency || 'VND',
      balance: options.balance || 0,
      checksum: null
    }).fetch();

    return Pocket.updateOne({ id: pocket.id }).set({
      checksum: checksumService.signPocket(pocket)
    });
  },

  createBillerPocket: async function(currency) {
    var pocket = await Pocket.create({
      client: 'biller',
      currency: currency || 'VND',
      balance: 0,
      checksum: null
    }).fetch();

    return Pocket.updateOne({ id: pocket.id }).set({
      checksum: checksumService.signPocket(pocket)
    });
  },

  createCustomerPocket: async function(customerId, currency) {
    var pocket = await Pocket.create({
      client: 'customer',
      customer: customerId,
      currency: currency || 'VND',
      balance: 0,
      checksum: null
    }).fetch();

    return Pocket.updateOne({ id: pocket.id }).set({
      checksum: checksumService.signPocket(pocket)
    });
  },

  getVerifiedPocket: async function(pocketId) {
    var pocket = await Pocket.findOne({ id: pocketId });

    if (!pocket) {
      throw makeError('POCKET_NOT_FOUND');
    }

    if (!checksumService.verifyPocket(pocket)) {
      throw makeError('POCKET_CHECKSUM_INVALID');
    }

    return pocket;
  },

  refreshChecksum: async function(pocketId) {
    var pocket = await Pocket.findOne({ id: pocketId });

    if (!pocket) {
      throw makeError('POCKET_NOT_FOUND');
    }

    return Pocket.updateOne({ id: pocket.id }).set({
      checksum: checksumService.signPocket(pocket)
    });
  },

  lockPocket: async function(pocketId) {
    var pocket = await this.getVerifiedPocket(pocketId);

    if (pocket.status === 'locked') {
      throw makeError('POCKET_ALREADY_LOCKED');
    }

    return Pocket.updateOne({ id: pocket.id }).set({
      status: 'locked'
    });
  },

  releasePocket: async function(pocketId) {
    var pocket = await Pocket.findOne({ id: pocketId });

    if (!pocket) {
      throw makeError('POCKET_NOT_FOUND');
    }

    return Pocket.updateOne({ id: pocket.id }).set({
      status: 'active'
    });
  },

  debit: async function(pocketId, amount) {
    assertPositiveAmount(amount);

    var pocket = await this.getVerifiedPocket(pocketId);

    if (pocket.balance < amount) {
      throw makeError('INSUFFICIENT_BALANCE');
    }

    var newBalance = pocket.balance - amount;

    return Pocket.updateOne({ id: pocket.id }).set({
      balance: newBalance,
      checksum: signPatch(pocket, { balance: newBalance })
    });
  },

  credit: async function(pocketId, amount) {
    assertPositiveAmount(amount);

    var pocket = await this.getVerifiedPocket(pocketId);
    var newBalance = pocket.balance + amount;

    return Pocket.updateOne({ id: pocket.id }).set({
      balance: newBalance,
      checksum: signPatch(pocket, { balance: newBalance })
    });
  }
};
