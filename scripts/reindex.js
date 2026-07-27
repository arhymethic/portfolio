#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const contacts    = require('../lib/contacts');
const { embed, buildTextBlob } = require('../lib/embeddings');
const vectorStore = require('../lib/vectorStore');

(async () => {
  console.log('\n📦  Reindex: reading contacts.json…');
  const all = await contacts.readAll();

  if (all.length === 0) {
    console.log('⚠   No contacts found. Capture some contacts first, then reindex.');
    process.exit(0);
  }

  console.log(`📋  Found ${all.length} contact(s). Embedding…\n`);

  let ok = 0, failed = 0;

  for (const contact of all) {
    try {
      const blob   = buildTextBlob(contact);
      const vector = await embed(blob);
      await vectorStore.upsert(contact.id, vector, contact);
      console.log(`  ✅  ${contact.name} (${contact.id})`);
      ok++;
    } catch (err) {
      console.error(`  ❌  ${contact.name} (${contact.id}): ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🏁  Done — ${ok} embedded, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
