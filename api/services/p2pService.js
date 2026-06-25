/**
 * p2pService.js
 *
 * Hard-coded three-step P2P transfer flow before the config-driven engine.
 */
var SERVICE_CODE = 'P2P_TRANSFER';
var FEE_AMOUNT = 0;

var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

var assertAmount = function(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw makeError('INVALID_AMOUNT');
  }
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
    var senderId = options.senderId;
    var receiverPhone = String(options.receiverPhone || '').trim();
    var amount = Number(options.amount);
    var message = options.message || null;

    assertAmount(amount);

    if (!receiverPhone) {
      throw makeError('BAD_REQUEST');
    }

    var receiver = await Customer.findOne({ phone: receiverPhone });
    if (!receiver) {
      throw makeError('RECEIVER_NOT_FOUND');
    }

    if (String(receiver.id) === String(senderId)) {
      throw makeError('CANNOT_TRANSFER_TO_SELF');
    }

    var senderPocket = await getCustomerPocket(senderId);
    var receiverPocket = await getCustomerPocket(receiver.id);
    var totalAmount = amount + FEE_AMOUNT;

    if (senderPocket.balance < totalAmount) {
      throw makeError('INSUFFICIENT_BALANCE');
    }

    var trail = await trailService.init({
      service: SERVICE_CODE,
      type: 'normal',
      sender: senderId,
      receiver: receiver.id,
      inputMessage: {
        receiverPhone: receiverPhone,
        amount: amount,
        message: message
      },
      outputMessage: {
        TRANSBODY: {
          SERVICEID: SERVICE_CODE,
          SENDERID: senderId,
          SENDERPOCKETID: senderPocket.id,
          RECEIVERID: receiver.id,
          RECEIVERPHONE: receiver.phone,
          RECEIVERPOCKETID: receiverPocket.id,
          AMOUNT: amount,
          DEBITFEE: FEE_AMOUNT,
          TOTALAMOUNT: totalAmount,
          CURRENCY: senderPocket.currency,
          MESSAGE: message
        }
      },
      log: {
        action: 'P2P request initialized'
      }
    });

    var pendingTrail = await trailService.markPending(trail.id, {
      amount: amount,
      fee: FEE_AMOUNT,
      totalAmount: totalAmount
    });
    var transBody = mapOutput(pendingTrail);

    return {
      transRefId: String(pendingTrail.id),
      amount: transBody.AMOUNT,
      fee: transBody.DEBITFEE,
      totalAmount: transBody.TOTALAMOUNT,
      currency: transBody.CURRENCY,
      receiver: {
        id: receiver.id,
        phone: receiver.phone
      }
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
    var senderPocketId = transBody.SENDERPOCKETID;
    var receiverPocketId = transBody.RECEIVERPOCKETID;
    var amount = Number(transBody.AMOUNT);
    var fee = Number(transBody.DEBITFEE || 0);
    var totalAmount = Number(transBody.TOTALAMOUNT || amount + fee);
    var sender = await Customer.findOne({ id: options.customerId });

    if (!sender || !(await pinService.verify(options.pin, sender.pinHash))) {
      throw makeError('INVALID_CREDENTIALS');
    }

    await pocketService.getVerifiedPocket(receiverPocketId);
    await pocketService.lockPocket(senderPocketId);

    try {
      var ledger = await ledgerService.execute({
        trail: trail,
        service: SERVICE_CODE,
        type: 'p2p',
        sender: trail.sender,
        receiver: trail.receiver,
        amount: amount,
        fee: fee,
        totalAmount: totalAmount,
        currency: transBody.CURRENCY,
        status: 'done',
        trailStatus: 'done',
        logStep: 'VERIFY_DONE',
        metadata: {
          message: transBody.MESSAGE || null
        },
        steps: [{
          stepOrder: 1,
          debitPocket: senderPocketId,
          creditPocket: receiverPocketId,
          amount: amount,
          description: 'P2P transfer'
        }]
      });

      return {
        transaction: ledger.transaction,
        senderBalance: ledger.pocketBalances[String(senderPocketId)],
        receiverBalance: ledger.pocketBalances[String(receiverPocketId)]
      };
    } catch (err) {
      await trailService.markFailed(trail.id, err.code || 'TRANSFER_FAILED', err.message, {
        stage: 'VERIFY'
      });
      throw err;
    } finally {
      await pocketService.releasePocket(senderPocketId);
    }
  }
};
