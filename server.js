'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const helmet  = require('helmet');

const { globalLimiter, adminLimiter } = require('./middleware/rateLimits');
const errorHandler    = require('./middleware/errorHandler');
const apiRoutes       = require('./routes/api');
const adminRoutes     = require('./routes/admin');
const { getConfig }   = require('./lib/config');
const { shutdown: scraperShutdown } = require('./lib/scraper');


const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
}));

app.use(express.json({ limit: '10kb' }));
app.use(globalLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const isAsset = req.path.match(/\.(png|jpg|jpeg|gif|css|js|svg|woff2?|ico)$/i);
    if (!isAsset) {
      console.log(`[request] ${req.method} ${req.originalUrl} — ${res.statusCode} (${duration}ms) from ${ip}`);
    }
  });
  next();
});

app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Serve downloaded avatars from data/avatars/ at /avatars/
app.use('/avatars', express.static(path.join(__dirname, 'data', 'avatars'), { etag: false, lastModified: false }));

// Serve project showcase images from data/projects/ at /project-images/
app.use('/project-images', express.static(path.join(__dirname, 'data', 'projects'), { etag: false, lastModified: false }));

const serveStatic = express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false });
app.use((req, res, next) => {
  if (req.path.toLowerCase() === '/admin') return res.redirect(301, '/admin/');
  if (req.path.toLowerCase().startsWith('/admin')) return next();
  serveStatic(req, res, next);
});

app.use('/api',   apiRoutes);
app.use('/admin', adminLimiter, adminRoutes);

app.use(errorHandler);

const config = getConfig();
const PORT   = process.env.PORT || config.server?.port || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀  Portfolio running → http://localhost:${PORT}`);
  console.log(`🔒  Admin dashboard  → http://localhost:${PORT}/admin`);
  console.log(`📋  Contacts stored  → ${path.join(__dirname, 'data', 'contacts.json')}`);
  console.log(`⏹   Stop with: npm stop\n`);
});

async function shutdown(signal) {
  console.log(`\n⏹  ${signal} received — shutting down…`);
  await scraperShutdown();
  server.close(() => {
    console.log('👋  Server stopped.\n');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
