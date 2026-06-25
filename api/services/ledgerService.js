/**
 * ledgerService.js
 *
 * Executes balanced pocket movements inside one native Mongo transaction.
 */
var ObjectId = require('mongodb').ObjectId;

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

var addUniquePocketId = function(ids, pocketId) {
  var id = String(pocketId);
  if (ids.indexOf(id) === -1) {
    ids.push(id);
  }
};

var assertMovementAmount = function(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw makeError('INVALID_AMOUNT');
  }
};

var pickOptionalRefs = function(transactionDoc, refs) {
  if (refs.sender) {
    transactionDoc.sender = toObjectId(refs.sender);
  }

  if (refs.receiver) {
    transactionDoc.receiver = toObjectId(refs.receiver);
  }

  if (refs.biller) {
    transactionDoc.biller = toObjectId(refs.biller);
  }
};

module.exports = {
  execute: async function(options) {
    var steps = options.steps || [];
    var trail = options.trail;

    if (!trail || !trail.id || steps.length === 0) {
      throw makeError('BAD_REQUEST');
    }

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
        var trailObjectId = toObjectId(trail.id);
        var pocketIds = [];
        var pocketDeltas = {};

        steps.forEach((step) => {
          var amount = Number(step.amount);
          assertMovementAmount(amount);
          addUniquePocketId(pocketIds, step.debitPocket);
          addUniquePocketId(pocketIds, step.creditPocket);
          pocketDeltas[String(step.debitPocket)] = (pocketDeltas[String(step.debitPocket)] || 0) - amount;
          pocketDeltas[String(step.creditPocket)] = (pocketDeltas[String(step.creditPocket)] || 0) + amount;
        });

        var pocketDocs = await pocketCollection.find({
          _id: {
            $in: pocketIds.map(toObjectId)
          }
        }, { session: session }).toArray();

        if (pocketDocs.length !== pocketIds.length) {
          throw makeError('POCKET_NOT_FOUND');
        }

        var pocketById = {};
        pocketDocs.forEach((doc) => {
          assertPocketChecksum(doc);
          pocketById[String(doc._id)] = doc;
        });

        var nextBalances = {};
        pocketIds.forEach((pocketId) => {
          var doc = pocketById[pocketId];
          var nextBalance = Number(doc.balance) + Number(pocketDeltas[pocketId] || 0);

          if (nextBalance < 0) {
            throw makeError('INSUFFICIENT_BALANCE');
          }

          nextBalances[pocketId] = nextBalance;
        });

        for (var index = 0; index < pocketIds.length; index++) {
          var pocketId = pocketIds[index];
          var originalPocket = pocketById[pocketId];
          var delta = Number(pocketDeltas[pocketId] || 0);
          var filter = {
            _id: toObjectId(pocketId),
            checksum: originalPocket.checksum
          };

          if (delta < 0) {
            filter.balance = {
              $gte: Math.abs(delta)
            };
          }

          var updateResult = await pocketCollection.updateOne(filter, {
            $set: {
              balance: nextBalances[pocketId],
              checksum: signNativePocket(originalPocket, nextBalances[pocketId]),
              updatedAt: now
            }
          }, { session: session });

          if (updateResult.modifiedCount !== 1) {
            throw makeError(delta < 0 ? 'INSUFFICIENT_BALANCE' : 'TRANSFER_FAILED');
          }
        }

        var entryDocs = steps.map((step, stepIndex) => {
          return {
            transRefId: String(trail.id),
            stepOrder: step.stepOrder || stepIndex + 1,
            debitPocket: toObjectId(step.debitPocket),
            creditPocket: toObjectId(step.creditPocket),
            amount: Number(step.amount),
            currency: options.currency || 'VND',
            description: step.description || null,
            status: 'settled',
            createdAt: now,
            updatedAt: now
          };
        });
        var entryResult = await entryCollection.insertMany(entryDocs, { session: session });
        var entryIds = Object.keys(entryResult.insertedIds).map((entryIndex) => {
          return String(entryResult.insertedIds[entryIndex]);
        });
        var metadata = Object.assign({}, options.metadata || {});
        metadata.pocketEntryIds = entryIds;
        if (entryIds.length === 1) {
          metadata.pocketEntryId = entryIds[0];
        }

        var transactionDoc = {
          code: makeTransactionCode(),
          transRefId: String(trail.id),
          trail: trailObjectId,
          service: options.service,
          type: options.type,
          amount: Number(options.amount),
          fee: Number(options.fee || 0),
          totalAmount: Number(options.totalAmount || options.amount),
          currency: options.currency || 'VND',
          status: options.status || 'done',
          metadata: metadata,
          createdAt: now,
          updatedAt: now
        };
        pickOptionalRefs(transactionDoc, {
          sender: options.sender,
          receiver: options.receiver,
          biller: options.biller
        });

        var transactionResult = await transactionCollection.insertOne(transactionDoc, { session: session });

        await trailCollection.updateOne({
          _id: trailObjectId,
          status: 'pending'
        }, {
          $set: {
            status: options.trailStatus || transactionDoc.status,
            updatedAt: now
          },
          $push: {
            transStepLog: {
              step: options.logStep || 'VERIFY_DONE',
              detail: {
                transactionId: String(transactionResult.insertedId),
                pocketEntryIds: entryIds
              },
              at: now
            }
          }
        }, { session: session });

        result = {
          transRefId: String(trail.id),
          transaction: {
            id: String(transactionResult.insertedId),
            code: transactionDoc.code,
            status: transactionDoc.status,
            amount: transactionDoc.amount,
            fee: transactionDoc.fee,
            totalAmount: transactionDoc.totalAmount,
            currency: transactionDoc.currency
          },
          pocketBalances: nextBalances,
          pocketEntryIds: entryIds
        };
      });
    } finally {
      await session.endSession();
    }

    return result;
  }
};
