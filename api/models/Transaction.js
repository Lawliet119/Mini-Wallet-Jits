/**
 * Transaction.js
 *
 * Final receipt after money movement has been executed.
 */
module.exports = {
  attributes: {
    code: {
      type: 'string',
      required: true,
      unique: true
    },

    transRefId: {
      type: 'string',
      required: true
    },

    trail: {
      model: 'transactiontrail'
    },

    service: {
      type: 'string',
      allowNull: true
    },

    type: {
      type: 'string',
      defaultsTo: 'p2p'
    },

    sender: {
      model: 'customer'
    },

    receiver: {
      model: 'customer'
    },

    amount: {
      type: 'number',
      required: true
    },

    fee: {
      type: 'number',
      defaultsTo: 0
    },

    totalAmount: {
      type: 'number',
      required: true
    },

    currency: {
      type: 'string',
      defaultsTo: 'VND'
    },

    status: {
      type: 'string',
      isIn: ['done', 'failed', 'external_pending', 'external_failed', 'refunded'],
      defaultsTo: 'done'
    },

    metadata: {
      type: 'json'
    }
  }
};
