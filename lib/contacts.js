'use strict';

const fs      = require('fs').promises;
const path    = require('path');
const { Mutex } = require('async-mutex');

const DATA_DIR   = path.join(__dirname, '..', 'data');
const DATA_PATH  = path.join(DATA_DIR, 'contacts.json');
const writeMutex = new Mutex();

async function readAll() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function append(contact) {
  return writeMutex.runExclusive(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const contacts = await readAll();
    contacts.push(contact);
    await fs.writeFile(DATA_PATH, JSON.stringify(contacts, null, 2), 'utf8');
    return contact;
  });
}

async function updateById(id, fields) {
  return writeMutex.runExclusive(async () => {
    const contacts = await readAll();
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) return null;
    contacts[idx] = { ...contacts[idx], ...fields };
    await fs.writeFile(DATA_PATH, JSON.stringify(contacts, null, 2), 'utf8');
    return contacts[idx];
  });
}

async function deleteById(id) {
  return writeMutex.runExclusive(async () => {
    const contacts = await readAll();
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    contacts.splice(idx, 1);
    await fs.writeFile(DATA_PATH, JSON.stringify(contacts, null, 2), 'utf8');
    return true;
  });
}

module.exports = { readAll, append, updateById, deleteById };
