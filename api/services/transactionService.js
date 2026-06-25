/**
 * transactionService.js
 *
 * Creates immutable transaction receipts.
 */
var makeCode = function() {
  return 'TX' + Date.now() + Math.floor(Math.random() * 1000000);
};

module.exports = {
  createReceipt: async function(options) {
    return Transaction.create({
      code: options.code || makeCode(),
      transRefId: String(options.transRefId),
      trail: options.trail || options.transRefId,
      service: options.service || null,
      type: options.type || 'p2p',
      sender: options.sender || null,
      receiver: options.receiver || null,
      amount: options.amount,
      fee: options.fee || 0,
      totalAmount: options.totalAmount,
      currency: options.currency || 'VND',
      status: options.status || 'done',
      metadata: options.metadata || {}
    }).fetch();
  }
};
