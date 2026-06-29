/**
 * TransactionController.js
 *
 * Generic transaction endpoints.
 */
var codeMap = function(err) {
  return respCode[err.code] || respCode.SERVER_ERROR;
};

var toPageNumber = function(value, fallback, max) {
  var parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return fallback;
  }

  if (max !== undefined) {
    return Math.min(parsed, max);
  }

  return parsed;
};

var toPublicCustomer = function(customer) {
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    phone: customer.phone
  };
};

var toPublicBiller = function(biller) {
  if (!biller) {
    return null;
  }

  return {
    id: biller.id,
    code: biller.code,
    name: biller.name
  };
};

var toPublicTransaction = function(transaction, currentCustomerId) {
  var senderId = transaction.sender ? transaction.sender.id || transaction.sender : null;
  var receiverId = transaction.receiver ? transaction.receiver.id || transaction.receiver : null;
  var isIncoming = receiverId && String(receiverId) === String(currentCustomerId);
  var isOutgoing = senderId && String(senderId) === String(currentCustomerId) && !isIncoming;

  return {
    id: transaction.id,
    code: transaction.code,
    transRefId: transaction.transRefId,
    type: transaction.type,
    direction: isOutgoing ? 'OUT' : 'IN',
    sender: toPublicCustomer(transaction.sender),
    receiver: toPublicCustomer(transaction.receiver),
    biller: toPublicBiller(transaction.biller),
    amount: transaction.amount,
    fee: transaction.fee,
    totalAmount: transaction.totalAmount,
    currency: transaction.currency,
    status: transaction.status,
    createdAt: transaction.createdAt
  };
};

module.exports = {
  request: async function(req, res) {
    try {
      var preview = await transactionEngineService.request({
        actor: {
          role: req.info.role,
          user: req.info.user
        },
        parameters: req.body
      });

      return res.ok(preview);
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  confirm: async function(req, res) {
    try {
      var result = await transactionEngineService.confirm({
        actor: {
          role: req.info.role,
          user: req.info.user
        },
        transRefId: req.body.transRefId
      });

      return res.ok(result);
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  verify: async function(req, res) {
    try {
      var result = await transactionEngineService.verify({
        actor: {
          role: req.info.role,
          user: req.info.user
        },
        transRefId: req.body.transRefId,
        pin: req.body.pin
      });

      return res.ok(result);
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  history: async function(req, res) {
    try {
      var limit = toPageNumber(req.query.limit, 20, 100);
      var skip = toPageNumber(req.query.skip, 0);
      var customerId = req.info.user.id;
      var criteria = {
        or: [
          { sender: customerId },
          { receiver: customerId }
        ]
      };

      var transactions = await Transaction.find(criteria)
        .populate('sender')
        .populate('receiver')
        .populate('biller')
        .sort('createdAt DESC')
        .limit(limit)
        .skip(skip);

      var total = await Transaction.count(criteria);

      return res.ok({
        transactions: transactions.map((transaction) => {
          return toPublicTransaction(transaction, customerId);
        }),
        pagination: {
          limit: limit,
          skip: skip,
          total: total
        }
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  detail: async function(req, res) {
    try {
      var customerId = req.info.user.id;
      var transaction = await Transaction.findOne({
        id: req.params.id
      })
      .populate('sender')
      .populate('receiver')
      .populate('biller')
      .populate('trail');

      if (!transaction) {
        return res.error(respCode.TRANSACTION_NOT_FOUND);
      }

      var senderId = transaction.sender ? transaction.sender.id || transaction.sender : null;
      var receiverId = transaction.receiver ? transaction.receiver.id || transaction.receiver : null;
      var isParticipant = String(senderId) === String(customerId) ||
        String(receiverId) === String(customerId);

      if (!isParticipant) {
        return res.error(respCode.FORBIDDEN);
      }

      return res.ok({
        transaction: toPublicTransaction(transaction, customerId),
        metadata: transaction.metadata || {},
        trail: transaction.trail ? {
          id: transaction.trail.id,
          status: transaction.trail.status
        } : null
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  trailDetail: async function(req, res) {
    try {
      var customerId = req.info.user.id;
      var trail = await TransactionTrail.findOne({
        id: req.params.transRefId
      })
      .populate('sender')
      .populate('receiver')
      .populate('biller')
      .populate('transaction');

      if (!trail) {
        return res.error(respCode.TRANSACTION_TRAIL_NOT_FOUND);
      }

      var senderId = trail.sender ? trail.sender.id || trail.sender : null;
      var receiverId = trail.receiver ? trail.receiver.id || trail.receiver : null;
      var isParticipant = String(senderId) === String(customerId) ||
        String(receiverId) === String(customerId);

      if (!isParticipant) {
        return res.error(respCode.FORBIDDEN);
      }

      return res.ok({
        trail: {
          id: trail.id,
          service: trail.service,
          type: trail.type,
          status: trail.status,
          sender: toPublicCustomer(trail.sender),
          receiver: toPublicCustomer(trail.receiver),
          biller: toPublicBiller(trail.biller),
          inputMessage: trail.inputMessage,
          outputMessage: trail.outputMessage,
          transStepLog: trail.transStepLog,
          errorCode: trail.errorCode,
          errorMessage: trail.errorMessage,
          createdAt: trail.createdAt,
          updatedAt: trail.updatedAt
        },
        transaction: trail.transaction && trail.transaction[0] ? {
          id: trail.transaction[0].id,
          code: trail.transaction[0].code,
          status: trail.transaction[0].status
        } : null
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  }
};
