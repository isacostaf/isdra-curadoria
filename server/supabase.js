const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Faltam variáveis de ambiente do Supabase. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja .env.example).'
  );
}

// Service-role client — só roda no servidor, nunca é exposto ao navegador.
// Ele ignora Row Level Security de propósito (é assim que o backend
// consegue ler/escrever mesmo com RLS ligado nas tabelas).
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});

const UPLOADS_BUCKET = 'uploads';

function publicUrlFor(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadBuffer(path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Falha ao enviar arquivo para o Supabase Storage: ${error.message}`);
  return path;
}

async function removeFile(path) {
  if (!path) return;
  await supabase.storage.from(UPLOADS_BUCKET).remove([path]);
}

module.exports = { supabase, UPLOADS_BUCKET, publicUrlFor, uploadBuffer, removeFile };
