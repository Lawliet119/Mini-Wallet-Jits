/**
 * cashInService.js
 *
 * Hard-coded Officer cash-in flow: Bank pocket -> Customer pocket.
 */
var ObjectId = require('mongodb').ObjectId;

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

var toObjectId = function(id) {
  return new ObjectId(String(id));
};

var normalizePocket = function(doc) {
  return {
    id: String(doc._id),
    client: doc.client,
    customer: doc.customer ? String(doc.customer) : '',
    currency: doc.currency,
    balance: doc.balance,
    checksum: doc.checksum,
    status: doc.status
  };
};

var assertPocketChecksum = function(doc) {
  if (!checksumService.verifyPocket(normalizePocket(doc))) {
    throw makeError('POCKET_CHECKSUM_INVALID');
  }
};

var signNativePocket = function(doc, nextBalance) {
  return checksumService.signPocket(Object.assign(normalizePocket(doc), {
    balance: nextBalance
  }));
};

var makeTransactionCode = function() {
  return 'TX' + Date.now() + Math.floor(Math.random() * 1000000);
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
      var db = sails.getDatastore().manager;
      var session = db.client.startSession();
      var result;

      try {
        await session.withTransaction(async () => {
          var pocketCollection = db.collection(Pocket.tableName);
          var entryCollection = db.collection(PocketEntry.tableName);
          var transactionCollection = db.collection(Transaction.tableName);
          var trailCollection = db.collection(TransactionTrail.tableName);
          var now = Date.now();
          var bankPocketObjectId = toObjectId(bankPocket.id);
          var customerPocketObjectId = toObjectId(customerPocket.id);
          var trailObjectId = toObjectId(pendingTrail.id);

          var sourcePocket = await pocketCollection.findOne({
            _id: bankPocketObjectId
          }, { session: session });
          var targetPocket = await pocketCollection.findOne({
            _id: customerPocketObjectId
          }, { session: session });

          if (!sourcePocket || !targetPocket) {
            throw makeError('POCKET_NOT_FOUND');
          }

          assertPocketChecksum(sourcePocket);
          assertPocketChecksum(targetPocket);

          if (sourcePocket.balance < amount) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          var sourceNextBalance = sourcePocket.balance - amount;
          var targetNextBalance = targetPocket.balance + amount;

          var debitResult = await pocketCollection.updateOne({
            _id: bankPocketObjectId,
            checksum: sourcePocket.checksum,
            balance: { $gte: amount }
          }, {
            $set: {
              balance: sourceNextBalance,
              checksum: signNativePocket(sourcePocket, sourceNextBalance),
              updatedAt: now
            }
          }, { session: session });

          if (debitResult.modifiedCount !== 1) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          var creditResult = await pocketCollection.updateOne({
            _id: customerPocketObjectId,
            checksum: targetPocket.checksum
          }, {
            $set: {
              balance: targetNextBalance,
              checksum: signNativePocket(targetPocket, targetNextBalance),
              updatedAt: now
            }
          }, { session: session });

          if (creditResult.modifiedCount !== 1) {
            throw makeError('TRANSFER_FAILED');
          }

          var entryDoc = {
            transRefId: String(pendingTrail.id),
            stepOrder: 1,
            debitPocket: bankPocketObjectId,
            creditPocket: customerPocketObjectId,
            amount: amount,
            currency: currency,
            description: 'Cash-in from bank pocket',
            status: 'settled',
            createdAt: now,
            updatedAt: now
          };
          var entryResult = await entryCollection.insertOne(entryDoc, { session: session });

          var transactionDoc = {
            code: makeTransactionCode(),
            transRefId: String(pendingTrail.id),
            trail: trailObjectId,
            service: SERVICE_CODE,
            type: 'cash_in',
            receiver: toObjectId(customer.id),
            amount: amount,
            fee: 0,
            totalAmount: amount,
            currency: currency,
            status: 'done',
            metadata: {
              pocketEntryId: String(entryResult.insertedId),
              officerId: options.officerId
            },
            createdAt: now,
            updatedAt: now
          };
          var transactionResult = await transactionCollection.insertOne(transactionDoc, { session: session });

          await trailCollection.updateOne({
            _id: trailObjectId,
            status: 'pending'
          }, {
            $set: {
              status: 'done',
              updatedAt: now
            },
            $push: {
              transStepLog: {
                step: 'VERIFY_DONE',
                detail: {
                  transactionId: String(transactionResult.insertedId),
                  pocketEntryId: String(entryResult.insertedId)
                },
                at: now
              }
            }
          }, { session: session });

          result = {
            transRefId: String(pendingTrail.id),
            transaction: {
              id: String(transactionResult.insertedId),
              code: transactionDoc.code,
              status: transactionDoc.status,
              amount: transactionDoc.amount,
              fee: transactionDoc.fee,
              totalAmount: transactionDoc.totalAmount,
              currency: transactionDoc.currency
            },
            bankBalance: sourceNextBalance,
            customerBalance: targetNextBalance,
            customer: {
              id: customer.id,
              phone: customer.phone
            }
          };
        });
      } finally {
        await session.endSession();
      }

      return result;
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
