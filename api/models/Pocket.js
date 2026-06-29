/**
 * Pocket.js
 *
 * Wallet balance for a customer, biller, system, or bank owner.
 */
module.exports = {
  attributes: {
    client: {
      type: 'string',
      isIn: ['customer', 'biller', 'system', 'bank'],
      required: true
    },

    customer: {
      model: 'customer'
    },

    currency: {
      type: 'string',
      defaultsTo: 'VND'
    },

    balance: {
      type: 'number',
      defaultsTo: 0
    },

    availableBalance: {
      type: 'number',
      defaultsTo: 0
    },

    holdBalance: {
      type: 'number',
      defaultsTo: 0
    },

    settledBalance: {
      type: 'number',
      defaultsTo: 0
    },

    checksum: {
      type: 'string',
      allowNull: true
    },

    status: {
      type: 'string',
      isIn: ['active', 'locked'],
      defaultsTo: 'active'
    },

    debitEntries: {
      collection: 'pocketentry',
      via: 'debitPocket'
    },

    creditEntries: {
      collection: 'pocketentry',
      via: 'creditPocket'
    }
  }
};
