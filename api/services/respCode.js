/**
 * respCode.js
 *
 * API response codes. HTTP remains 200 for business envelopes.
 */
module.exports = {
  SUCCESS: {
    code: 200,
    message: 'Success'
  },
  BAD_REQUEST: {
    code: 400,
    message: 'Invalid request'
  },
  UNAUTHORIZED: {
    code: 401,
    message: 'Unauthorized'
  },
  FORBIDDEN: {
    code: 403,
    message: 'Forbidden'
  },
  PHONE_ALREADY_EXISTS: {
    code: 1001,
    message: 'Phone number already exists'
  },
  INVALID_CREDENTIALS: {
    code: 1002,
    message: 'Invalid phone number or PIN'
  },
  ACCOUNT_LOCKED: {
    code: 1003,
    message: 'Account is locked'
  },
  POCKET_NOT_FOUND: {
    code: 2001,
    message: 'Pocket not found'
  },
  POCKET_CHECKSUM_INVALID: {
    code: 2002,
    message: 'Pocket checksum is invalid'
  },
  INVALID_AMOUNT: {
    code: 3001,
    message: 'Amount must be a positive integer'
  },
  INSUFFICIENT_BALANCE: {
    code: 3002,
    message: 'Insufficient balance'
  },
  SERVER_ERROR: {
    code: 500,
    message: 'Internal server error'
  }
};
