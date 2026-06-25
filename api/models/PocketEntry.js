/**
 * PocketEntry.js
 *
 * Immutable ledger line for one debit/credit movement between two pockets.
 */
module.exports = {
  attributes: {
    transRefId: {
      type: 'string',
      required: true
    },

    stepOrder: {
      type: 'number',
      required: true
    },

    debitPocket: {
      model: 'pocket',
      required: true
    },

    creditPocket: {
      model: 'pocket',
      required: true
    },

    amount: {
      type: 'number',
      required: true
    },

    currency: {
      type: 'string',
      defaultsTo: 'VND'
    },

    description: {
      type: 'string',
      allowNull: true
    },

    status: {
      type: 'string',
      isIn: ['settled', 'reversed'],
      defaultsTo: 'settled'
    }
  }
};
