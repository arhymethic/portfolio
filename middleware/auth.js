'use strict';

const crypto = require('crypto');

function safeEqual(a, b) {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function basicAuth(req, res, next) {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    console.error('[auth] ADMIN_USERNAME or ADMIN_PASSWORD not set — blocking admin access');
    return res.status(503).json({ error: 'Admin access not configured.' });
  }

  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Portfolio Admin"');
    return res.status(401).send('Unauthorized');
  }

  const decoded     = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const colonIndex  = decoded.indexOf(':');
  const suppliedUser = colonIndex >= 0 ? decoded.slice(0, colonIndex) : '';
  const suppliedPass = colonIndex >= 0 ? decoded.slice(colonIndex + 1) : '';

  const authenticated = safeEqual(username, suppliedUser) && safeEqual(password, suppliedPass);

  const ip  = req.ip || req.socket.remoteAddress || 'unknown';
  const ua  = req.headers['user-agent'] || 'unknown';
  console.log(`\n🔒  [auth] ${req.method} ${req.originalUrl} — IP: ${ip} | User: "${suppliedUser}" | ${authenticated ? '✅ GRANTED' : '❌ DENIED'} | ${ua}\n`);

  if (!authenticated) {
    res.set('WWW-Authenticate', 'Basic realm="Portfolio Admin"');
    return res.status(401).send('Unauthorized');
  }

  next();
}

module.exports = basicAuth;
