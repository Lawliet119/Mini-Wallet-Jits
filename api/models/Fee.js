/**
 * Fee.js
 *
 * Fee configuration for a transaction service.
 */
module.exports = {
  attributes: {
    service: {
      model: 'service',
      required: true
    },

    feeType: {
      type: 'string',
      isIn: ['none', 'flat'],
      defaultsTo: 'none'
    },

    amount: {
      type: 'number',
      defaultsTo: 0
    },

    currency: {
      type: 'string',
      defaultsTo: 'VND'
    },

    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active'
    },

    metadata: {
      type: 'json'
    }
  }
};
