/**
 * transactionEngineService.js
 *
 * Generic transaction engine. Business WHAT lives in ServiceConfig,
 * TransactionField, TransactionValidation, and TransactionDefinition.
 */
var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

var byOrder = function(left, right) {
  return Number(left.order || left.ruleOrder || left.stepOrder || 0) -
    Number(right.order || right.ruleOrder || right.stepOrder || 0);
};

var getPath = function(source, context) {
  var parts = String(source || '').split('.');
  var current = context;

  for (var index = 0; index < parts.length; index++) {
    if (current === undefined || current === null) {
      return undefined;
    }

    current = current[parts[index]];
  }

  return current;
};

var toInteger = function(value) {
  var amount = Number(value);

  if (!Number.isSafeInteger(amount)) {
    throw makeError('INVALID_AMOUNT');
  }

  return amount;
};

var normalizeValue = function(value, dataType) {
  if (value === undefined || value === null) {
    return value;
  }

  if (dataType === 'number') {
    return toInteger(value);
  }

  if (dataType === 'boolean') {
    return Boolean(value);
  }

  return String(value);
};

var assertFieldShape = function(field, value) {
  if (field.required && (value === undefined || value === null || value === '')) {
    throw makeError(field.errorMessage || 'BAD_REQUEST');
  }

  if (value === undefined || value === null || value === '') {
    return;
  }

  if (field.dataType === 'number') {
    if (!Number.isSafeInteger(Number(value))) {
      throw makeError(field.errorMessage || 'INVALID_AMOUNT');
    }

    if (field.minLength && Number(value) < Number(field.minLength)) {
      throw makeError(field.errorMessage || 'INVALID_AMOUNT');
    }

    return;
  }

  var textValue = String(value);

  if (field.minLength && textValue.length < Number(field.minLength)) {
    throw makeError(field.errorMessage || 'BAD_REQUEST');
  }

  if (field.maxLength && textValue.length > Number(field.maxLength)) {
    throw makeError(field.errorMessage || 'BAD_REQUEST');
  }

  if (field.regex && !(new RegExp(field.regex).test(textValue))) {
    throw makeError(field.errorMessage || 'BAD_REQUEST');
  }
};

var getTransBody = function(trail) {
  var outputMessage = trail.outputMessage || {};
  return outputMessage.TRANSBODY || {};
};

var getCustomerPocket = async function(customerId) {
  var pocket = await Pocket.findOne({
    customer: customerId,
    client: 'customer'
  });

  if (!pocket) {
    throw makeError('POCKET_NOT_FOUND');
  }

  return pocketService.getVerifiedPocket(pocket.id);
};

var getCurrency = function(context) {
  return context.transBody.CURRENCY ||
    context.parameters.currency ||
    (context.senderPocket && context.senderPocket.currency) ||
    sails.config.custom.seedCurrency ||
    'VND';
};

var ensureBiller = async function(context) {
  if (context.biller) {
    return context.biller;
  }

  var billerId = context.transBody.BILLERID || context.parameters.billerId;
  var biller = await Biller.findOne({
    id: billerId,
    status: 'active'
  }).populate('pocket');

  if (!biller) {
    throw makeError('BILLER_NOT_FOUND');
  }

  context.biller = biller;
  return biller;
};

var ensureInquiry = async function(context) {
  if (context.inquiry) {
    return context.inquiry;
  }

  var inquiry = await mockBillerService.inquiry({
    billerId: context.transBody.BILLERID || context.parameters.billerId,
    billCode: context.transBody.BILLCODE || context.parameters.billCode
  });

  context.inquiry = inquiry;
  context.biller = inquiry.biller;
  context.invoice = inquiry.invoice;
  return inquiry;
};

var resolveMapping = function(source, context) {
  if (source === 'parameters.currency' && !context.parameters.currency) {
    return sails.config.custom.seedCurrency || 'VND';
  }

  return getPath(source, context);
};

var resolveComputed = function(source, context) {
  if (source === 'fee.amount') {
    return Number((context.service.metadata || {}).feeAmount || 0);
  }

  if (source === 'amount + fee') {
    return Number(context.transBody.AMOUNT || 0) + Number(context.transBody.DEBITFEE || 0);
  }

  throw makeError('BAD_REQUEST');
};

var resolveQuery = async function(source, context) {
  if (source === 'sender.customerPocket') {
    context.senderPocket = await getCustomerPocket(context.actor.user.id);
    return context.senderPocket.id;
  }

  if (source === 'receiver.customerByPhone') {
    var receiverPhone = context.transBody.RECEIVERPHONE ||
      context.parameters.receiverPhone ||
      context.parameters.customerPhone;
    var receiver = await Customer.findOne({ phone: String(receiverPhone || '').trim() });

    if (!receiver) {
      throw makeError('RECEIVER_NOT_FOUND');
    }

    context.receiver = receiver;
    return receiver.id;
  }

  if (source === 'receiver.customerPocket') {
    if (!context.receiver) {
      await resolveQuery('receiver.customerByPhone', context);
    }

    context.receiverPocket = await getCustomerPocket(context.receiver.id);
    return context.receiverPocket.id;
  }

  if (source === 'system.bankPocket') {
    context.bankPocket = await pocketService.createInternalPocket('bank', {
      currency: getCurrency(context),
      balance: 1000000000
    });
    return context.bankPocket.id;
  }

  if (source === 'system.feePocket') {
    context.systemPocket = await pocketService.createInternalPocket('system', {
      currency: getCurrency(context),
      balance: 0
    });
    return context.systemPocket.id;
  }

  if (source === 'biller.pocket') {
    var biller = await ensureBiller(context);
    context.billerPocket = await pocketService.getVerifiedPocket(biller.pocket.id || biller.pocket);
    return context.billerPocket.id;
  }

  if (source === 'biller.inquiry.invoiceId') {
    return (await ensureInquiry(context)).invoice.id;
  }

  if (source === 'biller.inquiry.amount') {
    return (await ensureInquiry(context)).amount;
  }

  if (source === 'biller.inquiry.currency') {
    return (await ensureInquiry(context)).currency;
  }

  throw makeError('BAD_REQUEST');
};

var resolveFieldValue = async function(field, context) {
  if (field.rule === 'constant') {
    if (field.source === 'service.code') {
      return context.service.code;
    }

    return field.source;
  }

  if (field.rule === 'mapping') {
    return resolveMapping(field.source, context);
  }

  if (field.rule === 'computed') {
    return resolveComputed(field.source, context);
  }

  if (field.rule === 'query') {
    return resolveQuery(field.source, context);
  }

  throw makeError('BAD_REQUEST');
};

var buildTransBody = async function(context) {
  var fields = context.fields.sort(byOrder);

  for (var index = 0; index < fields.length; index++) {
    var field = fields[index];
    var rawValue = await resolveFieldValue(field, context);
    var value = normalizeValue(rawValue, field.dataType);

    assertFieldShape(field, value);
    context.transBody[field.name] = value;
  }

  return context.transBody;
};

var validationValues = function(validation, context) {
  return String(validation.input || '').split(':').map((name) => {
    if (name === 'PIN') {
      return context.parameters.pin;
    }

    if (name === 'TRANSREFID') {
      return context.transBody.TRANSREFID;
    }

    return context.transBody[name];
  });
};

var validationHandlers = {
  validateReceiverExists: async function(values, context) {
    if (context.receiver) {
      return;
    }

    await resolveQuery('receiver.customerByPhone', context);
  },

  validateReceiverIsNotSender: async function(values) {
    if (String(values[0]) === String(values[1])) {
      throw makeError('CANNOT_TRANSFER_TO_SELF');
    }
  },

  validateAmountPositive: async function(values) {
    if (!Number.isSafeInteger(Number(values[0])) || Number(values[0]) <= 0) {
      throw makeError('INVALID_AMOUNT');
    }
  },

  validateSenderBalance: async function(values) {
    var pocket = await pocketService.getVerifiedPocket(values[0]);
    if (Number(pocket.balance) < Number(values[1])) {
      throw makeError('INSUFFICIENT_BALANCE');
    }
  },

  validatePin: async function(values) {
    var customer = await Customer.findOne({ id: values[0] });
    if (!customer || !(await pinService.verify(values[1], customer.pinHash))) {
      throw makeError('INVALID_CREDENTIALS');
    }
  },

  validateOfficerActive: async function(values) {
    var officer = await Officer.findOne({
      id: values[0],
      status: 'active'
    });
    if (!officer) {
      throw makeError('FORBIDDEN');
    }
  },

  validateBankBalance: async function(values) {
    return validationHandlers.validateSenderBalance(values);
  },

  validateBillerExists: async function(values, context) {
    await ensureBiller(context);
  },

  validateInvoiceExists: async function(values, context) {
    await ensureInquiry(context);
  },

  validateInvoiceUnpaid: async function(values) {
    var invoice = await MockInvoice.findOne({ id: values[0] });
    if (!invoice) {
      throw makeError('INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'paid') {
      throw makeError('INVOICE_ALREADY_PAID');
    }
  },

  callPaymentUrl: async function(values, context) {
    context.payment = await mockBillerService.payment({
      invoiceId: values[0],
      amount: Number(values[1]),
      transRefId: values[2]
    });
  }
};

var runValidations = async function(stage, context) {
  var validations = context.validations.filter((validation) => {
    return validation.stage === stage && validation.status === 'active';
  }).sort(byOrder);

  for (var index = 0; index < validations.length; index++) {
    var validation = validations[index];
    var handler = validationHandlers[validation.ruleFunction];

    if (!handler) {
      throw makeError('BAD_REQUEST');
    }

    try {
      await handler(validationValues(validation, context), context);
    } catch (err) {
      throw makeError(err.code || validation.errorMessage || 'TRANSFER_FAILED');
    }
  }
};

var loadServiceContext = async function(serviceCode, actor, parameters) {
  var service = await ServiceConfig.findOne({
    code: serviceCode,
    status: 'active'
  });

  if (!service) {
    throw makeError('BAD_REQUEST');
  }

  return {
    service: service,
    fields: await TransactionField.find({
      service: service.id,
      status: 'active'
    }).sort('order ASC'),
    validations: await TransactionValidation.find({
      service: service.id,
      status: 'active'
    }).sort('ruleOrder ASC'),
    definitions: await TransactionDefinition.find({
      service: service.id,
      status: 'active'
    }).sort('stepOrder ASC'),
    actor: actor,
    auth: {
      customer: actor.role === 'customer' ? actor.user : {},
      officer: actor.role === 'officer' ? actor.user : {}
    },
    parameters: parameters || {},
    transBody: {}
  };
};

var assertActorCanRequest = function(context) {
  var expectedRole = (context.service.metadata || {}).actorRole || 'customer';

  if (context.actor.role !== expectedRole) {
    throw makeError('FORBIDDEN');
  }
};

var assertActorCanUseTrail = function(trail, service, actor) {
  var expectedRole = (service.metadata || {}).actorRole || 'customer';
  var transBody = getTransBody(trail);

  if (actor.role !== expectedRole) {
    throw makeError('FORBIDDEN');
  }

  if (expectedRole === 'officer') {
    if (transBody.OFFICERID && String(transBody.OFFICERID) !== String(actor.user.id)) {
      throw makeError('FORBIDDEN');
    }
    return;
  }

  if (String(trail.sender) !== String(actor.user.id)) {
    throw makeError('FORBIDDEN');
  }
};

var findServiceFromTrail = async function(trail) {
  var service = await ServiceConfig.findOne({
    code: trail.service,
    status: 'active'
  });

  if (!service) {
    throw makeError('BAD_REQUEST');
  }

  return service;
};

var sourceToPocketId = function(source, transBody) {
  var sourceMap = {
    'sender.customerPocket': 'SENDERPOCKETID',
    'receiver.customerPocket': 'RECEIVERPOCKETID',
    'system.bankPocket': 'SENDERPOCKETID',
    'system.feePocket': 'SYSTEMPOCKETID',
    'biller.pocket': 'BILLERPOCKETID'
  };
  var fieldName = sourceMap[source] || source;

  return transBody[fieldName];
};

var sourceToAmount = function(source, transBody) {
  if (String(source || '').indexOf('TRANSBODY.') === 0) {
    return Number(transBody[String(source).replace('TRANSBODY.', '')] || 0);
  }

  return Number(transBody[source] || 0);
};

var buildLedgerSteps = function(definitions, transBody) {
  return definitions.sort(byOrder).map((definition) => {
    return {
      stepOrder: definition.stepOrder,
      debitPocket: sourceToPocketId(definition.debitSource, transBody),
      creditPocket: sourceToPocketId(definition.creditSource, transBody),
      amount: sourceToAmount(definition.amountSource, transBody),
      description: definition.description
    };
  }).filter((step) => {
    return Number(step.amount) > 0;
  });
};

var lockDebitPockets = async function(steps) {
  var locked = [];

  for (var index = 0; index < steps.length; index++) {
    var pocketId = String(steps[index].debitPocket);
    if (locked.indexOf(pocketId) === -1) {
      await pocketService.lockPocket(pocketId);
      locked.push(pocketId);
    }
  }

  return locked;
};

var releasePockets = async function(pocketIds) {
  for (var index = 0; index < pocketIds.length; index++) {
    var pocket = await Pocket.findOne({ id: pocketIds[index] });
    if (pocket && pocket.status === 'locked') {
      await pocketService.releasePocket(pocketIds[index]);
    }
  }
};

var compactCustomer = function(customer) {
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    phone: customer.phone
  };
};

var compactBiller = function(biller) {
  if (!biller) {
    return null;
  }

  return {
    id: biller.id,
    code: biller.code,
    name: biller.name
  };
};

var makePreview = function(context, trail) {
  var invoice = context.invoice;

  return {
    transRefId: String(trail.id),
    serviceCode: context.service.code,
    serviceName: context.service.name,
    type: context.service.type,
    authMethod: context.service.authMethod,
    amount: Number(context.transBody.AMOUNT || 0),
    fee: Number(context.transBody.DEBITFEE || 0),
    totalAmount: Number(context.transBody.TOTALAMOUNT || context.transBody.AMOUNT || 0),
    currency: context.transBody.CURRENCY || 'VND',
    receiver: compactCustomer(context.receiver),
    biller: compactBiller(context.biller),
    invoice: invoice ? {
      id: invoice.id,
      billCode: invoice.billCode,
      customerName: invoice.customerName,
      amount: invoice.amount,
      currency: invoice.currency
    } : null
  };
};

module.exports = {
  request: async function(options) {
    var actor = options.actor;
    var parameters = options.parameters || {};
    var serviceCode = String(parameters.serviceCode || options.serviceCode || '').trim();
    var context = await loadServiceContext(serviceCode, actor, parameters);

    assertActorCanRequest(context);
    await buildTransBody(context);
    await runValidations('request', context);

    var trail = await trailService.init({
      service: context.service.code,
      type: context.service.type,
      sender: context.transBody.SENDERID || null,
      receiver: context.transBody.RECEIVERID || null,
      biller: context.transBody.BILLERID || null,
      inputMessage: parameters,
      outputMessage: {
        TRANSBODY: context.transBody
      },
      log: {
        action: context.service.code + ' request initialized',
        configVersion: context.service.version
      }
    });

    context.transBody = getTransBody(trail);
    var pendingTrail = await trailService.markPending(trail.id, {
      serviceCode: context.service.code,
      amount: context.transBody.AMOUNT,
      fee: context.transBody.DEBITFEE || 0,
      totalAmount: context.transBody.TOTALAMOUNT,
      authMethod: context.service.authMethod
    });

    return makePreview(context, pendingTrail);
  },

  confirm: async function(options) {
    var trail = await trailService.findPending(options.transRefId);
    var service = await findServiceFromTrail(trail);

    assertActorCanUseTrail(trail, service, options.actor);
    await trailService.appendStep(trail.id, 'CONFIRM_DONE', {
      serviceCode: service.code,
      authMethod: service.authMethod
    });

    return {
      transRefId: String(trail.id),
      serviceCode: service.code,
      authMethod: service.authMethod
    };
  },

  verify: async function(options) {
    var trail = await trailService.findPending(options.transRefId);
    var service = await findServiceFromTrail(trail);
    var context = await loadServiceContext(service.code, options.actor, {
      pin: options.pin
    });
    var transBody = getTransBody(trail);
    var steps;
    var lockedPocketIds = [];
    var ledger;

    context.transBody = transBody;
    assertActorCanUseTrail(trail, service, options.actor);
    await runValidations('verify', context);

    steps = buildLedgerSteps(context.definitions, transBody);
    lockedPocketIds = await lockDebitPockets(steps);

    try {
      await runValidations('external_payment', context);

      ledger = await ledgerService.execute({
        trail: trail,
        service: service.code,
        type: service.type,
        sender: trail.sender || null,
        receiver: trail.receiver || null,
        biller: trail.biller || transBody.BILLERID || null,
        amount: Number(transBody.AMOUNT),
        fee: Number(transBody.DEBITFEE || 0),
        totalAmount: Number(transBody.TOTALAMOUNT || transBody.AMOUNT),
        currency: transBody.CURRENCY || 'VND',
        status: 'done',
        trailStatus: 'done',
        logStep: context.payment ? 'PAYMENT_AND_LEDGER_DONE' : 'VERIFY_DONE',
        metadata: {
          message: transBody.MESSAGE || null,
          invoiceId: transBody.INVOICEID || null,
          billCode: transBody.BILLCODE || null,
          billerRefId: context.payment ? context.payment.billerRefId : null,
          officerId: transBody.OFFICERID || null,
          configVersion: service.version
        },
        steps: steps
      });

      return {
        transRefId: String(trail.id),
        serviceCode: service.code,
        transaction: Object.assign({}, ledger.transaction, {
          billerRefId: context.payment ? context.payment.billerRefId : undefined
        }),
        balances: ledger.pocketBalances,
        pocketEntryIds: ledger.pocketEntryIds
      };
    } catch (err) {
      await trailService.markFailed(trail.id, err.code || 'TRANSFER_FAILED', err.message, {
        stage: context.payment ? 'EXTERNAL_OR_LEDGER' : 'VERIFY'
      });
      throw err;
    } finally {
      await releasePockets(lockedPocketIds);
    }
  }
};
