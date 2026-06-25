/**
 * p2pService.js
 *
 * Hard-coded three-step P2P transfer flow before the config-driven engine.
 */
var ObjectId = require('mongodb').ObjectId;

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
          var senderPocketObjectId = toObjectId(senderPocketId);
          var receiverPocketObjectId = toObjectId(receiverPocketId);
          var trailObjectId = toObjectId(trail.id);

          var senderPocket = await pocketCollection.findOne({
            _id: senderPocketObjectId
          }, { session: session });
          var receiverPocket = await pocketCollection.findOne({
            _id: receiverPocketObjectId
          }, { session: session });

          if (!senderPocket || !receiverPocket) {
            throw makeError('POCKET_NOT_FOUND');
          }

          assertPocketChecksum(senderPocket);
          assertPocketChecksum(receiverPocket);

          if (senderPocket.balance < totalAmount) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          var senderNextBalance = senderPocket.balance - totalAmount;
          var receiverNextBalance = receiverPocket.balance + amount;
          var senderNextChecksum = signNativePocket(senderPocket, senderNextBalance);
          var receiverNextChecksum = signNativePocket(receiverPocket, receiverNextBalance);

          var debitResult = await pocketCollection.updateOne({
            _id: senderPocketObjectId,
            checksum: senderPocket.checksum,
            balance: { $gte: totalAmount }
          }, {
            $set: {
              balance: senderNextBalance,
              checksum: senderNextChecksum,
              updatedAt: now
            }
          }, { session: session });

          if (debitResult.modifiedCount !== 1) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          var creditResult = await pocketCollection.updateOne({
            _id: receiverPocketObjectId,
            checksum: receiverPocket.checksum
          }, {
            $set: {
              balance: receiverNextBalance,
              checksum: receiverNextChecksum,
              updatedAt: now
            }
          }, { session: session });

          if (creditResult.modifiedCount !== 1) {
            throw makeError('TRANSFER_FAILED');
          }

          var entryDoc = {
            transRefId: String(trail.id),
            stepOrder: 1,
            debitPocket: senderPocketObjectId,
            creditPocket: receiverPocketObjectId,
            amount: amount,
            currency: transBody.CURRENCY,
            description: 'P2P transfer',
            status: 'settled',
            createdAt: now,
            updatedAt: now
          };
          var entryResult = await entryCollection.insertOne(entryDoc, { session: session });

          var transactionDoc = {
            code: makeTransactionCode(),
            transRefId: String(trail.id),
            trail: trailObjectId,
            service: SERVICE_CODE,
            type: 'p2p',
            sender: toObjectId(trail.sender),
            receiver: toObjectId(trail.receiver),
            amount: amount,
            fee: fee,
            totalAmount: totalAmount,
            currency: transBody.CURRENCY,
            status: 'done',
            metadata: {
              pocketEntryId: String(entryResult.insertedId),
              message: transBody.MESSAGE || null
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
            transaction: {
              id: String(transactionResult.insertedId),
              code: transactionDoc.code,
              status: transactionDoc.status,
              amount: transactionDoc.amount,
              fee: transactionDoc.fee,
              totalAmount: transactionDoc.totalAmount,
              currency: transactionDoc.currency
            },
            senderBalance: senderNextBalance,
            receiverBalance: receiverNextBalance
          };
        });
      } finally {
        await session.endSession();
      }

      return result;
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
