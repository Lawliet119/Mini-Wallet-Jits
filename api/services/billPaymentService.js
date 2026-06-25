/**
 * billPaymentService.js
 *
 * Hard-coded bill payment flow with mock inquiry and payment.
 */
var ObjectId = require('mongodb').ObjectId;

var SERVICE_CODE = 'BILL_PAYMENT';
var FEE_AMOUNT = 1000;

var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
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
          var senderPocketObjectId = toObjectId(transBody.SENDERPOCKETID);
          var billerPocketObjectId = toObjectId(transBody.BILLERPOCKETID);
          var systemPocketObjectId = toObjectId(transBody.SYSTEMPOCKETID);
          var trailObjectId = toObjectId(trail.id);
          var amount = Number(transBody.AMOUNT);
          var fee = Number(transBody.DEBITFEE || 0);
          var totalAmount = Number(transBody.TOTALAMOUNT || amount + fee);

          var senderPocket = await pocketCollection.findOne({ _id: senderPocketObjectId }, { session: session });
          var billerPocket = await pocketCollection.findOne({ _id: billerPocketObjectId }, { session: session });
          var systemPocket = await pocketCollection.findOne({ _id: systemPocketObjectId }, { session: session });

          if (!senderPocket || !billerPocket || !systemPocket) {
            throw makeError('POCKET_NOT_FOUND');
          }

          assertPocketChecksum(senderPocket);
          assertPocketChecksum(billerPocket);
          assertPocketChecksum(systemPocket);

          if (senderPocket.balance < totalAmount) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          var senderNextBalance = senderPocket.balance - totalAmount;
          var billerNextBalance = billerPocket.balance + amount;
          var systemNextBalance = systemPocket.balance + fee;

          var debitResult = await pocketCollection.updateOne({
            _id: senderPocketObjectId,
            checksum: senderPocket.checksum,
            balance: { $gte: totalAmount }
          }, {
            $set: {
              balance: senderNextBalance,
              checksum: signNativePocket(senderPocket, senderNextBalance),
              updatedAt: now
            }
          }, { session: session });

          if (debitResult.modifiedCount !== 1) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          await pocketCollection.updateOne({
            _id: billerPocketObjectId,
            checksum: billerPocket.checksum
          }, {
            $set: {
              balance: billerNextBalance,
              checksum: signNativePocket(billerPocket, billerNextBalance),
              updatedAt: now
            }
          }, { session: session });

          await pocketCollection.updateOne({
            _id: systemPocketObjectId,
            checksum: systemPocket.checksum
          }, {
            $set: {
              balance: systemNextBalance,
              checksum: signNativePocket(systemPocket, systemNextBalance),
              updatedAt: now
            }
          }, { session: session });

          var entryDocs = [{
            transRefId: String(trail.id),
            stepOrder: 1,
            debitPocket: senderPocketObjectId,
            creditPocket: billerPocketObjectId,
            amount: amount,
            currency: transBody.CURRENCY,
            description: 'Bill amount collection',
            status: 'settled',
            createdAt: now,
            updatedAt: now
          }];

          if (fee > 0) {
            entryDocs.push({
              transRefId: String(trail.id),
              stepOrder: 2,
              debitPocket: senderPocketObjectId,
              creditPocket: systemPocketObjectId,
              amount: fee,
              currency: transBody.CURRENCY,
              description: 'Bill payment fee',
              status: 'settled',
              createdAt: now,
              updatedAt: now
            });
          }

          var entryResult = await entryCollection.insertMany(entryDocs, { session: session });
          var entryIds = Object.keys(entryResult.insertedIds).map((index) => {
            return String(entryResult.insertedIds[index]);
          });
          var transactionDoc = {
            code: makeTransactionCode(),
            transRefId: String(trail.id),
            trail: trailObjectId,
            service: SERVICE_CODE,
            type: 'bill_payment',
            sender: toObjectId(trail.sender),
            biller: toObjectId(transBody.BILLERID),
            amount: amount,
            fee: fee,
            totalAmount: totalAmount,
            currency: transBody.CURRENCY,
            status: 'external_pending',
            metadata: {
              pocketEntryIds: entryIds,
              invoiceId: transBody.INVOICEID,
              billCode: transBody.BILLCODE
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
              status: 'external_pending',
              updatedAt: now
            },
            $push: {
              transStepLog: {
                step: 'COLLECTION_DONE',
                detail: {
                  transactionId: String(transactionResult.insertedId),
                  pocketEntryIds: entryIds
                },
                at: now
              }
            }
          }, { session: session });

          result = {
            transactionId: String(transactionResult.insertedId),
            transactionCode: transactionDoc.code,
            senderBalance: senderNextBalance,
            billerBalance: billerNextBalance,
            systemBalance: systemNextBalance
          };
        });
      } finally {
        await session.endSession();
      }

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
