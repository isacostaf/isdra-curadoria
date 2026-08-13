// Migração única: lê data/db.json + uploads/ (armazenamento local antigo)
// e envia tudo para o Supabase (tabelas + Storage), preservando os IDs
// para as relações (project_id, folder_id) continuarem batendo.
//
// Rode com:  npm run migrate:supabase
// Precisa do .env preenchido (veja .env.example) e do schema.sql já
// aplicado no seu projeto Supabase.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../server/supabase');
const { normalizeCode } = require('../server/auth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const BUCKET = 'uploads';

function readLocalFile(category, filename) {
  if (!filename) return null;
  const p = path.join(UPLOADS_ROOT, category, filename);
  if (!fs.existsSync(p)) {
    console.warn(`  ⚠️  arquivo não encontrado localmente, pulando: ${category}/${filename}`);
    return null;
  }
  return fs.readFileSync(p);
}

function guessContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };
  return map[ext] || 'application/octet-stream';
}

async function uploadIfNeeded(category, filename) {
  const buffer = readLocalFile(category, filename);
  if (!buffer) return null;
  const objectPath = `${category}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: guessContentType(filename),
    upsert: true
  });
  if (error) {
    console.error(`  ❌ falha ao subir ${objectPath}: ${error.message}`);
    return null;
  }
  console.log(`  ✓ enviado: ${objectPath}`);
  return objectPath;
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('Nada para migrar: data/db.json não existe.');
    return;
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const projects = db.projects || [];
  if (!projects.length) {
    console.log('Nada para migrar: nenhum projeto encontrado em data/db.json.');
    return;
  }

  for (const project of projects) {
    const code = normalizeCode(project.codeNormalized || project.code);
    console.log(`\n📁 Projeto (código: ${code})`);

    let architecturePdf = null;
    if (project.architecturePdf?.filename) {
      const objectPath = await uploadIfNeeded('project', project.architecturePdf.filename);
      if (objectPath) architecturePdf = { path: objectPath, originalName: project.architecturePdf.originalName };
    }
    let notebookPdf = null;
    if (project.notebookPdf?.filename) {
      const objectPath = await uploadIfNeeded('project', project.notebookPdf.filename);
      if (objectPath) notebookPdf = { path: objectPath, originalName: project.notebookPdf.originalName };
    }

    const { error: projectError } = await supabase.from('projects').upsert({
      id: project.id,
      code,
      password_salt: project.passwordSalt,
      password_hash: project.passwordHash,
      architecture_pdf: architecturePdf,
      notebook_pdf: notebookPdf
    });
    if (projectError) {
      console.error(`  ❌ falha ao gravar projeto: ${projectError.message}`);
      continue;
    }
    console.log('  ✓ projeto gravado no Supabase');

    const folders = (db.folders || []).filter((f) => f.projectId === project.id);
    for (const folder of folders) {
      const objectPath = await uploadIfNeeded('folders', folder.photo);
      const { error } = await supabase.from('folders').upsert({
        id: folder.id,
        project_id: project.id,
        name: folder.name,
        photo_path: objectPath || `folders/${folder.photo}`
      });
      if (error) console.error(`  ❌ falha na pasta "${folder.name}": ${error.message}`);
      else console.log(`  ✓ pasta "${folder.name}"`);
    }

    const items = (db.items || []).filter((i) => i.projectId === project.id);
    for (const item of items) {
      const objectPath = item.photo ? await uploadIfNeeded('items', item.photo) : null;
      const { error } = await supabase.from('items').upsert({
        id: item.id,
        project_id: project.id,
        folder_id: item.folderId,
        name: item.name || '',
        photo_path: objectPath,
        price: item.price,
        measurements: item.measurements || '',
        link: item.link,
        store: item.store || '',
        notes: item.notes || ''
      });
      if (error) console.error(`  ❌ falha no item "${item.name || item.link}": ${error.message}`);
      else console.log(`  ✓ item "${item.name || item.link}"`);
    }
  }

  console.log('\n✅ Migração concluída. Confira os dados no painel do Supabase antes de apagar os arquivos locais.');
}

main().catch((err) => {
  console.error('\n❌ Migração falhou:', err.message);
  process.exit(1);
});
