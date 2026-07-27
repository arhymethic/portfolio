'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  console.error(`[error] ${req.method} ${req.path} →`, err.message || err);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (res.headersSent) return;

  res.status(status).json({ error: status < 500 ? err.message : 'Internal server error.' });
}

module.exports = errorHandler;
