#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const contacts    = require('../lib/contacts');
const { scrapeLinkedIn, scrapeInstagram, downloadAvatar, shutdown } = require('../lib/scraper');
const { embed, buildTextBlob } = require('../lib/embeddings');
const vectorStore = require('../lib/vectorStore');

(async () => {
  console.log('\n🔍  Scrape-All: Reading contacts.json…');
  const all = await contacts.readAll();

  if (all.length === 0) {
    console.log('⚠   No contacts found in contacts.json.');
    process.exit(0);
  }

  const toScrape = all.filter(c => c.instagram || c.linkedin);
  console.log(`📋  Found ${all.length} contact(s) total. ${toScrape.length} have social profiles to scrape.`);

  if (toScrape.length === 0) {
    console.log('ℹ   No contacts have social handles. Nothing to scrape.');
    process.exit(0);
  }

  console.log('🚀  Starting browser and scraping sequentially…\n');

  for (let i = 0; i < toScrape.length; i++) {
    const contact = toScrape[i];
    console.log(`[${i + 1}/${toScrape.length}] ${contact.name} (ig: ${contact.instagram || '-'}, li: ${contact.linkedin || '-'})`);

    let liData = {};
    let igData = {};
    let status = 'success';

    try {
      if (contact.linkedin)  liData = await scrapeLinkedIn(contact.linkedin);
      if (contact.instagram) igData = await scrapeInstagram(contact.instagram);
    } catch (err) {
      console.error(`  ❌ Failed:`, err.message);
      status = 'failed';
    }

    if (liData.photoUrl) {
      const localPath = await downloadAvatar(liData.photoUrl, `${contact.id}-linkedin`);
      if (localPath) liData.photoUrl = localPath;
    }
    if (igData.photoUrl) {
      const localPath = await downloadAvatar(igData.photoUrl, `${contact.id}-instagram`);
      if (localPath) igData.photoUrl = localPath;
    }

    if (!liData.headline && !igData.displayName && (contact.linkedin || contact.instagram)) {
      status = 'partial';
    }

    const enrichedFields = {
      enriched: {
        scrapedAt: new Date().toISOString(),
        status,
        linkedin:  liData,
        instagram: igData,
      }
    };

    const updated = await contacts.updateById(contact.id, enrichedFields);

    if (updated) {
      try {
        const blob   = buildTextBlob(updated);
        const vector = await embed(blob);
        await vectorStore.upsert(contact.id, vector, updated);
        console.log(`  ✅ Enriched and indexed ${contact.name}`);
      } catch (err) {
        console.error(`  ⚠  Updated but vector index failed:`, err.message);
      }
    }
    console.log('----------------------------------------------------');
  }

  console.log('\n🧹  Closing browser…');
  await shutdown();
  console.log('🏁  Done!\n');
  process.exit(0);
})();
