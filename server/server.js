require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const {
  normalizeCode,
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken
} = require('./auth');
const store = require('./store');

const app = express();
const PORT = process.env.PORT || 3210;

app.use(express.json());
// process.cwd() (não __dirname) por recomendação do Vercel para
// Serverless Functions — é mais confiável dentro do bundle da função.
app.use(express.static(path.join(process.cwd(), 'public')));

// ============================================================
// AUTH MIDDLEWARE
// Sessão = um JWT assinado contendo o projectId. Sem estado no
// servidor, então funciona igual em qualquer instância serverless.
// ============================================================
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifySessionToken(token);
  if (!payload) return res.status(401).json({ error: 'Sessão expirada. Entre novamente com o código e a senha do projeto.' });
  req.projectId = payload.projectId;
  next();
}

// ---------- Multer (memória — os arquivos vão direto pro Supabase Storage) ----------
const imageFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error('Arquivo precisa ser uma imagem (jpg, png, webp...).'));
};
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') return cb(null, true);
  cb(new Error('Arquivo precisa ser um PDF.'));
};
const uploadFolderPhoto = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: 15 * 1024 * 1024 } });
const uploadItemPhoto = multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: 15 * 1024 * 1024 } });
const uploadProjectPdf = multer({ storage: multer.memoryStorage(), fileFilter: pdfFilter, limits: { fileSize: 80 * 1024 * 1024 } });

function storagePath(category, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${category}/${crypto.randomUUID()}${ext}`;
}

function normalizeLink(link) {
  if (!link) return '';
  const trimmed = link.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function asyncRoute(fn) {
  return (req, res) => fn(req, res).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: err.message || 'Erro interno.' });
  });
}

// ============================================================
// AUTH — cada projeto tem seu próprio código + senha
// ============================================================
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const code = normalizeCode(req.body.code);
  const password = req.body.password || '';

  if (!code) return res.status(400).json({ error: 'Escolha um código para o projeto.' });
  if (password.length < 4) return res.status(400).json({ error: 'A senha precisa ter pelo menos 4 caracteres.' });

  const existing = await store.findProjectByCode(code);
  if (existing) return res.status(409).json({ error: 'Esse código já está em uso. Escolha outro.' });

  const { salt, hash } = hashPassword(password);
  const project = await store.createProject({ code, passwordSalt: salt, passwordHash: hash });

  const token = signSessionToken(project.id);
  res.status(201).json({ token, project: store.publicProject(project) });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const code = normalizeCode(req.body.code);
  const password = req.body.password || '';
  const project = await store.findProjectByCode(code);
  if (!project || !verifyPassword(password, project.password_salt, project.password_hash)) {
    return res.status(401).json({ error: 'Código ou senha incorretos.' });
  }
  const token = signSessionToken(project.id);
  res.json({ token, project: store.publicProject(project) });
}));

app.post('/api/auth/logout', requireAuth, (req, res) => {
  // Tokens são stateless (JWT) — "sair" é só o app apagar o token dele.
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const project = await store.findProjectById(req.projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({ project: store.publicProject(project) });
}));

// everything below this line is scoped to the authenticated project
app.use(['/api/project', '/api/folders', '/api/items'], requireAuth);

// ============================================================
// PROJECT (architecture PDF + furniture notebook PDF)
// ============================================================
app.get('/api/project', asyncRoute(async (req, res) => {
  const project = await store.findProjectById(req.projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({
    name: project.name,
    code: project.code,
    architecturePdf: store.projectPdfPayload(project, 'architecturePdf'),
    notebookPdf: store.projectPdfPayload(project, 'notebookPdf')
  });
}));

function handleProjectUpload(field) {
  return asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo PDF enviado.' });
    const project = await store.findProjectById(req.projectId);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const objectPath = storagePath('project', req.file.originalname);
    await store.uploadBuffer(objectPath, req.file.buffer, req.file.mimetype);

    const value = { path: objectPath, originalName: req.file.originalname };
    const updated = await store.updateProjectPdf(req.projectId, field, value);

    const old = project[field === 'architecturePdf' ? 'architecture_pdf' : 'notebook_pdf'];
    if (old && old.path) store.removeFile(old.path);

    res.json(store.projectPdfPayload(updated, field));
  });
}
app.post('/api/project/architecture', uploadProjectPdf.single('file'), handleProjectUpload('architecturePdf'));
app.post('/api/project/notebook', uploadProjectPdf.single('file'), handleProjectUpload('notebookPdf'));

function handleProjectDelete(field) {
  return asyncRoute(async (req, res) => {
    const project = await store.findProjectById(req.projectId);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
    const old = project[field === 'architecturePdf' ? 'architecture_pdf' : 'notebook_pdf'];
    if (old && old.path) store.removeFile(old.path);
    await store.updateProjectPdf(req.projectId, field, null);
    res.json({ ok: true });
  });
}
app.delete('/api/project/architecture', handleProjectDelete('architecturePdf'));
app.delete('/api/project/notebook', handleProjectDelete('notebookPdf'));

// ============================================================
// FOLDERS
// ============================================================
app.get('/api/folders', asyncRoute(async (req, res) => {
  const [folders, counts] = await Promise.all([store.listFolders(req.projectId), store.countItemsByFolder(req.projectId)]);
  res.json(folders.map((f) => store.folderPayload(f, counts[f.id])));
}));

app.get('/api/folders/:id', asyncRoute(async (req, res) => {
  const folder = await store.findFolder(req.params.id, req.projectId);
  if (!folder) return res.status(404).json({ error: 'Pasta não encontrada.' });
  const counts = await store.countItemsByFolder(req.projectId);
  res.json(store.folderPayload(folder, counts[folder.id]));
}));

app.post('/api/folders', uploadFolderPhoto.single('photo'), asyncRoute(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'O nome da pasta é obrigatório.' });
  if (!req.file) return res.status(400).json({ error: 'A foto da pasta é obrigatória.' });

  const objectPath = storagePath('folders', req.file.originalname);
  await store.uploadBuffer(objectPath, req.file.buffer, req.file.mimetype);

  const folder = await store.createFolder({ projectId: req.projectId, name, photoPath: objectPath });
  res.status(201).json(store.folderPayload(folder, 0));
}));

app.put('/api/folders/:id', uploadFolderPhoto.single('photo'), asyncRoute(async (req, res) => {
  const existing = await store.findFolder(req.params.id, req.projectId);
  if (!existing) return res.status(404).json({ error: 'Pasta não encontrada.' });

  const fields = {};
  const name = (req.body.name || '').trim();
  if (name) fields.name = name;
  if (req.file) {
    fields.photoPath = storagePath('folders', req.file.originalname);
    await store.uploadBuffer(fields.photoPath, req.file.buffer, req.file.mimetype);
  }
  const updated = await store.updateFolder(req.params.id, req.projectId, fields);
  if (req.file && existing.photo_path) store.removeFile(existing.photo_path);

  const counts = await store.countItemsByFolder(req.projectId);
  res.json(store.folderPayload(updated, counts[updated.id]));
}));

app.delete('/api/folders/:id', asyncRoute(async (req, res) => {
  const items = await store.listItems(req.params.id, req.projectId);
  const deleted = await store.deleteFolder(req.params.id, req.projectId);
  if (!deleted) return res.status(404).json({ error: 'Pasta não encontrada.' });
  if (deleted.photo_path) store.removeFile(deleted.photo_path);
  items.forEach((i) => { if (i.photo_path) store.removeFile(i.photo_path); });
  res.json({ ok: true });
}));

// ============================================================
// ITEMS
// ============================================================
app.get('/api/folders/:id/items', asyncRoute(async (req, res) => {
  const folder = await store.findFolder(req.params.id, req.projectId);
  if (!folder) return res.status(404).json({ error: 'Pasta não encontrada.' });
  const items = await store.listItems(folder.id, req.projectId);
  res.json(items.map(store.itemPayload));
}));

app.post('/api/folders/:id/items', uploadItemPhoto.single('photo'), asyncRoute(async (req, res) => {
  const folder = await store.findFolder(req.params.id, req.projectId);
  if (!folder) return res.status(404).json({ error: 'Pasta não encontrada.' });

  const link = normalizeLink(req.body.link);
  if (!link) return res.status(400).json({ error: 'O link do produto é obrigatório.' });

  let photoPath = null;
  if (req.file) {
    photoPath = storagePath('items', req.file.originalname);
    await store.uploadBuffer(photoPath, req.file.buffer, req.file.mimetype);
  }

  const item = await store.createItem({
    projectId: req.projectId,
    folderId: folder.id,
    name: (req.body.name || '').trim(),
    photoPath,
    price: req.body.price ? Number(req.body.price) : null,
    measurements: (req.body.measurements || '').trim(),
    link,
    store: (req.body.store || '').trim(),
    notes: (req.body.notes || '').trim()
  });
  res.status(201).json(store.itemPayload(item));
}));

app.get('/api/items/:id', asyncRoute(async (req, res) => {
  const item = await store.findItem(req.params.id, req.projectId);
  if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
  res.json(store.itemPayload(item));
}));

app.put('/api/items/:id', uploadItemPhoto.single('photo'), asyncRoute(async (req, res) => {
  const existing = await store.findItem(req.params.id, req.projectId);
  if (!existing) return res.status(404).json({ error: 'Item não encontrado.' });

  const fields = {};
  if (req.body.link !== undefined) {
    const link = normalizeLink(req.body.link);
    if (!link) return res.status(400).json({ error: 'O link do produto é obrigatório.' });
    fields.link = link;
  }
  if (req.body.name !== undefined) fields.name = req.body.name.trim();
  if (req.body.price !== undefined) fields.price = req.body.price === '' ? null : Number(req.body.price);
  if (req.body.measurements !== undefined) fields.measurements = req.body.measurements.trim();
  if (req.body.store !== undefined) fields.store = req.body.store.trim();
  if (req.body.notes !== undefined) fields.notes = req.body.notes.trim();

  let oldPhotoToRemove = null;
  if (req.body.removePhoto === 'true' && !req.file) {
    fields.photoPath = null;
    oldPhotoToRemove = existing.photo_path;
  }
  if (req.file) {
    fields.photoPath = storagePath('items', req.file.originalname);
    await store.uploadBuffer(fields.photoPath, req.file.buffer, req.file.mimetype);
    oldPhotoToRemove = existing.photo_path;
  }

  const updated = await store.updateItem(req.params.id, req.projectId, fields);
  if (oldPhotoToRemove) store.removeFile(oldPhotoToRemove);
  res.json(store.itemPayload(updated));
}));

app.delete('/api/items/:id', asyncRoute(async (req, res) => {
  const deleted = await store.deleteItem(req.params.id, req.projectId);
  if (!deleted) return res.status(404).json({ error: 'Item não encontrado.' });
  if (deleted.photo_path) store.removeFile(deleted.photo_path);
  res.json({ ok: true });
}));

// ---------- Error handling ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || 'Erro ao processar a requisição.' });
  }
  next();
});

// Só sobe um servidor "de verdade" fora do Vercel (localmente).
// No Vercel, api/index.js importa `app` e o runtime cuida do resto.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  ISDRA rodando em http://localhost:${PORT}\n`);
  });
}

module.exports = app;
