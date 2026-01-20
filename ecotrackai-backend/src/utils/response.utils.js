const sendSuccess = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, statusCode, message, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error })
  });
};

module.exports = {
  sendSuccess,
  sendError
};