'use strict';

const path = require('path');
const { LocalIndex } = require('vectra');

const INDEX_DIR = path.join(__dirname, '..', 'data', 'vectors');

async function getIndex() {
  const index = new LocalIndex(INDEX_DIR);
  if (!await index.isIndexCreated()) {
    await index.createIndex();
    console.log('[vector] index created at', INDEX_DIR);
  }
  return index;
}

async function upsert(id, vector, metadata) {
  const index = await getIndex();
  await index.upsertItem({
    id,
    vector,
    metadata: {
      id,
      name:      metadata.name      || '',
      role:      metadata.role      || '',
      instagram: metadata.instagram || '',
      linkedin:  metadata.linkedin  || '',
      whereMet:  metadata.whereMet  || '',
      timestamp: metadata.timestamp || new Date().toISOString(),
    }
  });
}

async function search(queryVector, topK = 5) {
  const index = await getIndex();
  const results = await index.queryItems(queryVector, undefined, topK);
  return results.map(r => ({
    id:       r.item.id,
    score:    r.score,
    metadata: r.item.metadata,
  }));
}

async function remove(id) {
  const index = await getIndex();
  try {
    await index.deleteItem(id);
  } catch {
    // item didn't exist — fine
  }
}

module.exports = { upsert, search, remove };
