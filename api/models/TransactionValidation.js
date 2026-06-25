/**
 * TransactionValidation.js
 *
 * Ordered business validations for a service.
 */
module.exports = {
  attributes: {
    service: {
      model: 'serviceconfig',
      required: true
    },

    ruleOrder: {
      type: 'number',
      required: true
    },

    stage: {
      type: 'string',
      isIn: ['request', 'confirm', 'verify', 'collection', 'external_payment'],
      defaultsTo: 'request'
    },

    ruleFunction: {
      type: 'string',
      required: true
    },

    input: {
      type: 'string',
      allowNull: true
    },

    errorCode: {
      type: 'string',
      allowNull: true
    },

    errorMessage: {
      type: 'string',
      allowNull: true
    },

    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active'
    }
  }
};
