/**
 * billPaymentService.js
 *
 * Hard-coded bill payment flow with mock inquiry and payment.
 */
var SERVICE_CODE = 'BILL_PAYMENT';
var FEE_AMOUNT = 1000;

var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
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

var ensureTrailOwner = function(trail, customerId) {
  if (String(trail.sender) !== String(customerId)) {
    throw makeError('FORBIDDEN');
  }
};

var mapOutput = function(trail) {
  var outputMessage = trail.outputMessage || {};
  return outputMessage.TRANSBODY || {};
};

module.exports = {
  request: async function(options) {
    var billCode = String(options.billCode || '').trim();
    var senderPocket = await getCustomerPocket(options.customerId);
    var inquiry = await mockBillerService.inquiry({
      billerId: options.billerId,
      billCode: billCode
    });
    var systemPocket = await pocketService.createInternalPocket('system', {
      currency: inquiry.currency,
      balance: 0
    });
    var billerPocket = await pocketService.getVerifiedPocket(inquiry.biller.pocket.id);
    var totalAmount = inquiry.amount + FEE_AMOUNT;

    if (senderPocket.balance < totalAmount) {
      throw makeError('INSUFFICIENT_BALANCE');
    }

    var trail = await trailService.init({
      service: SERVICE_CODE,
      type: 'bill_payment',
      sender: options.customerId,
      biller: inquiry.biller.id,
      inputMessage: {
        billerId: inquiry.biller.id,
        billCode: billCode
      },
      outputMessage: {
        TRANSBODY: {
          SERVICEID: SERVICE_CODE,
          SENDERID: options.customerId,
          SENDERPOCKETID: senderPocket.id,
          BILLERID: inquiry.biller.id,
          BILLERPOCKETID: billerPocket.id,
          SYSTEMPOCKETID: systemPocket.id,
          INVOICEID: inquiry.invoice.id,
          BILLCODE: inquiry.invoice.billCode,
          AMOUNT: inquiry.amount,
          DEBITFEE: FEE_AMOUNT,
          TOTALAMOUNT: totalAmount,
          CURRENCY: inquiry.currency,
          AUTHMETHOD: 'PIN'
        }
      },
      log: {
        action: 'Bill inquiry completed'
      }
    });

    var pendingTrail = await trailService.markPending(trail.id, {
      billCode: billCode,
      amount: inquiry.amount,
      fee: FEE_AMOUNT,
      totalAmount: totalAmount
    });

    return {
      transRefId: String(pendingTrail.id),
      biller: {
        id: inquiry.biller.id,
        code: inquiry.biller.code,
        name: inquiry.biller.name
      },
      invoice: {
        id: inquiry.invoice.id,
        billCode: inquiry.invoice.billCode,
        customerName: inquiry.invoice.customerName,
        amount: inquiry.amount,
        currency: inquiry.currency
      },
      fee: FEE_AMOUNT,
      totalAmount: totalAmount
    };
  },

  confirm: async function(options) {
    var trail = await trailService.findPending(options.transRefId);
    ensureTrailOwner(trail, options.customerId);

    await trailService.appendStep(trail.id, 'CONFIRM_DONE', {
      authMethod: 'PIN'
    });

    return {
      transRefId: String(trail.id),
      authMethod: 'PIN'
    };
  },

  verify: async function(options) {
    var trail = await trailService.findPending(options.transRefId);
    ensureTrailOwner(trail, options.customerId);

    var transBody = mapOutput(trail);
    var sender = await Customer.findOne({ id: options.customerId });

    if (!sender || !(await pinService.verify(options.pin, sender.pinHash))) {
      throw makeError('INVALID_CREDENTIALS');
    }

    await pocketService.lockPocket(transBody.SENDERPOCKETID);

    try {
      var amount = Number(transBody.AMOUNT);
      var fee = Number(transBody.DEBITFEE || 0);
      var totalAmount = Number(transBody.TOTALAMOUNT || amount + fee);
      var ledgerSteps = [{
        stepOrder: 1,
        debitPocket: transBody.SENDERPOCKETID,
        creditPocket: transBody.BILLERPOCKETID,
        amount: amount,
        description: 'Bill amount collection'
      }];

      if (fee > 0) {
        ledgerSteps.push({
          stepOrder: 2,
          debitPocket: transBody.SENDERPOCKETID,
          creditPocket: transBody.SYSTEMPOCKETID,
          amount: fee,
          description: 'Bill payment fee'
        });
      }

      var ledger = await ledgerService.execute({
        trail: trail,
        service: SERVICE_CODE,
        type: 'bill_payment',
        sender: trail.sender,
        biller: transBody.BILLERID,
        amount: amount,
        fee: fee,
        totalAmount: totalAmount,
        currency: transBody.CURRENCY,
        status: 'external_pending',
        trailStatus: 'external_pending',
        logStep: 'COLLECTION_DONE',
        metadata: {
          invoiceId: transBody.INVOICEID,
          billCode: transBody.BILLCODE
        },
        steps: ledgerSteps
      });
      var result = {
        transactionId: ledger.transaction.id,
        transactionCode: ledger.transaction.code,
        senderBalance: ledger.pocketBalances[String(transBody.SENDERPOCKETID)],
        billerBalance: ledger.pocketBalances[String(transBody.BILLERPOCKETID)],
        systemBalance: ledger.pocketBalances[String(transBody.SYSTEMPOCKETID)]
      };

      await pocketService.releasePocket(transBody.SENDERPOCKETID);

      var payment = await mockBillerService.payment({
        invoiceId: transBody.INVOICEID,
        amount: Number(transBody.AMOUNT),
        transRefId: trail.id
      });

      await Transaction.updateOne({ id: result.transactionId }).set({
        status: 'done',
        metadata: Object.assign({}, (await Transaction.findOne({ id: result.transactionId })).metadata || {}, {
          billerRefId: payment.billerRefId
        })
      });
      await TransactionTrail.updateOne({ id: trail.id }).set({
        status: 'done'
      });
      await trailService.appendStep(trail.id, 'PAYMENT_DONE', {
        billerRefId: payment.billerRefId,
        idempotent: payment.idempotent
      });

      return {
        transRefId: String(trail.id),
        transaction: {
          id: result.transactionId,
          code: result.transactionCode,
          status: 'done',
          amount: Number(transBody.AMOUNT),
          fee: Number(transBody.DEBITFEE || 0),
          totalAmount: Number(transBody.TOTALAMOUNT),
          currency: transBody.CURRENCY,
          billerRefId: payment.billerRefId
        },
        senderBalance: result.senderBalance
      };
    } catch (err) {
      await Transaction.updateOne({ transRefId: String(trail.id) }).set({
        status: 'external_failed'
      });
      await TransactionTrail.updateOne({ id: trail.id }).set({
        status: 'external_failed'
      });
      await trailService.appendStep(trail.id, 'PAYMENT_FAILED', {
        code: err.code || 'TRANSFER_FAILED',
        message: err.message
      });
      throw err;
    } finally {
      var senderPocket = await Pocket.findOne({ id: transBody.SENDERPOCKETID });
      if (senderPocket && senderPocket.status === 'locked') {
        await pocketService.releasePocket(transBody.SENDERPOCKETID);
      }
    }
  }
};
