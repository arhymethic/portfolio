'use strict';

const express     = require('express');
const path        = require('path');
const router      = express.Router();
const basicAuth   = require('../middleware/auth');
const contacts    = require('../lib/contacts');
const { embed, buildTextBlob } = require('../lib/embeddings');
const vectorStore = require('../lib/vectorStore');

router.use(basicAuth);
router.use(express.static(path.join(__dirname, '..', 'public', 'admin'), { etag: false, lastModified: false }));

router.get('/contacts', async (_req, res, next) => {
  try {
    const all = await contacts.readAll();
    res.json(all);
  } catch (err) {
    next(err);
  }
});

router.post('/search', async (req, res, next) => {
  try {
    const query = req.body?.query;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'query is required.' });
    }
    if (query.trim().length > 500) {
      return res.status(400).json({ error: 'query is too long.' });
    }

    const topK = Math.min(parseInt(req.body?.topK) || 5, 20);
    const queryVector = await embed(query.trim());
    const hits        = await vectorStore.search(queryVector, topK);

    const allContacts = await contacts.readAll();
    const contactMap  = new Map(allContacts.map(c => [c.id, c]));

    const results = hits
      .map(hit => ({
        score:   Math.round(hit.score * 1000) / 1000,
        contact: contactMap.get(hit.id) || { id: hit.id, ...hit.metadata },
      }))
      .filter(r => r.contact);

    res.json({ query, results });
  } catch (err) {
    next(err);
  }
});

router.post('/enrich-all', async (req, res, next) => {
  try {
    const all = await contacts.readAll();
    const toEnrich = all.filter(c => c.instagram || c.linkedin);
    const { enrichContact } = require('../lib/scraper');
    for (const contact of toEnrich) {
      enrichContact(contact.id, contact.instagram, contact.linkedin);
    }
    res.json({ success: true, message: `Enrichment started in background for ${toEnrich.length} contact(s).` });
  } catch (err) {
    next(err);
  }
});

router.post('/contacts/:id/notes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const notes = req.body?.notes;

    const updated = await contacts.updateById(id, { notes: notes || '' });
    if (!updated) return res.status(404).json({ error: 'Contact not found.' });

    const blob   = buildTextBlob(updated);
    const vector = await embed(blob);
    await vectorStore.upsert(id, vector, updated);

    res.json({ success: true, contact: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/contacts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await contacts.deleteById(id);
    if (!deleted) return res.status(404).json({ error: 'Contact not found.' });
    await vectorStore.remove(id);
    res.json({ success: true, message: 'Contact deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
