/**
 * TransDefinition.js
 *
 * Configured ledger movement step for a service.
 */
module.exports = {
  tableName: 'transactiondefinition',

  attributes: {
    service: {
      model: 'service',
      required: true
    },

    stepOrder: {
      type: 'number',
      required: true
    },

    stage: {
      type: 'string',
      isIn: ['request', 'confirm', 'verify', 'collection', 'external_payment'],
      defaultsTo: 'verify'
    },

    debitSource: {
      type: 'string',
      required: true
    },

    creditSource: {
      type: 'string',
      required: true
    },

    amountSource: {
      type: 'string',
      required: true
    },

    feeSource: {
      type: 'string',
      allowNull: true
    },

    description: {
      type: 'string',
      allowNull: true
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
