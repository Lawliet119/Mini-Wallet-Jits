/**
 * TransactionTrail.js
 *
 * Runtime record for a transaction across request/confirm/verify steps.
 */
module.exports = {
  attributes: {
    service: {
      type: 'string',
      allowNull: true
    },

    transCode: {
      type: 'string',
      allowNull: true
    },

    type: {
      type: 'string',
      defaultsTo: 'normal'
    },

    status: {
      type: 'string',
      isIn: ['init', 'pending', 'done', 'failed', 'external_pending', 'external_failed', 'refunded'],
      defaultsTo: 'init'
    },

    sender: {
      model: 'customer'
    },

    receiver: {
      model: 'customer'
    },

    biller: {
      model: 'biller'
    },

    inputMessage: {
      type: 'json'
    },

    outputMessage: {
      type: 'json'
    },

    transStepLog: {
      type: 'json',
      defaultsTo: []
    },

    errorCode: {
      type: 'string',
      allowNull: true
    },

    errorMessage: {
      type: 'string',
      allowNull: true
    },

    transaction: {
      collection: 'transaction',
      via: 'trail'
    }
  }
};
