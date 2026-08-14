// Camada de acesso a dados — todas as consultas ao Supabase ficam
// concentradas aqui, para o server.js não precisar saber SQL/Postgrest.
const { supabase, publicUrlFor, uploadBuffer, removeFile } = require('./supabase');

function mustNot(error, message) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

// ---------------- projects ----------------
// "code" já é guardado normalizado (minúsculo, sem espaços) — é a
// própria chave de login, não existe um "nome" separado do projeto.
async function findProjectByCode(code) {
  const { data, error } = await supabase.from('projects').select('*').eq('code', code).maybeSingle();
  mustNot(error, 'Erro ao buscar projeto');
  return data;
}

async function findProjectById(id) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  mustNot(error, 'Erro ao buscar projeto');
  return data;
}

async function createProject({ code, passwordSalt, passwordHash }) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ code, password_salt: passwordSalt, password_hash: passwordHash })
    .select('*')
    .single();
  mustNot(error, 'Erro ao criar projeto');
  return data;
}

async function updateProjectPdf(projectId, field, value) {
  const column = field === 'architecturePdf' ? 'architecture_pdf' : 'notebook_pdf';
  const { data, error } = await supabase
    .from('projects')
    .update({ [column]: value })
    .eq('id', projectId)
    .select('*')
    .single();
  mustNot(error, 'Erro ao atualizar arquivo do projeto');
  return data;
}

function projectPdfPayload(project, field) {
  const column = field === 'architecturePdf' ? 'architecture_pdf' : 'notebook_pdf';
  const info = project[column];
  if (!info) return null;
  return { ...info, url: publicUrlFor(info.path) };
}

function publicProject(p) {
  return { id: p.id, code: p.code };
}

// ---------------- folders ----------------
const ALL_PRODUCTS_FOLDER_NAME = 'Todos os produtos';

async function listFolders(projectId) {
  await ensureAllProductsFolder(projectId);
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .order('is_all_products', { ascending: true })
    .order('name', { ascending: true });
  mustNot(error, 'Erro ao listar pastas');
  return data;
}

// Toda pasta "Todos os produtos" é o destino padrão de um produto quando
// nenhuma pasta é escolhida no formulário. Criada automaticamente no
// cadastro do projeto — e recriada aqui (self-heal) para projetos que já
// existiam antes dessa funcionalidade.
async function findAllProductsFolder(projectId) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_all_products', true)
    .maybeSingle();
  mustNot(error, 'Erro ao buscar pasta Todos os produtos');
  return data;
}

async function ensureAllProductsFolder(projectId) {
  const existing = await findAllProductsFolder(projectId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('folders')
    .insert({ project_id: projectId, name: ALL_PRODUCTS_FOLDER_NAME, photo_path: null, is_all_products: true })
    .select('*')
    .single();
  // corrida rara: outra requisição pode ter criado ao mesmo tempo — nesse
  // caso o índice único barra o insert; buscamos a que já existe.
  if (error) {
    const again = await findAllProductsFolder(projectId);
    if (again) return again;
    mustNot(error, 'Erro ao criar pasta Todos os produtos');
  }
  return data;
}

async function findFolder(id, projectId) {
  const { data, error } = await supabase.from('folders').select('*').eq('id', id).eq('project_id', projectId).maybeSingle();
  mustNot(error, 'Erro ao buscar pasta');
  return data;
}

async function createFolder({ projectId, name, photoPath }) {
  const { data, error } = await supabase
    .from('folders')
    .insert({ project_id: projectId, name, photo_path: photoPath })
    .select('*')
    .single();
  mustNot(error, 'Erro ao criar pasta');
  return data;
}

async function updateFolder(id, projectId, fields) {
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.photoPath !== undefined) patch.photo_path = fields.photoPath;
  const { data, error } = await supabase.from('folders').update(patch).eq('id', id).eq('project_id', projectId).select('*').single();
  mustNot(error, 'Erro ao atualizar pasta');
  return data;
}

async function deleteFolder(id, projectId) {
  const { data, error } = await supabase.from('folders').delete().eq('id', id).eq('project_id', projectId).select('*').maybeSingle();
  mustNot(error, 'Erro ao excluir pasta');
  return data;
}

async function countItemsByFolder(projectId) {
  const { data, error } = await supabase.from('items').select('folder_id').eq('project_id', projectId);
  mustNot(error, 'Erro ao contar itens');
  const counts = {};
  for (const row of data) counts[row.folder_id] = (counts[row.folder_id] || 0) + 1;
  return counts;
}

function folderPayload(folder, itemCount) {
  return {
    id: folder.id,
    name: folder.name,
    photo: folder.photo_path,
    photoUrl: folder.photo_path ? publicUrlFor(folder.photo_path) : null,
    itemCount: itemCount || 0,
    isAllProducts: !!folder.is_all_products
  };
}

// ---------------- items ----------------
async function listItems(folderId, projectId) {
  const { data, error } = await supabase.from('items').select('*').eq('folder_id', folderId).eq('project_id', projectId);
  mustNot(error, 'Erro ao listar itens');
  return data;
}

async function findItem(id, projectId) {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).eq('project_id', projectId).maybeSingle();
  mustNot(error, 'Erro ao buscar item');
  return data;
}

async function createItem(fields) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      project_id: fields.projectId,
      folder_id: fields.folderId,
      store_type: fields.storeType,
      photo_path: fields.photoPath || null,
      price: fields.price,
      measurements: fields.measurements || '',
      link: fields.link || null,
      store: fields.store || '',
      notes: fields.notes || ''
    })
    .select('*')
    .single();
  mustNot(error, 'Erro ao criar item');
  return data;
}

async function updateItem(id, projectId, fields) {
  const patch = {};
  if (fields.folderId !== undefined) patch.folder_id = fields.folderId;
  if (fields.storeType !== undefined) patch.store_type = fields.storeType;
  if (fields.photoPath !== undefined) patch.photo_path = fields.photoPath;
  if (fields.price !== undefined) patch.price = fields.price;
  if (fields.measurements !== undefined) patch.measurements = fields.measurements;
  if (fields.link !== undefined) patch.link = fields.link || null;
  if (fields.store !== undefined) patch.store = fields.store;
  if (fields.notes !== undefined) patch.notes = fields.notes;
  const { data, error } = await supabase.from('items').update(patch).eq('id', id).eq('project_id', projectId).select('*').single();
  mustNot(error, 'Erro ao atualizar item');
  return data;
}

async function deleteItem(id, projectId) {
  const { data, error } = await supabase.from('items').delete().eq('id', id).eq('project_id', projectId).select('*').maybeSingle();
  mustNot(error, 'Erro ao excluir item');
  return data;
}

function itemPayload(item) {
  return {
    id: item.id,
    folderId: item.folder_id,
    storeType: item.store_type,
    photo: item.photo_path,
    photoUrl: publicUrlFor(item.photo_path),
    price: item.price,
    measurements: item.measurements,
    link: item.link,
    store: item.store,
    notes: item.notes
  };
}

module.exports = {
  findProjectByCode,
  findProjectById,
  createProject,
  updateProjectPdf,
  projectPdfPayload,
  publicProject,
  listFolders,
  findFolder,
  findAllProductsFolder,
  ensureAllProductsFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  countItemsByFolder,
  folderPayload,
  listItems,
  findItem,
  createItem,
  updateItem,
  deleteItem,
  itemPayload,
  uploadBuffer,
  removeFile
};
