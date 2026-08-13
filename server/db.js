const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT_DB = {
  project: {
    architecturePdf: null, // { path, originalName, uploadedAt }
    notebookPdf: null
  },
  folders: [], // { id, name, photo, createdAt, updatedAt }
  items: [] // { id, folderId, name, photo, price, measurements, link, store, notes, createdAt, updatedAt }
};

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DB, ...parsed, project: { ...DEFAULT_DB.project, ...(parsed.project || {}) } };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

module.exports = { readDB, writeDB, DB_PATH };
