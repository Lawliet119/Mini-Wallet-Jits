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

var setRefreshTokenCookie = function(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

var clearRefreshTokenCookie = function(res) {
  res.clearCookie('refreshToken');
};

module.exports = {
  login: async function(req, res) {
    try {
      var phone = normalizePhone(req.body.phone);
      var pin = req.body.pin;
      var customer;
      var officer;

      if (!phone || !isValidPin(pin)) {
        return res.error(respCode.BAD_REQUEST);
      }

      customer = await Customer.findOne({ phone: phone });
      if (customer && (await pinService.verify(pin, customer.pinHash))) {
        if (customer.status !== 'active') {
          return res.error(respCode.ACCOUNT_LOCKED);
        }

        var accessToken = tokenService.issue(customer, 'customer');
        var refreshToken = tokenService.issueRefresh(customer, 'customer');
        setRefreshTokenCookie(res, refreshToken);

        return res.ok({
          accessToken: accessToken,
          tokenType: 'Bearer',
          role: 'customer',
          user: publicCustomer(customer),
          customer: publicCustomer(customer)
        });
      }

      officer = await Officer.findOne({ phone: phone });
      if (officer && (await pinService.verify(pin, officer.pinHash))) {
        if (officer.status !== 'active') {
          return res.error(respCode.ACCOUNT_LOCKED);
        }

        var accessToken = tokenService.issue(officer, 'officer');
        var refreshToken = tokenService.issueRefresh(officer, 'officer');
        setRefreshTokenCookie(res, refreshToken);

        return res.ok({
          accessToken: accessToken,
          tokenType: 'Bearer',
          role: 'officer',
          user: publicOfficer(officer),
          officer: publicOfficer(officer)
        });
      }

      return res.error(respCode.INVALID_CREDENTIALS);
    } catch (err) {
      sails.log.error(err);
      return res.error(respCode.SERVER_ERROR);
    }
  },

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

      var pocket = await pocketService.createCustomerPocket(customer.id, req.body.currency);

      var accessToken = tokenService.issue(customer, 'customer');
      var refreshToken = tokenService.issueRefresh(customer, 'customer');
      setRefreshTokenCookie(res, refreshToken);

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

      var accessToken = tokenService.issue(customer, 'customer');
      var refreshToken = tokenService.issueRefresh(customer, 'customer');
      setRefreshTokenCookie(res, refreshToken);

      return res.ok({
        accessToken: accessToken,
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

      var accessToken = tokenService.issue(officer, 'officer');
      var refreshToken = tokenService.issueRefresh(officer, 'officer');
      setRefreshTokenCookie(res, refreshToken);

      return res.ok({
        accessToken: accessToken,
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

      var accessToken = tokenService.issue(officer, 'officer');
      var refreshToken = tokenService.issueRefresh(officer, 'officer');
      setRefreshTokenCookie(res, refreshToken);

      return res.ok({
        accessToken: accessToken,
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
  },

  refresh: async function(req, res) {
    try {
      var token = req.cookies.refreshToken;
      if (!token) {
        return res.error(respCode.UNAUTHORIZED);
      }

      var payload = tokenService.verifyRefresh(token);
      var Model = payload.role === 'officer' ? Officer : Customer;
      var user = await Model.findOne({ id: payload.sub });

      if (!user || user.status !== 'active') {
        clearRefreshTokenCookie(res);
        return res.error(respCode.UNAUTHORIZED);
      }

      var accessToken = tokenService.issue(user, payload.role);
      var newRefreshToken = tokenService.issueRefresh(user, payload.role);
      setRefreshTokenCookie(res, newRefreshToken);

      return res.ok({
        accessToken: accessToken,
        tokenType: 'Bearer',
        role: payload.role
      });
    } catch (err) {
      clearRefreshTokenCookie(res);
      return res.error(respCode.UNAUTHORIZED);
    }
  },

  logout: async function(req, res) {
    clearRefreshTokenCookie(res);
    return res.ok({ message: 'Logged out successfully' });
  }
};
