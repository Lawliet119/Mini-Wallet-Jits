/**
 * configSeedService.js
 *
 * Seeds readable transaction configuration for the hard-coded flows.
 */
var services = [{
  code: 'P2P_TRANSFER',
  name: 'Customer Transfer To Customer',
  type: 'p2p',
  authMethod: 'PIN',
  description: 'Customer wallet sends e-money to another customer wallet.',
  metadata: {
    feeAmount: 0,
    flow: ['request', 'confirm', 'verify']
  },
  definitions: [{
    stepOrder: 1,
    stage: 'verify',
    debitSource: 'sender.customerPocket',
    creditSource: 'receiver.customerPocket',
    amountSource: 'TRANSBODY.AMOUNT',
    description: 'Move transfer amount from sender to receiver'
  }],
  fields: [
    field(1, 'SERVICEID', 'constant', 'service.code', 'string', 'SERVICEID', true),
    field(2, 'SENDERID', 'mapping', 'auth.customer.id', 'string', 'SENDERID', true),
    field(3, 'SENDERPOCKETID', 'query', 'sender.customerPocket', 'string', 'SENDERPOCKETID', true),
    field(4, 'RECEIVERPHONE', 'mapping', 'parameters.receiverPhone', 'string', 'RECEIVERPHONE', true, 8, 11, '^([0-9]{8,11})$'),
    field(5, 'RECEIVERID', 'query', 'receiver.customerByPhone', 'string', 'RECEIVERID', true),
    field(6, 'RECEIVERPOCKETID', 'query', 'receiver.customerPocket', 'string', 'RECEIVERPOCKETID', true),
    field(7, 'AMOUNT', 'mapping', 'parameters.amount', 'number', 'AMOUNT', true, 1, 20),
    field(8, 'DEBITFEE', 'computed', 'fee.amount', 'number', 'DEBITFEE', true),
    field(9, 'TOTALAMOUNT', 'computed', 'amount + fee', 'number', 'TOTALAMOUNT', true),
    field(10, 'CURRENCY', 'mapping', 'senderPocket.currency', 'string', 'CURRENCY', true, 3, 3, '^(VND)$'),
    field(11, 'MESSAGE', 'mapping', 'parameters.message', 'string', 'MESSAGE', false, 0, 225)
  ],
  validations: [
    validation(1, 'request', 'validateReceiverExists', 'RECEIVERPHONE', '3003', 'RECEIVER_NOT_FOUND'),
    validation(2, 'request', 'validateReceiverIsNotSender', 'SENDERID:RECEIVERID', '3004', 'CANNOT_TRANSFER_TO_SELF'),
    validation(3, 'request', 'validateAmountPositive', 'AMOUNT', '3001', 'INVALID_AMOUNT'),
    validation(4, 'request', 'validateSenderBalance', 'SENDERPOCKETID:TOTALAMOUNT', '3002', 'INSUFFICIENT_BALANCE'),
    validation(5, 'verify', 'validatePin', 'SENDERID:PIN', '1002', 'INVALID_CREDENTIALS')
  ]
}, {
  code: 'CASH_IN',
  name: 'Officer Cash-In',
  type: 'cash_in',
  authMethod: 'NONE',
  description: 'Officer confirms real-money receipt and moves bank e-money to customer.',
  metadata: {
    feeAmount: 0,
    flow: ['request', 'verify']
  },
  definitions: [{
    stepOrder: 1,
    stage: 'verify',
    debitSource: 'system.bankPocket',
    creditSource: 'receiver.customerPocket',
    amountSource: 'TRANSBODY.AMOUNT',
    description: 'Move cash-in amount from bank pocket to customer'
  }],
  fields: [
    field(1, 'SERVICEID', 'constant', 'service.code', 'string', 'SERVICEID', true),
    field(2, 'OFFICERID', 'mapping', 'auth.officer.id', 'string', 'OFFICERID', true),
    field(3, 'RECEIVERPHONE', 'mapping', 'parameters.customerPhone', 'string', 'RECEIVERPHONE', true, 8, 11, '^([0-9]{8,11})$'),
    field(4, 'RECEIVERID', 'query', 'receiver.customerByPhone', 'string', 'RECEIVERID', true),
    field(5, 'SENDERPOCKETID', 'query', 'system.bankPocket', 'string', 'SENDERPOCKETID', true),
    field(6, 'RECEIVERPOCKETID', 'query', 'receiver.customerPocket', 'string', 'RECEIVERPOCKETID', true),
    field(7, 'AMOUNT', 'mapping', 'parameters.amount', 'number', 'AMOUNT', true, 1, 20),
    field(8, 'TOTALAMOUNT', 'mapping', 'parameters.amount', 'number', 'TOTALAMOUNT', true),
    field(9, 'CURRENCY', 'mapping', 'parameters.currency', 'string', 'CURRENCY', true, 3, 3, '^(VND)$')
  ],
  validations: [
    validation(1, 'request', 'validateOfficerActive', 'OFFICERID', '403', 'FORBIDDEN'),
    validation(2, 'request', 'validateReceiverExists', 'RECEIVERPHONE', '3003', 'RECEIVER_NOT_FOUND'),
    validation(3, 'request', 'validateAmountPositive', 'AMOUNT', '3001', 'INVALID_AMOUNT'),
    validation(4, 'verify', 'validateBankBalance', 'SENDERPOCKETID:AMOUNT', '3002', 'INSUFFICIENT_BALANCE')
  ]
}, {
  code: 'BILL_PAYMENT',
  name: 'Bill Payment',
  type: 'bill_payment',
  authMethod: 'PIN',
  description: 'Customer pays a mock biller after inquiry, then external payment is called after collection.',
  metadata: {
    feeAmount: 1000,
    flow: ['inquiry', 'confirm', 'collection', 'external_payment']
  },
  definitions: [{
    stepOrder: 1,
    stage: 'collection',
    debitSource: 'sender.customerPocket',
    creditSource: 'biller.pocket',
    amountSource: 'TRANSBODY.AMOUNT',
    description: 'Collect bill amount for biller'
  }, {
    stepOrder: 2,
    stage: 'collection',
    debitSource: 'sender.customerPocket',
    creditSource: 'system.feePocket',
    amountSource: 'TRANSBODY.DEBITFEE',
    description: 'Collect bill payment fee'
  }],
  fields: [
    field(1, 'SERVICEID', 'constant', 'service.code', 'string', 'SERVICEID', true),
    field(2, 'SENDERID', 'mapping', 'auth.customer.id', 'string', 'SENDERID', true),
    field(3, 'SENDERPOCKETID', 'query', 'sender.customerPocket', 'string', 'SENDERPOCKETID', true),
    field(4, 'BILLERID', 'mapping', 'parameters.billerId', 'string', 'BILLERID', true),
    field(5, 'BILLERPOCKETID', 'query', 'biller.pocket', 'string', 'BILLERPOCKETID', true),
    field(6, 'SYSTEMPOCKETID', 'query', 'system.feePocket', 'string', 'SYSTEMPOCKETID', true),
    field(7, 'INVOICEID', 'query', 'biller.inquiry.invoiceId', 'string', 'INVOICEID', true),
    field(8, 'BILLCODE', 'mapping', 'parameters.billCode', 'string', 'BILLCODE', true),
    field(9, 'AMOUNT', 'query', 'biller.inquiry.amount', 'number', 'AMOUNT', true, 1, 20),
    field(10, 'DEBITFEE', 'computed', 'fee.amount', 'number', 'DEBITFEE', true),
    field(11, 'TOTALAMOUNT', 'computed', 'amount + fee', 'number', 'TOTALAMOUNT', true),
    field(12, 'CURRENCY', 'query', 'biller.inquiry.currency', 'string', 'CURRENCY', true, 3, 3, '^(VND)$')
  ],
  validations: [
    validation(1, 'request', 'validateBillerExists', 'BILLERID', '5001', 'BILLER_NOT_FOUND'),
    validation(2, 'request', 'validateInvoiceExists', 'BILLERID:BILLCODE', '5002', 'INVOICE_NOT_FOUND'),
    validation(3, 'request', 'validateInvoiceUnpaid', 'INVOICEID', '5003', 'INVOICE_ALREADY_PAID'),
    validation(4, 'request', 'validateSenderBalance', 'SENDERPOCKETID:TOTALAMOUNT', '3002', 'INSUFFICIENT_BALANCE'),
    validation(5, 'verify', 'validatePin', 'SENDERID:PIN', '1002', 'INVALID_CREDENTIALS'),
    validation(6, 'external_payment', 'callPaymentUrl', 'INVOICEID:AMOUNT:TRANSREFID', '3005', 'TRANSFER_FAILED')
  ]
}];

function field(order, name, rule, source, dataType, variable, required, minLength, maxLength, regex) {
  return {
    order: order,
    name: name,
    rule: rule,
    source: source,
    dataType: dataType,
    variable: variable,
    required: required,
    minLength: minLength,
    maxLength: maxLength,
    regex: regex,
    errorCode: null,
    errorMessage: null,
    status: 'active'
  };
}

function validation(ruleOrder, stage, ruleFunction, input, errorCode, errorMessage) {
  return {
    ruleOrder: ruleOrder,
    stage: stage,
    ruleFunction: ruleFunction,
    input: input,
    errorCode: errorCode,
    errorMessage: errorMessage,
    status: 'active'
  };
}

async function upsertService(seed) {
  var service = await ServiceConfig.findOne({ code: seed.code });

  if (service) {
    service = await ServiceConfig.updateOne({ id: service.id }).set({
      name: seed.name,
      version: service.version || 1,
      type: seed.type,
      authMethod: seed.authMethod,
      description: seed.description,
      metadata: seed.metadata,
      status: 'active'
    });
  } else {
    service = await ServiceConfig.create({
      code: seed.code,
      name: seed.name,
      version: 1,
      type: seed.type,
      authMethod: seed.authMethod,
      description: seed.description,
      metadata: seed.metadata,
      status: 'active'
    }).fetch();
  }

  await TransactionDefinition.destroy({ service: service.id });
  await TransactionField.destroy({ service: service.id });
  await TransactionValidation.destroy({ service: service.id });

  await TransactionDefinition.createEach(seed.definitions.map((definition) => {
    return Object.assign({}, definition, {
      service: service.id,
      status: 'active'
    });
  }));
  await TransactionField.createEach(seed.fields.map((serviceField) => {
    return Object.assign({}, serviceField, {
      service: service.id
    });
  }));
  await TransactionValidation.createEach(seed.validations.map((serviceValidation) => {
    return Object.assign({}, serviceValidation, {
      service: service.id
    });
  }));

  return service;
}

module.exports = {
  seedDefaults: async function() {
    var seeded = [];

    for (var index = 0; index < services.length; index++) {
      seeded.push(await upsertService(services[index]));
    }

    return seeded;
  }
};
