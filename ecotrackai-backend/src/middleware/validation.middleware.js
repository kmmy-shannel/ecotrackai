const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.utils');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return sendError(res, 400, 'Validation failed', errorMessages);
  }

  next();
};

module.exports = {
  validateRequest
};