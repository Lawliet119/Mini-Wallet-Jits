/**
 * trailService.js
 *
 * Helpers for TransactionTrail lifecycle and structured step logs.
 */
var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

var appendLog = function(logs, step, detail) {
  var nextLogs = Array.isArray(logs) ? logs.slice() : [];

  nextLogs.push({
    step: step,
    detail: detail || {},
    at: Date.now()
  });

  return nextLogs;
};

module.exports = {
  init: async function(options) {
    var trail = await TransactionTrail.create({
      service: options.service || null,
      type: options.type || 'normal',
      sender: options.sender || null,
      receiver: options.receiver || null,
      biller: options.biller || null,
      inputMessage: options.inputMessage || {},
      outputMessage: options.outputMessage || {},
      transStepLog: appendLog([], 'REQUEST_INIT', options.log)
    }).fetch();

    var outputMessage = Object.assign({}, trail.outputMessage || {});
    outputMessage.TRANSBODY = Object.assign({}, outputMessage.TRANSBODY || {}, {
      TRANSREFID: String(trail.id)
    });

    return TransactionTrail.updateOne({ id: trail.id }).set({
      outputMessage: outputMessage
    });
  },

  findPending: async function(transRefId) {
    var trail = await TransactionTrail.findOne({
      id: transRefId,
      status: 'pending'
    });

    if (!trail) {
      throw makeError('TRANSACTION_TRAIL_NOT_FOUND');
    }

    return trail;
  },

  markPending: async function(transRefId, detail) {
    var trail = await TransactionTrail.findOne({ id: transRefId });

    if (!trail) {
      throw makeError('TRANSACTION_TRAIL_NOT_FOUND');
    }

    return TransactionTrail.updateOne({ id: trail.id }).set({
      status: 'pending',
      transStepLog: appendLog(trail.transStepLog, 'REQUEST_DONE', detail)
    });
  },

  markDone: async function(transRefId, detail) {
    var trail = await TransactionTrail.findOne({ id: transRefId });

    if (!trail) {
      throw makeError('TRANSACTION_TRAIL_NOT_FOUND');
    }

    return TransactionTrail.updateOne({ id: trail.id }).set({
      status: 'done',
      transStepLog: appendLog(trail.transStepLog, 'VERIFY_DONE', detail)
    });
  },

  markFailed: async function(transRefId, code, message, detail) {
    var trail = await TransactionTrail.findOne({ id: transRefId });

    if (!trail) {
      throw makeError('TRANSACTION_TRAIL_NOT_FOUND');
    }

    return TransactionTrail.updateOne({ id: trail.id }).set({
      status: 'failed',
      errorCode: code || null,
      errorMessage: message || null,
      transStepLog: appendLog(trail.transStepLog, 'FAILED', detail)
    });
  },

  appendStep: async function(transRefId, step, detail) {
    var trail = await TransactionTrail.findOne({ id: transRefId });

    if (!trail) {
      throw makeError('TRANSACTION_TRAIL_NOT_FOUND');
    }

    return TransactionTrail.updateOne({ id: trail.id }).set({
      transStepLog: appendLog(trail.transStepLog, step, detail)
    });
  }
};
