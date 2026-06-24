/**
 * AccessController.js
 *
 * Handles customer/officer registration and JWT login.
 */
var normalizePhone = function(rawPhone) {
  return String(rawPhone || '').trim();
};

var isValidPin = function(pin) {
  return /^\d{4,12}$/.test(String(pin || ''));
};

var publicCustomer = function(customer) {
  return {
    id: customer.id,
    phone: customer.phone,
    status: customer.status
  };
};

var publicOfficer = function(officer) {
  return {
    id: officer.id,
    phone: officer.phone,
    name: officer.name,
    status: officer.status
  };
};

module.exports = {
  registerCustomer: async function(req, res) {
    try {
      var phone = normalizePhone(req.body.phone);
      var pin = req.body.pin;

      if (!phone || !isValidPin(pin)) {
        return res.error(respCode.BAD_REQUEST);
      }

      var existedCustomer = await Customer.findOne({ phone: phone });
      if (existedCustomer) {
        return res.error(respCode.PHONE_ALREADY_EXISTS);
      }

      var customer = await Customer.create({
        phone: phone,
        pinHash: await pinService.hash(pin)
      }).fetch();

      var pocket = await Pocket.create({
        client: 'customer',
        customer: customer.id,
        currency: req.body.currency || 'VND',
        balance: 0
      }).fetch();

      var accessToken = tokenService.issue(customer, 'customer');

      return res.ok({
        accessToken: accessToken,
        tokenType: 'Bearer',
        customer: publicCustomer(customer),
        pocket: {
          id: pocket.id,
          balance: pocket.balance,
          currency: pocket.currency
        }
      });
    } catch (err) {
      sails.log.error(err);
      return res.error(respCode.SERVER_ERROR);
    }
  },

  loginCustomer: async function(req, res) {
    try {
      var phone = normalizePhone(req.body.phone);
      var pin = req.body.pin;

      if (!phone || !isValidPin(pin)) {
        return res.error(respCode.BAD_REQUEST);
      }

      var customer = await Customer.findOne({ phone: phone });
      if (!customer || !(await pinService.verify(pin, customer.pinHash))) {
        return res.error(respCode.INVALID_CREDENTIALS);
      }

      if (customer.status !== 'active') {
        return res.error(respCode.ACCOUNT_LOCKED);
      }

      return res.ok({
        accessToken: tokenService.issue(customer, 'customer'),
        tokenType: 'Bearer',
        customer: publicCustomer(customer)
      });
    } catch (err) {
      sails.log.error(err);
      return res.error(respCode.SERVER_ERROR);
    }
  },

  registerOfficer: async function(req, res) {
    try {
      var phone = normalizePhone(req.body.phone);
      var pin = req.body.pin;

      if (!phone || !isValidPin(pin)) {
        return res.error(respCode.BAD_REQUEST);
      }

      var existedOfficer = await Officer.findOne({ phone: phone });
      if (existedOfficer) {
        return res.error(respCode.PHONE_ALREADY_EXISTS);
      }

      var officer = await Officer.create({
        phone: phone,
        name: req.body.name || null,
        pinHash: await pinService.hash(pin)
      }).fetch();

      return res.ok({
        accessToken: tokenService.issue(officer, 'officer'),
        tokenType: 'Bearer',
        officer: publicOfficer(officer)
      });
    } catch (err) {
      sails.log.error(err);
      return res.error(respCode.SERVER_ERROR);
    }
  },

  loginOfficer: async function(req, res) {
    try {
      var phone = normalizePhone(req.body.phone);
      var pin = req.body.pin;

      if (!phone || !isValidPin(pin)) {
        return res.error(respCode.BAD_REQUEST);
      }

      var officer = await Officer.findOne({ phone: phone });
      if (!officer || !(await pinService.verify(pin, officer.pinHash))) {
        return res.error(respCode.INVALID_CREDENTIALS);
      }

      if (officer.status !== 'active') {
        return res.error(respCode.ACCOUNT_LOCKED);
      }

      return res.ok({
        accessToken: tokenService.issue(officer, 'officer'),
        tokenType: 'Bearer',
        officer: publicOfficer(officer)
      });
    } catch (err) {
      sails.log.error(err);
      return res.error(respCode.SERVER_ERROR);
    }
  },

  me: async function(req, res) {
    return res.ok({
      user: req.info.user,
      role: req.info.role
    });
  }
};
