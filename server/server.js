const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { readDB, writeDB } = require('./db');
const { normalizeCode, hashPassword, verifyPassword } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3210;

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const DIRS = {
  project: path.join(UPLOADS_ROOT, 'project'),
  folders: path.join(UPLOADS_ROOT, 'folders'),
  items: path.join(UPLOADS_ROOT, 'items')
};
Object.values(DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }));

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_ROOT));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================
// SESSIONS
// In-memory only: tokens are simple opaque IDs mapped to a projectId.
// A server restart signs everyone out — they just re-enter their
// project's code + password, which is the intended flow (shared
// access per project, not per-person accounts).
// ============================================================
const sessions = new Map(); // token -> { projectId, createdAt }

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token && sessions.get(token);
  if (!session) return res.status(401).json({ error: 'Sessão expirada. Entre novamente com o código e a senha do projeto.' });
  req.token = token;
  req.projectId = session.projectId;
  next();
}

function publicProject(p) {
  return { id: p.id, name: p.name, code: p.code };
}

// ---------- Multer setup ----------
function makeStorage(destKey) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRS[destKey]),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  });
}

const imageFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error('Arquivo precisa ser uma imagem (jpg, png, webp...).'));
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') return cb(null, true);
  cb(new Error('Arquivo precisa ser um PDF.'));
};

const uploadFolderPhoto = multer({
  storage: makeStorage('folders'),
  fileFilter: imageFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
});
const uploadItemPhoto = multer({
  storage: makeStorage('items'),
  fileFilter: imageFilter,
  limits: { fileSize: 15 * 1024 * 1024 }
});
const uploadProjectPdf = multer({
  storage: makeStorage('project'),
  fileFilter: pdfFilter,
  limits: { fileSize: 80 * 1024 * 1024 }
});

function publicUrl(destKey, filename) {
  if (!filename) return null;
  return `/uploads/${destKey}/${filename}`;
}

function removeFileIfExists(destKey, filename) {
  if (!filename) return;
  const p = path.join(DIRS[destKey], filename);
  fs.unlink(p, () => {});
}

function normalizeLink(link) {
  if (!link) return '';
  const trimmed = link.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

// ============================================================
// AUTH — cada projeto tem seu próprio código + senha
// ============================================================
app.post('/api/auth/register', (req, res) => {
  const name = (req.body.name || '').trim();
  const code = (req.body.code || '').trim();
  const password = req.body.password || '';
  const codeNormalized = normalizeCode(code);

  if (!name) return res.status(400).json({ error: 'Dê um nome para o projeto.' });
  if (!codeNormalized) return res.status(400).json({ error: 'Escolha um código para o projeto.' });
  if (password.length < 4) return res.status(400).json({ error: 'A senha precisa ter pelo menos 4 caracteres.' });

  const db = readDB();
  if (db.projects.some((p) => p.codeNormalized === codeNormalized)) {
    return res.status(409).json({ error: 'Esse código já está em uso. Escolha outro.' });
  }

  const { salt, hash } = hashPassword(password);
  const project = {
    id: crypto.randomUUID(),
    name,
    code,
    codeNormalized,
    passwordSalt: salt,
    passwordHash: hash,
    architecturePdf: null,
    notebookPdf: null,
    createdAt: new Date().toISOString()
  };
  db.projects.push(project);
  writeDB(db);

  const token = crypto.randomUUID();
  sessions.set(token, { projectId: project.id, createdAt: Date.now() });
  res.status(201).json({ token, project: publicProject(project) });
});

app.post('/api/auth/login', (req, res) => {
  const codeNormalized = normalizeCode(req.body.code);
  const password = req.body.password || '';
  const db = readDB();
  const project = db.projects.find((p) => p.codeNormalized === codeNormalized);
  if (!project || !verifyPassword(password, project.passwordSalt, project.passwordHash)) {
    return res.status(401).json({ error: 'Código ou senha incorretos.' });
  }
  const token = crypto.randomUUID();
  sessions.set(token, { projectId: project.id, createdAt: Date.now() });
  res.json({ token, project: publicProject(project) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const db = readDB();
  const project = db.projects.find((p) => p.id === req.projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({ project: publicProject(project) });
});

// everything below this line is scoped to the authenticated project
app.use(['/api/project', '/api/folders', '/api/items'], requireAuth);

// ============================================================
// PROJECT (architecture PDF + furniture notebook PDF)
// ============================================================
app.get('/api/project', (req, res) => {
  const db = readDB();
  const project = db.projects.find((p) => p.id === req.projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({
    name: project.name,
    code: project.code,
    architecturePdf: project.architecturePdf
      ? { ...project.architecturePdf, url: publicUrl('project', project.architecturePdf.filename) }
      : null,
    notebookPdf: project.notebookPdf
      ? { ...project.notebookPdf, url: publicUrl('project', project.notebookPdf.filename) }
      : null
  });
});

function handleProjectUpload(field) {
  return (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo PDF enviado.' });
    const db = readDB();
    const project = db.projects.find((p) => p.id === req.projectId);
    if (!project) {
      removeFileIfExists('project', req.file.filename);
      return res.status(404).json({ error: 'Projeto não encontrado.' });
    }
    const old = project[field];
    project[field] = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString()
    };
    writeDB(db);
    if (old && old.filename) removeFileIfExists('project', old.filename);
    res.json({
      ...project[field],
      url: publicUrl('project', project[field].filename)
    });
  };
}

app.post('/api/project/architecture', uploadProjectPdf.single('file'), handleProjectUpload('architecturePdf'));
app.post('/api/project/notebook', uploadProjectPdf.single('file'), handleProjectUpload('notebookPdf'));

function handleProjectDelete(field) {
  return (req, res) => {
    const db = readDB();
    const project = db.projects.find((p) => p.id === req.projectId);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
    const old = project[field];
    if (old && old.filename) removeFileIfExists('project', old.filename);
    project[field] = null;
    writeDB(db);
    res.json({ ok: true });
  };
}
app.delete('/api/project/architecture', handleProjectDelete('architecturePdf'));
app.delete('/api/project/notebook', handleProjectDelete('notebookPdf'));

// ============================================================
// FOLDERS
// ============================================================
function folderPayload(folder, items) {
  const folderItems = items.filter((i) => i.folderId === folder.id);
  return {
    ...folder,
    photoUrl: publicUrl('folders', folder.photo),
    itemCount: folderItems.length
  };
}

app.get('/api/folders', (req, res) => {
  const db = readDB();
  const sorted = db.folders
    .filter((f) => f.projectId === req.projectId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  res.json(sorted.map((f) => folderPayload(f, db.items)));
});

app.get('/api/folders/:id', (req, res) => {
  const db = readDB();
  const folder = db.folders.find((f) => f.id === req.params.id && f.projectId === req.projectId);
  if (!folder) return res.status(404).json({ error: 'Pasta não encontrada.' });
  res.json(folderPayload(folder, db.items));
});

app.post('/api/folders', uploadFolderPhoto.single('photo'), (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    if (req.file) removeFileIfExists('folders', req.file.filename);
    return res.status(400).json({ error: 'O nome da pasta é obrigatório.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'A foto da pasta é obrigatória.' });
  }
  const db = readDB();
  const now = new Date().toISOString();
  const folder = {
    id: crypto.randomUUID(),
    projectId: req.projectId,
    name,
    photo: req.file.filename,
    createdAt: now,
    updatedAt: now
  };
  db.folders.push(folder);
  writeDB(db);
  res.status(201).json(folderPayload(folder, db.items));
});

app.put('/api/folders/:id', uploadFolderPhoto.single('photo'), (req, res) => {
  const db = readDB();
  const folder = db.folders.find((f) => f.id === req.params.id && f.projectId === req.projectId);
  if (!folder) {
    if (req.file) removeFileIfExists('folders', req.file.filename);
    return res.status(404).json({ error: 'Pasta não encontrada.' });
  }
  const name = (req.body.name || '').trim();
  if (name) folder.name = name;
  if (req.file) {
    const oldPhoto = folder.photo;
    folder.photo = req.file.filename;
    removeFileIfExists('folders', oldPhoto);
  }
  folder.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(folderPayload(folder, db.items));
});

app.delete('/api/folders/:id', (req, res) => {
  const db = readDB();
  const idx = db.folders.findIndex((f) => f.id === req.params.id && f.projectId === req.projectId);
  if (idx === -1) return res.status(404).json({ error: 'Pasta não encontrada.' });
  const [folder] = db.folders.splice(idx, 1);
  removeFileIfExists('folders', folder.photo);
  const remainingItems = [];
  for (const item of db.items) {
    if (item.folderId === folder.id) {
      removeFileIfExists('items', item.photo);
    } else {
      remainingItems.push(item);
    }
  }
  db.items = remainingItems;
  writeDB(db);
  res.json({ ok: true });
});

// ============================================================
// ITEMS
// ============================================================
function itemPayload(item) {
  return { ...item, photoUrl: publicUrl('items', item.photo) };
}

app.get('/api/folders/:id/items', (req, res) => {
  const db = readDB();
  const folder = db.folders.find((f) => f.id === req.params.id && f.projectId === req.projectId);
  if (!folder) return res.status(404).json({ error: 'Pasta não encontrada.' });
  const items = db.items
    .filter((i) => i.folderId === folder.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items.map(itemPayload));
});

app.post('/api/folders/:id/items', uploadItemPhoto.single('photo'), (req, res) => {
  const db = readDB();
  const folder = db.folders.find((f) => f.id === req.params.id && f.projectId === req.projectId);
  if (!folder) {
    if (req.file) removeFileIfExists('items', req.file.filename);
    return res.status(404).json({ error: 'Pasta não encontrada.' });
  }
  const link = normalizeLink(req.body.link);
  if (!link) {
    if (req.file) removeFileIfExists('items', req.file.filename);
    return res.status(400).json({ error: 'O link do produto é obrigatório.' });
  }
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    projectId: req.projectId,
    folderId: folder.id,
    name: (req.body.name || '').trim(),
    photo: req.file ? req.file.filename : null,
    price: req.body.price ? Number(req.body.price) : null,
    measurements: (req.body.measurements || '').trim(),
    link,
    store: (req.body.store || '').trim(),
    notes: (req.body.notes || '').trim(),
    createdAt: now,
    updatedAt: now
  };
  db.items.push(item);
  writeDB(db);
  res.status(201).json(itemPayload(item));
});

app.get('/api/items/:id', (req, res) => {
  const db = readDB();
  const item = db.items.find((i) => i.id === req.params.id && i.projectId === req.projectId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
  res.json(itemPayload(item));
});

app.put('/api/items/:id', uploadItemPhoto.single('photo'), (req, res) => {
  const db = readDB();
  const item = db.items.find((i) => i.id === req.params.id && i.projectId === req.projectId);
  if (!item) {
    if (req.file) removeFileIfExists('items', req.file.filename);
    return res.status(404).json({ error: 'Item não encontrado.' });
  }
  if (req.body.link !== undefined) {
    const link = normalizeLink(req.body.link);
    if (!link) {
      if (req.file) removeFileIfExists('items', req.file.filename);
      return res.status(400).json({ error: 'O link do produto é obrigatório.' });
    }
    item.link = link;
  }
  if (req.body.name !== undefined) item.name = req.body.name.trim();
  if (req.body.price !== undefined) item.price = req.body.price === '' ? null : Number(req.body.price);
  if (req.body.measurements !== undefined) item.measurements = req.body.measurements.trim();
  if (req.body.store !== undefined) item.store = req.body.store.trim();
  if (req.body.notes !== undefined) item.notes = req.body.notes.trim();
  if (req.body.removePhoto === 'true' && !req.file) {
    removeFileIfExists('items', item.photo);
    item.photo = null;
  }
  if (req.file) {
    removeFileIfExists('items', item.photo);
    item.photo = req.file.filename;
  }
  item.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json(itemPayload(item));
});

app.delete('/api/items/:id', (req, res) => {
  const db = readDB();
  const idx = db.items.findIndex((i) => i.id === req.params.id && i.projectId === req.projectId);
  if (idx === -1) return res.status(404).json({ error: 'Item não encontrado.' });
  const [item] = db.items.splice(idx, 1);
  removeFileIfExists('items', item.photo);
  writeDB(db);
  res.json({ ok: true });
});

// ---------- Error handling ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || 'Erro ao processar a requisição.' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`\n  ISDRA rodando em http://localhost:${PORT}\n`);
});
