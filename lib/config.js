'use strict';

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

let _cache = null;

function loadFromDisk() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  _cache = JSON.parse(raw);
  console.log('[config] loaded from disk');
  return _cache;
}

function getConfig() {
  if (!_cache) loadFromDisk();
  return _cache;
}

process.on('SIGHUP', () => {
  console.log('[config] SIGHUP received — reloading config.json');
  try {
    loadFromDisk();
  } catch (err) {
    console.error('[config] reload failed:', err.message, '— keeping old config');
  }
});

loadFromDisk();

module.exports = { getConfig };
