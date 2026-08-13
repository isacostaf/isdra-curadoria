const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, normalizeCode } = require('./auth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const MIGRATION_NOTE_PATH = path.join(DATA_DIR, 'MIGRATION_CREDENTIALS.txt');

const DEFAULT_DB = {
  projects: [], // { id, name, code, codeNormalized, passwordSalt, passwordHash, architecturePdf, notebookPdf, createdAt }
  folders: [], // { id, projectId, name, photo, createdAt, updatedAt }
  items: [] // { id, projectId, folderId, name, photo, price, measurements, link, store, notes, createdAt, updatedAt }
};

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return;
  }
  migrateLegacyIfNeeded();
}

// Older versions of this app stored a single global project (no code/password,
// no multi-project support). If we detect that shape, wrap the existing data
// into a brand-new project so nothing gets lost, and generate credentials for it.
function migrateLegacyIfNeeded() {
  let raw;
  try {
    raw = fs.readFileSync(DB_PATH, 'utf-8');
  } catch (e) {
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return;
  }
  if (parsed.projects) return; // already migrated / current shape

  const legacyProject = parsed.project || {};
  const legacyFolders = Array.isArray(parsed.folders) ? parsed.folders : [];
  const legacyItems = Array.isArray(parsed.items) ? parsed.items : [];

  const projectId = crypto.randomUUID();
  const code = `ISDRA-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const password = crypto.randomBytes(4).toString('hex');
  const { salt, hash } = hashPassword(password);

  const project = {
    id: projectId,
    name: 'Meu projeto',
    code,
    codeNormalized: normalizeCode(code),
    passwordSalt: salt,
    passwordHash: hash,
    architecturePdf: legacyProject.architecturePdf || null,
    notebookPdf: legacyProject.notebookPdf || null,
    createdAt: new Date().toISOString()
  };

  const migrated = {
    projects: [project],
    folders: legacyFolders.map((f) => ({ ...f, projectId })),
    items: legacyItems.map((i) => ({ ...i, projectId }))
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2));
  fs.writeFileSync(
    MIGRATION_NOTE_PATH,
    `Seus dados antigos foram migrados automaticamente para um projeto novo.\n\n` +
      `Código do projeto: ${code}\n` +
      `Senha:             ${password}\n\n` +
      `Guarde essas credenciais para acessar suas pastas — use-as na tela de entrada do ISDRA.\n`
  );
  // eslint-disable-next-line no-console
  console.log('\n⚠️  Dados antigos migrados para um novo projeto com acesso por código + senha.');
  console.log(`   Código: ${code}`);
  console.log(`   Senha:  ${password}`);
  console.log(`   (também salvo em data/MIGRATION_CREDENTIALS.txt)\n`);
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      items: Array.isArray(parsed.items) ? parsed.items : []
    };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

module.exports = { readDB, writeDB, DB_PATH };
