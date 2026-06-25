/**
 * mockBillerService.js
 *
 * Local substitute for external biller inquiry/payment APIs.
 */
var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

var makeBillerRefId = function(transRefId) {
  return 'BILLER-' + transRefId;
};

module.exports = {
  ensureDefaultData: async function() {
    var biller = await Biller.findOne({ code: 'EVN' });

    if (!biller) {
      var pocket = await pocketService.createBillerPocket(sails.config.custom.seedCurrency);
      biller = await Biller.create({
        code: 'EVN',
        name: 'Electricity Provider',
        inquiryUrl: 'mock://biller/evn/inquiry',
        paymentUrl: 'mock://biller/evn/payment',
        pocket: pocket.id,
        status: 'active'
      }).fetch();
    }

    var invoice = await MockInvoice.findOne({
      biller: biller.id,
      billCode: 'EVN001'
    });

    if (!invoice) {
      await MockInvoice.create({
        biller: biller.id,
        billCode: 'EVN001',
        customerName: 'Demo Customer',
        amount: 50000,
        currency: sails.config.custom.seedCurrency,
        status: 'unpaid'
      });
    }

    return biller;
  },

  inquiry: async function(options) {
    var biller = await Biller.findOne({
      id: options.billerId,
      status: 'active'
    }).populate('pocket');

    if (!biller) {
      throw makeError('BILLER_NOT_FOUND');
    }

    var invoice = await MockInvoice.findOne({
      biller: biller.id,
      billCode: String(options.billCode || '').trim()
    });

    if (!invoice) {
      throw makeError('INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'paid') {
      throw makeError('INVOICE_ALREADY_PAID');
    }

    return {
      biller: biller,
      invoice: invoice,
      amount: invoice.amount,
      currency: invoice.currency
    };
  },

  payment: async function(options) {
    var invoice = await MockInvoice.findOne({
      id: options.invoiceId
    });

    if (!invoice) {
      throw makeError('INVOICE_NOT_FOUND');
    }

    if (invoice.status === 'paid') {
      if (invoice.paidTransRefId === String(options.transRefId)) {
        return {
          billerRefId: makeBillerRefId(options.transRefId),
          idempotent: true
        };
      }

      throw makeError('INVOICE_ALREADY_PAID');
    }

    if (invoice.amount !== options.amount) {
      throw makeError('INVALID_AMOUNT');
    }

    await MockInvoice.updateOne({ id: invoice.id }).set({
      status: 'paid',
      paidTransRefId: String(options.transRefId),
      paidAt: Date.now()
    });

    return {
      billerRefId: makeBillerRefId(options.transRefId),
      idempotent: false
    };
  }
};
