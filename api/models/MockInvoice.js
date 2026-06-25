/**
 * MockInvoice.js
 *
 * Local invoice table used by the mock biller integration.
 */
module.exports = {
  attributes: {
    biller: {
      model: 'biller',
      required: true
    },

    billCode: {
      type: 'string',
      required: true
    },

    customerName: {
      type: 'string',
      allowNull: true
    },

    amount: {
      type: 'number',
      required: true
    },

    currency: {
      type: 'string',
      defaultsTo: 'VND'
    },

    status: {
      type: 'string',
      isIn: ['unpaid', 'paid'],
      defaultsTo: 'unpaid'
    },

    paidTransRefId: {
      type: 'string',
      allowNull: true
    },

    paidAt: {
      type: 'number',
      allowNull: true
    }
  }
};
