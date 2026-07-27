'use strict';

const express     = require('express');
const fs          = require('fs');
const path        = require('path');
const router      = express.Router();
const { getConfig }   = require('../lib/config');
const contacts        = require('../lib/contacts');
const { embed, buildTextBlob } = require('../lib/embeddings');
const vectorStore     = require('../lib/vectorStore');
const { enrichContact } = require('../lib/scraper');
const { captureLimiter } = require('../middleware/rateLimits');
const validateCapture    = require('../middleware/validateCapture');

const PROJECTS_PATH = path.join(__dirname, '..', 'data', 'projects.json');

router.get('/config', (_req, res) => {
  const config = getConfig();

  let projects = [];
  try {
    if (fs.existsSync(PROJECTS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8'));
      projects = Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* return empty array */ }

  const { name, initials, tagline, photo, socials, meta, theme, ui } = config;
  res.json({ name, initials, tagline, photo, projects, socials, meta, theme, ui });
});

router.post('/capture', captureLimiter, validateCapture, async (req, res, next) => {
  try {
    const config = getConfig();
    const data   = req.captureData;

    const contact = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...data,
    };

    await contacts.append(contact);
    console.log(`[capture] ${contact.timestamp} — ${contact.name} (ig: ${contact.instagram || '-'}, li: ${contact.linkedin || '-'})`);

    const waMessage = encodeURIComponent(config.whatsapp.message);
    const waUrl     = `https://wa.me/${config.whatsapp.number}?text=${waMessage}`;
    res.json({ success: true, whatsappUrl: waUrl });

    setImmediate(async () => {
      try {
        const blob   = buildTextBlob(contact);
        const vector = await embed(blob);
        await vectorStore.upsert(contact.id, vector, contact);
        console.log(`[capture] embedded → ${contact.id}`);
      } catch (err) {
        console.warn('[capture] initial embed failed:', err.message);
      }

      if (contact.instagram || contact.linkedin) {
        enrichContact(contact.id, contact.instagram, contact.linkedin);
      }
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
