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

var assertNonNegativeBalance = function(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw makeError('INVALID_AMOUNT');
  }
};

var makeSnapshot = function(availableBalance, holdBalance) {
  var available = Number(availableBalance || 0);
  var hold = Number(holdBalance || 0);

  assertNonNegativeBalance(available);
  assertNonNegativeBalance(hold);

  return {
    balance: available,
    availableBalance: available,
    holdBalance: hold,
    settledBalance: available + hold
  };
};

var needsSnapshotHydration = function(pocket, snapshot) {
  return Number(pocket.balance) !== snapshot.balance ||
    Number(pocket.availableBalance) !== snapshot.availableBalance ||
    Number(pocket.holdBalance) !== snapshot.holdBalance ||
    Number(pocket.settledBalance) !== snapshot.settledBalance;
};

var signPatch = function(pocket, patch) {
  return checksumService.signPocket(Object.assign({}, pocket, patch));
};

var normalizeVerifiedPocket = function(pocket) {
  if (checksumService.hasLegacySignature(pocket)) {
    return checksumService.normalizeLegacyPocketSnapshot(pocket);
  }

  return checksumService.normalizePocketSnapshot(pocket);
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

    var snapshot = makeSnapshot(options.balance || 0);
    var pocket = await Pocket.create(Object.assign({
      client: client,
      currency: options.currency || 'VND',
      checksum: null
    }, snapshot)).fetch();

    return Pocket.updateOne({ id: pocket.id }).set({
      checksum: checksumService.signPocket(pocket)
    });
  },

  createBillerPocket: async function(currency) {
    var pocket = await Pocket.create(Object.assign({
      client: 'biller',
      currency: currency || 'VND',
      checksum: null
    }, makeSnapshot(0))).fetch();

    return Pocket.updateOne({ id: pocket.id }).set({
      checksum: checksumService.signPocket(pocket)
    });
  },

  createCustomerPocket: async function(customerId, currency) {
    var pocket = await Pocket.create(Object.assign({
      client: 'customer',
      customer: customerId,
      currency: currency || 'VND',
      checksum: null
    }, makeSnapshot(0))).fetch();

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

    var normalizedPocket = normalizeVerifiedPocket(pocket);
    if (needsSnapshotHydration(pocket, normalizedPocket)) {
      return Pocket.updateOne({ id: pocket.id }).set({
        balance: normalizedPocket.balance,
        availableBalance: normalizedPocket.availableBalance,
        holdBalance: normalizedPocket.holdBalance,
        settledBalance: normalizedPocket.settledBalance,
        checksum: checksumService.signPocket(normalizedPocket)
      });
    }

    return normalizedPocket;
  },

  refreshChecksum: async function(pocketId) {
    var pocket = await Pocket.findOne({ id: pocketId });

    if (!pocket) {
      throw makeError('POCKET_NOT_FOUND');
    }

    if (!checksumService.verifyPocket(pocket)) {
      throw makeError('POCKET_CHECKSUM_INVALID');
    }

    var normalizedPocket = normalizeVerifiedPocket(pocket);

    return Pocket.updateOne({ id: pocket.id }).set({
      balance: normalizedPocket.balance,
      availableBalance: normalizedPocket.availableBalance,
      holdBalance: normalizedPocket.holdBalance,
      settledBalance: normalizedPocket.settledBalance,
      checksum: checksumService.signPocket(normalizedPocket)
    });
  },

  setBalanceSnapshot: async function(pocketId, availableBalance, options) {
    var pocket = await this.getVerifiedPocket(pocketId);
    var snapshot = makeSnapshot(availableBalance, (options || {}).holdBalance || 0);
    var patch = Object.assign({}, snapshot);

    if ((options || {}).status) {
      patch.status = options.status;
    }

    patch.checksum = signPatch(pocket, patch);

    return Pocket.updateOne({ id: pocket.id }).set(patch);
  },

  lockPocket: async function(pocketId) {
    var pocket = await this.getVerifiedPocket(pocketId);
    var lockedPocket;

    if (pocket.status === 'locked') {
      throw makeError('POCKET_ALREADY_LOCKED');
    }

    lockedPocket = await Pocket.updateOne({
      id: pocket.id,
      status: 'active'
    }).set({
      status: 'locked'
    });

    if (!lockedPocket) {
      throw makeError('POCKET_ALREADY_LOCKED');
    }

    return lockedPocket;
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

    if (pocket.availableBalance < amount) {
      throw makeError('INSUFFICIENT_BALANCE');
    }

    var nextAvailableBalance = pocket.availableBalance - amount;
    var nextSettledBalance = pocket.settledBalance - amount;
    var snapshot = {
      balance: nextAvailableBalance,
      availableBalance: nextAvailableBalance,
      settledBalance: nextSettledBalance
    };

    return Pocket.updateOne({ id: pocket.id }).set(Object.assign({}, snapshot, {
      checksum: signPatch(pocket, snapshot)
    }));
  },

  credit: async function(pocketId, amount) {
    assertPositiveAmount(amount);

    var pocket = await this.getVerifiedPocket(pocketId);
    var nextAvailableBalance = pocket.availableBalance + amount;
    var nextSettledBalance = pocket.settledBalance + amount;
    var snapshot = {
      balance: nextAvailableBalance,
      availableBalance: nextAvailableBalance,
      settledBalance: nextSettledBalance
    };

    return Pocket.updateOne({ id: pocket.id }).set(Object.assign({}, snapshot, {
      checksum: signPatch(pocket, snapshot)
    }));
  }
};
