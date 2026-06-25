/**
 * TransactionController.js
 *
 * Hard-coded P2P transaction endpoints.
 */
var codeMap = function(err) {
  return respCode[err.code] || respCode.SERVER_ERROR;
};

module.exports = {
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
  }
};
