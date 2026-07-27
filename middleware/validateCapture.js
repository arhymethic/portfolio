'use strict';

const MAX_LEN = 500;

function stripTags(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .trim();
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return stripTags(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractUsername(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();
  s = s.replace(/^https?:\/\/(www\.)?(linkedin\.com\/in\/|instagram\.com\/)?/i, '');
  s = s.replace(/\/$/, '').replace(/^@/, '');
  return s;
}

function validateCapture(req, res, next) {
  const { name, email, instagram, linkedin, role, whereMet } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const fields = { name, email, instagram, linkedin, role, whereMet };
  for (const [key, val] of Object.entries(fields)) {
    if (val && typeof val === 'string' && val.trim().length > MAX_LEN) {
      return res.status(400).json({ error: `Field "${key}" exceeds maximum length of ${MAX_LEN} characters.` });
    }
  }

  req.captureData = {
    name:      sanitize(name),
    email:     sanitize(email),
    instagram: sanitize(extractUsername(instagram)),
    linkedin:  sanitize(extractUsername(linkedin)),
    role:      sanitize(role),
    whereMet:  sanitize(whereMet),
  };

  next();
}

module.exports = validateCapture;
