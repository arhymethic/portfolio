'use strict';

let _pipeline = null;
let _loading  = null;

async function getModel() {
  if (_pipeline) return _pipeline;
  if (_loading)  return _loading;

  _loading = (async () => {
    console.log('[embed] loading model Xenova/all-MiniLM-L6-v2…');
    // Dynamic import: @xenova/transformers is ESM-only
    const { pipeline } = await import('@xenova/transformers');
    _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[embed] model ready');
    return _pipeline;
  })();

  _pipeline = await _loading;
  _loading  = null;
  return _pipeline;
}

function buildTextBlob(contact) {
  const e = contact.enriched;

  const name     = (e?.linkedin?.fullName || contact.name || '').trim();
  const role     = (e?.linkedin?.headline || contact.role || '').trim();
  const company  = (e?.linkedin?.company  || '').trim();
  const location = (e?.linkedin?.location || '').trim();
  const bio      = (e?.linkedin?.about    || e?.instagram?.bio || '').trim();
  const whereMet = (contact.whereMet || '').trim();
  const ig       = (contact.instagram || '').trim();
  const li       = (contact.linkedin  || '').trim();

  const parts = [name];
  if (role)     parts.push(role);
  if (company)  parts.push(`at ${company}`);
  if (location) parts.push(location);
  if (whereMet) parts.push(`met at ${whereMet}`);
  if (bio)      parts.push(bio);
  if (ig)       parts.push(`instagram: ${ig}`);
  if (li)       parts.push(`linkedin: ${li}`);
  if (contact.notes) parts.push(`notes: ${contact.notes.trim()}`);

  return parts.join('. ');
}

async function embed(text) {
  const model  = await getModel();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

module.exports = { embed, buildTextBlob };
