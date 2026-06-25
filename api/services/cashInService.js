/**
 * cashInService.js
 *
 * Hard-coded Officer cash-in flow: Bank pocket -> Customer pocket.
 */
var SERVICE_CODE = 'CASH_IN';

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

module.exports = {
  execute: async function(options) {
    var amount = Number(options.amount);
    var customerPhone = String(options.customerPhone || '').trim();
    var currency = options.currency || 'VND';

    assertAmount(amount);

    if (!customerPhone) {
      throw makeError('BAD_REQUEST');
    }

    var customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      throw makeError('RECEIVER_NOT_FOUND');
    }

    var bankPocket = await pocketService.createInternalPocket('bank', {
      currency: currency,
      balance: 1000000000
    });
    var customerPocket = await Pocket.findOne({
      customer: customer.id,
      client: 'customer'
    });

    if (!customerPocket) {
      throw makeError('POCKET_NOT_FOUND');
    }

    await pocketService.getVerifiedPocket(customerPocket.id);

    var trail = await trailService.init({
      service: SERVICE_CODE,
      type: 'cash_in',
      receiver: customer.id,
      inputMessage: {
        customerPhone: customerPhone,
        amount: amount,
        officerId: options.officerId
      },
      outputMessage: {
        TRANSBODY: {
          SERVICEID: SERVICE_CODE,
          SENDERPOCKETID: bankPocket.id,
          RECEIVERID: customer.id,
          RECEIVERPHONE: customer.phone,
          RECEIVERPOCKETID: customerPocket.id,
          AMOUNT: amount,
          DEBITFEE: 0,
          TOTALAMOUNT: amount,
          CURRENCY: currency,
          AUTHMETHOD: 'NONE'
        }
      },
      log: {
        action: 'Cash-in initialized',
        officerId: options.officerId
      }
    });
    var pendingTrail = await trailService.markPending(trail.id, {
      amount: amount,
      totalAmount: amount,
      authMethod: 'NONE'
    });

    await pocketService.lockPocket(bankPocket.id);

    try {
      var ledger = await ledgerService.execute({
        trail: pendingTrail,
        service: SERVICE_CODE,
        type: 'cash_in',
        receiver: customer.id,
        amount: amount,
        fee: 0,
        totalAmount: amount,
        currency: currency,
        status: 'done',
        trailStatus: 'done',
        logStep: 'VERIFY_DONE',
        metadata: {
          officerId: options.officerId
        },
        steps: [{
          stepOrder: 1,
          debitPocket: bankPocket.id,
          creditPocket: customerPocket.id,
          amount: amount,
          description: 'Cash-in from bank pocket'
        }]
      });

      return {
        transRefId: String(pendingTrail.id),
        transaction: ledger.transaction,
        bankBalance: ledger.pocketBalances[String(bankPocket.id)],
        customerBalance: ledger.pocketBalances[String(customerPocket.id)],
        customer: {
          id: customer.id,
          phone: customer.phone
        }
      };
    } catch (err) {
      await trailService.markFailed(pendingTrail.id, err.code || 'TRANSFER_FAILED', err.message, {
        stage: 'CASH_IN'
      });
      throw err;
    } finally {
      await pocketService.releasePocket(bankPocket.id);
    }
  }
};
