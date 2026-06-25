/**
 * TransactionController.js
 *
 * Hard-coded P2P transaction endpoints.
 */
var codeMap = function(err) {
  return respCode[err.code] || respCode.SERVER_ERROR;
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

var toPublicTransaction = function(transaction, currentCustomerId) {
  var senderId = transaction.sender ? transaction.sender.id || transaction.sender : null;
  var isOutgoing = senderId && String(senderId) === String(currentCustomerId);

  return {
    id: transaction.id,
    code: transaction.code,
    transRefId: transaction.transRefId,
    type: transaction.type,
    direction: isOutgoing ? 'OUT' : 'IN',
    sender: toPublicCustomer(transaction.sender),
    receiver: toPublicCustomer(transaction.receiver),
    amount: transaction.amount,
    fee: transaction.fee,
    totalAmount: transaction.totalAmount,
    currency: transaction.currency,
    status: transaction.status,
    createdAt: transaction.createdAt
  };
};

module.exports = {
  cashIn: async function(req, res) {
    try {
      var result = await cashInService.execute({
        officerId: req.info.user.id,
        customerPhone: req.body.customerPhone,
        amount: req.body.amount,
        currency: req.body.currency || 'VND'
      });

      return res.ok(result);
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  requestP2P: async function(req, res) {
    try {
      var preview = await p2pService.request({
        senderId: req.info.user.id,
        receiverPhone: req.body.receiverPhone,
        amount: req.body.amount,
        message: req.body.message
      });

      return res.ok(preview);
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  confirmP2P: async function(req, res) {
    try {
      var result = await p2pService.confirm({
        customerId: req.info.user.id,
        transRefId: req.body.transRefId
      });

      return res.ok(result);
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  verifyP2P: async function(req, res) {
    try {
      var result = await p2pService.verify({
        customerId: req.info.user.id,
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
      var limit = Math.min(Number(req.query.limit) || 20, 100);
      var skip = Number(req.query.skip) || 0;
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
