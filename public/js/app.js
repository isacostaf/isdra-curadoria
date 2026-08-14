// ============================================================
// ISDRA — frontend SPA (vanilla JS, sem build step)
// ============================================================

const appEl = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');

// ---------------------------------------------------------------
// icon set — thin line icons (inline SVG, matches brand style)
// ---------------------------------------------------------------
function svgIcon(path, { fill = false } = {}) {
  const attrs = fill
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg viewBox="0 0 24 24" ${attrs} xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

const ICONS = {
  sparkle: svgIcon('<path d="M12 2L13.8 9.2 21 11 13.8 12.8 12 20 10.2 12.8 3 11 10.2 9.2 12 2Z"/>', { fill: true }),
  back: svgIcon('<path d="M15 18l-6-6 6-6"/>'),
  kebab: svgIcon('<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>', { fill: true }),
  close: svgIcon('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svgIcon('<path d="M12 5v14M5 12h14"/>'),
  ruler: svgIcon('<path d="M3 20L13 4l8 16H3Z"/><path d="M8.5 20L13 11l4.5 9"/>'),
  book: svgIcon('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"/>'),
  folder: svgIcon('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>'),
  sofa: svgIcon('<path d="M6 12V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/><path d="M4 12h16v5a1 1 0 0 1-1 1h-1v2h-2v-2H8v2H6v-2H5a1 1 0 0 1-1-1v-5Z"/>'),
  image: svgIcon('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5-4 4-3-3-6 6"/>'),
  edit: svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>'),
  trash: svgIcon('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>'),
  external: svgIcon('<path d="M7 17L17 7"/><path d="M8 7h9v9"/>'),
  tag: svgIcon('<path d="M12.6 2.6l8.8 8.8a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0l-8.8-8.8A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6Z"/><circle cx="7.5" cy="7.5" r="1.3"/>'),
  rulerSmall: svgIcon('<rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7 9v3M11 9v3M15 9v3"/>'),
  store: svgIcon('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"/><path d="M9 20v-6h6v6"/>'),
  warning: svgIcon('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L2.4 18a1.8 1.8 0 0 0 1.5 2.7h16.2a1.8 1.8 0 0 0 1.5-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z"/>'),
  check: svgIcon('<path d="M4 12.5l5 5L20 6.5"/>'),
  bag: svgIcon('<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  eye: svgIcon('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  note: svgIcon('<path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4Z"/><path d="M8 9h8M8 13h5"/>'),
  arrowRight: svgIcon('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
};

document.getElementById('brand-mark').innerHTML = ICONS.sparkle;

// gradient placeholders for photo-less product tiles
const GRADIENTS = ['grad-peach', 'grad-sage', 'grad-butter', 'grad-rose'];
function gradFor(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
function fmtPrice(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function hostFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}

// ---------------------------------------------------------------
// session (per-project code + senha, kept for this browser tab only —
// closing the tab or opening a fresh one asks for the code again)
// ---------------------------------------------------------------
const SESSION_KEY = 'isdra_session';
function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function setSession(token, project) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, project }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function api(path, opts = {}) {
  const session = getSession();
  const headers = { ...(opts.headers || {}) };
  if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(path, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (res.status === 401 && session && session.token) {
    forceLogout();
    throw new Error((data && data.error) || 'Sessão expirada. Entre novamente.');
  }
  if (!res.ok) {
    const msg = (data && data.error) || `Erro (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="dotcheck">${type === 'error' ? ICONS.warning : ICONS.check}</span><span>${esc(message)}</span>`;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

// ---------------------------------------------------------------
// modal system
// ---------------------------------------------------------------
function closeModal() {
  modalRoot.innerHTML = '';
}
function openModal(innerHtml, { extraClass = '' } = {}) {
  modalRoot.innerHTML = `
    <div class="modal-overlay ${extraClass}" data-close-overlay>
      <div class="modal-sheet" data-sheet>
        <div class="modal-handle"></div>
        ${innerHtml}
      </div>
    </div>`;
  const overlay = modalRoot.querySelector('[data-close-overlay]');
  const sheet = modalRoot.querySelector('[data-sheet]');
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-close]')) closeModal();
  });
}
function openActionSheet(items) {
  // items: [{ label, icon, danger, onClick }]
  const html = `
    <div class="modal-title-row"><h2>Ações</h2><button class="modal-close" data-modal-close>${ICONS.close}</button></div>
    <div>
      ${items.map((it, idx) => `<div class="action-item ${it.danger ? 'danger' : ''}" data-act-idx="${idx}"><span class="ic">${it.icon}</span><span>${esc(it.label)}</span></div>`).join('')}
    </div>`;
  openModal(html, { extraClass: 'action-sheet' });
  modalRoot.querySelectorAll('[data-act-idx]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.getAttribute('data-act-idx'));
      closeModal();
      items[idx].onClick();
    });
  });
}

// ---------------------------------------------------------------
// router
// ---------------------------------------------------------------
function parseHash() {
  const h = location.hash.replace(/^#/, '');
  if (h.startsWith('folder/')) return { view: 'folder', id: h.slice(7) };
  return { view: 'home' };
}
window.addEventListener('hashchange', route);
document.getElementById('brand-home').addEventListener('click', () => { location.hash = ''; });

function route() {
  const r = parseHash();
  if (r.view === 'folder') renderFolderView(r.id);
  else renderHomeView();
}

// ---------------------------------------------------------------
// AUTH GATE — cada projeto tem seu próprio código + senha
// ---------------------------------------------------------------
const gateRoot = document.getElementById('gate-root');
const appShell = document.getElementById('app-shell');

function forceLogout() {
  clearSession();
  appShell.style.display = 'none';
  renderGate('login');
}

function enterApp() {
  gateRoot.innerHTML = '';
  appShell.style.display = '';
  renderTopbarProject();
  location.hash = '';
  route();
}

function renderTopbarProject() {
  const session = getSession();
  const el = document.getElementById('topbar-project');
  if (!session) { el.innerHTML = ''; return; }
  const initial = (session.project.code || '?').trim().charAt(0).toUpperCase() || '?';
  el.innerHTML = `
    <button class="topbar-project-btn" id="switch-project-btn" type="button">
      <span class="avatar">${esc(initial)}</span>
      <span>${esc(session.project.code)}</span>
    </button>`;
  document.getElementById('switch-project-btn').addEventListener('click', () => {
    openActionSheet([
      { label: 'Trocar de projeto', icon: ICONS.folder, onClick: () => forceLogout() }
    ]);
  });
}

function renderGate(initialTab, successMessage) {
  appShell.style.display = 'none';
  gateRoot.innerHTML = `
    <div class="gate-screen">
      <div class="gate-brand">
        <span class="brand-mark">${ICONS.sparkle}</span>
        <span class="brand-text">ISDRA</span>
      </div>
      <div class="gate-card">
        <div class="gate-tabs">
          <button class="gate-tab ${initialTab === 'register' ? '' : 'active'}" data-tab="login" type="button">Entrar</button>
          <button class="gate-tab ${initialTab === 'register' ? 'active' : ''}" data-tab="register" type="button">Criar projeto</button>
        </div>
        <div id="gate-tab-content"></div>
      </div>
      <p class="gate-hint">Cada projeto tem seu próprio código e senha — compartilhe os dois com quem também vai colaborar nas escolhas.</p>
    </div>`;

  gateRoot.querySelectorAll('.gate-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      gateRoot.querySelectorAll('.gate-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderGateTab(btn.getAttribute('data-tab'));
    });
  });
  renderGateTab(initialTab === 'register' ? 'register' : 'login', successMessage);
}

function renderGateTab(tab, successMessage) {
  const content = document.getElementById('gate-tab-content');
  if (tab === 'register') {
    content.innerHTML = `
      <h2 class="gate-title">Criar novo projeto</h2>
      <p class="gate-sub">Escolha um código e uma senha — quem tiver os dois vai poder ver e editar as pastas deste projeto.</p>
      ${successMessage ? `<div class="gate-success">${esc(successMessage)}</div>` : ''}
      <form id="register-form">
        <div class="field">
          <label>Código do projeto <span class="req">*</span></label>
          <input type="text" name="code" placeholder="Ex: projeto-ana-luisa" required maxlength="60" />
          <div class="field-hint">É o que as outras pessoas vão digitar pra entrar neste projeto. Use letras, números e hífens.</div>
        </div>
        <div class="field">
          <label>Senha <span class="req">*</span></label>
          <input type="password" name="password" placeholder="Mínimo 4 caracteres" required minlength="4" />
        </div>
        <div class="field-error" id="register-error" style="display:none;"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block" id="register-submit">Criar projeto e entrar</button>
        </div>
      </form>`;
    document.getElementById('register-form').addEventListener('submit', onRegisterSubmit);
  } else {
    content.innerHTML = `
      <h2 class="gate-title">Entrar no projeto</h2>
      <p class="gate-sub">Digite o código e a senha que foram compartilhados com você.</p>
      ${successMessage ? `<div class="gate-success">${esc(successMessage)}</div>` : ''}
      <form id="login-form">
        <div class="field">
          <label>Código do projeto <span class="req">*</span></label>
          <input type="text" name="code" placeholder="Ex: projeto-ana-luisa" required maxlength="60" />
        </div>
        <div class="field">
          <label>Senha <span class="req">*</span></label>
          <input type="password" name="password" placeholder="Sua senha" required />
        </div>
        <div class="field-error" id="login-error" style="display:none;"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block" id="login-submit">Entrar</button>
        </div>
      </form>`;
    document.getElementById('login-form').addEventListener('submit', onLoginSubmit);
  }
}

async function onLoginSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('login-submit');
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  try {
    const fd = new FormData(form);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: fd.get('code'), password: fd.get('password') })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível entrar.');
    setSession(data.token, data.project);
    enterApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

async function onRegisterSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('register-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('register-submit');
  btn.disabled = true;
  btn.textContent = 'Criando…';
  try {
    const fd = new FormData(form);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: fd.get('code'), password: fd.get('password') })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível criar o projeto.');
    setSession(data.token, data.project);
    enterApp();
    toast('Projeto criado! Guarde o código e a senha em um lugar seguro.');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Criar projeto e entrar';
  }
}

async function boot() {
  const session = getSession();
  if (!session || !session.token) {
    renderGate('login');
    return;
  }
  try {
    const data = await api('/api/auth/me');
    setSession(session.token, data.project);
    enterApp();
  } catch (e) {
    clearSession();
    renderGate('login');
  }
}

// ---------------------------------------------------------------
// HOME VIEW
// ---------------------------------------------------------------
async function renderHomeView() {
  appEl.innerHTML = `
    <div class="view-enter">
      <div class="hero">
        <div class="hero-title-row">
          <img src="/icon/star-icon.png" alt="" class="hero-star">
          <h1 class="hero-title">BEM VINDO,</h1>
        </div>

        <p class="hero-sub">
          Do projeto de arquitetura à última peça escolhida, organize referências, móveis e ideias de forma simples e visual.
      </div>
      <div class="doc-row">
        <button class="doc-pill" id="btn-architecture" type="button">
          <span class="doc-pill-icon">${ICONS.ruler}</span>
          <span class="doc-pill-label">Projeto de Arquitetura</span>
          <span class="doc-pill-status-dot" id="architecture-status"></span>
        </button>
        <button class="doc-pill" id="btn-notebook" type="button">
          <span class="doc-pill-icon">${ICONS.book}</span>
          <span class="doc-pill-label">Caderno de Mobiliário</span>
          <span class="doc-pill-status-dot" id="notebook-status"></span>
        </button>
      </div>

      <div class="section-head">
        <h2 class="hero-title">MINHA COLETÂNEA <span class="section-count" id="folder-count"></span></h2>
        <button class="btn btn-primary btn-sm" id="btn-new-folder">${ICONS.plus} Nova pasta</button>
      </div>
      <div class="grid" id="folders-grid">
        ${skeletonCards(6)}
      </div>
    </div>
  `;

  document.getElementById('btn-architecture').addEventListener('click', () => openProjectModal('architecturePdf'));
  document.getElementById('btn-notebook').addEventListener('click', () => openProjectModal('notebookPdf'));
  document.getElementById('btn-new-folder').addEventListener('click', () => openFolderFormModal());

  loadProjectStatus();
  loadFolders();
}

function skeletonCards(n) {
  return Array.from({ length: n }).map(() => `<div class="skel card"></div>`).join('');
}

async function loadProjectStatus() {
  try {
    const data = await api('/api/project');
    setDocStatus('architecture-status', data.architecturePdf);
    setDocStatus('notebook-status', data.notebookPdf);
  } catch (e) {
    toast('Não foi possível carregar o projeto.', 'error');
  }
}
function setDocStatus(elId, fileInfo) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.toggle('on', !!fileInfo);
  el.title = fileInfo ? fileInfo.originalName : 'Nenhum PDF adicionado';
}

async function loadFolders() {
  const grid = document.getElementById('folders-grid');
  try {
    const folders = await api('/api/folders');
    document.getElementById('folder-count').textContent = folders.length ? `(${folders.length})` : '';
    if (!folders.length) {
      grid.outerHTML = `
        <div class="empty-state" id="folders-grid-empty" style="grid-column:1/-1;">
          <div class="icon">${ICONS.folder}</div>
          <p><strong>Nenhuma pasta ainda</strong></p>
          <p>Crie pastas como "Cadeira da sala" ou "Mesa de jantar" para começar a organizar suas ideias.</p>
          <button class="btn btn-primary" id="btn-new-folder-empty">${ICONS.plus} Criar primeira pasta</button>
        </div>`;
      document.getElementById('btn-new-folder-empty').addEventListener('click', () => openFolderFormModal());
      return;
    }
    grid.innerHTML = folders.map(folderCardHtml).join('');
    folders.forEach((f) => {
      const card = grid.querySelector(`[data-folder-id="${f.id}"]`);
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-kebab]')) return;
        location.hash = `folder/${f.id}`;
      });
      card.querySelector('[data-kebab]').addEventListener('click', (e) => {
        e.stopPropagation();
        openActionSheet([
          { label: 'Editar pasta', icon: ICONS.edit, onClick: () => openFolderFormModal(f) },
          { label: 'Excluir pasta', icon: ICONS.trash, danger: true, onClick: () => confirmDeleteFolder(f) }
        ]);
      });
    });
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">${ICONS.warning}</div><p>Erro ao carregar pastas.</p></div>`;
  }
}

function folderCardHtml(f) {
  return `
    <div class="tile folder-card" data-folder-id="${f.id}">
      <img class="tile-img" src="${f.photoUrl}" alt="${esc(f.name)}" loading="lazy" />
      <button class="tile-kebab" data-kebab type="button" aria-label="Mais opções">${ICONS.kebab}</button>
      <div class="tile-panel">
        <h3 class="tile-title">${esc(f.name)}</h3>
        <div class="tile-cta">Ver pasta ${ICONS.arrowRight}</div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------
// PROJECT PDF MODAL
// ---------------------------------------------------------------
const PROJECT_META = {
  architecturePdf: { title: 'Projeto de Arquitetura', icon: ICONS.ruler, endpoint: 'architecture' },
  notebookPdf: { title: 'Caderno de Mobiliário', icon: ICONS.book, endpoint: 'notebook' }
};

async function openProjectModal(field) {
  let data;
  try {
    data = await api('/api/project');
  } catch (e) {
    return toast('Erro ao carregar arquivo.', 'error');
  }
  renderProjectModal(field, data[field]);
}

function renderProjectModal(field, fileInfo) {
  const meta = PROJECT_META[field];
  const html = `
    <div class="modal-title-row"><h2>${meta.title}</h2><button class="modal-close" data-modal-close>${ICONS.close}</button></div>
    ${fileInfo ? `
      <div class="pdf-file-row">
        <div class="icon">${ICONS.note}</div>
        <div class="info">
          <div class="name">${esc(fileInfo.originalName)}</div>
        </div>
      </div>
      <div class="pdf-frame-wrap">
        <iframe src="${fileInfo.url}" title="${esc(meta.title)}"></iframe>
      </div>
      <div class="pdf-form-actions">
        <a class="btn btn-ghost" href="${fileInfo.url}" target="_blank" rel="noopener">${ICONS.external} Abrir</a>
        <button class="btn btn-primary" id="pdf-replace-btn">Substituir PDF</button>
      </div>
      <div class="form-actions">
        <button class="btn btn-danger btn-block" id="pdf-remove-btn">${ICONS.trash} Remover arquivo</button>
      </div>
    ` : `
      <div class="pdf-frame-wrap">
        <div class="pdf-empty">
          ${meta.icon}
          <p>Nenhum PDF adicionado ainda.</p>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="pdf-replace-btn">${ICONS.plus} Adicionar PDF</button>
    `}
    <input type="file" accept="application/pdf" id="pdf-file-input" style="display:none" />
  `;
  openModal(html, { extraClass: 'pdf-modal' });

  const fileInput = document.getElementById('pdf-file-input');
  document.getElementById('pdf-replace-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files.length) return;
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    try {
      await api(`/api/project/${meta.endpoint}`, { method: 'POST', body: fd });
      toast('PDF salvo com sucesso.');
      closeModal();
      loadProjectStatus();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  const removeBtn = document.getElementById('pdf-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', async () => {
      try {
        await api(`/api/project/${meta.endpoint}`, { method: 'DELETE' });
        toast('Arquivo removido.');
        closeModal();
        loadProjectStatus();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  }
}

// ---------------------------------------------------------------
// FOLDER FORM (create/edit)
// ---------------------------------------------------------------
function openFolderFormModal(folder = null) {
  const isEdit = !!folder;
  const html = `
    <div class="modal-title-row"><h2>${isEdit ? 'Editar pasta' : 'Nova pasta'}</h2><button class="modal-close" data-modal-close>${ICONS.close}</button></div>
    <form id="folder-form">
      <div class="field">
        <label>Nome da pasta <span class="req">*</span></label>
        <input type="text" name="name" placeholder="Ex: Cadeira da mesa de jantar" value="${isEdit ? esc(folder.name) : ''}" required maxlength="80" />
      </div>
      <div class="field">
        <label>Foto da pasta <span class="req">*</span></label>
        <div class="photo-picker">
          ${isEdit
            ? `<img class="photo-preview" id="folder-photo-preview" src="${folder.photoUrl}" />`
            : `<div class="photo-preview-empty" id="folder-photo-preview-empty">${ICONS.image}</div>`}
          <div>
            <button type="button" class="btn btn-ghost btn-sm" id="folder-photo-pick-btn">Escolher foto</button>
            <div class="field-hint">JPG, PNG ou WEBP</div>
          </div>
        </div>
        <input type="file" accept="image/*" name="photo" id="folder-photo-input" style="display:none" ${isEdit ? '' : 'required'} />
      </div>
      <div class="field-error" id="folder-form-error" style="display:none;"></div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-block" id="folder-submit-btn">${isEdit ? 'Salvar alterações' : 'Criar pasta'}</button>
        <button type="button" class="btn btn-text" data-modal-close>Cancelar</button>
      </div>
    </form>
  `;
  openModal(html);

  const photoInput = document.getElementById('folder-photo-input');
  document.getElementById('folder-photo-pick-btn').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => {
    if (!photoInput.files.length) return;
    const url = URL.createObjectURL(photoInput.files[0]);
    const existingPreview = document.getElementById('folder-photo-preview');
    const existingEmpty = document.getElementById('folder-photo-preview-empty');
    if (existingPreview) existingPreview.src = url;
    else if (existingEmpty) existingEmpty.outerHTML = `<img class="photo-preview" id="folder-photo-preview" src="${url}" />`;
  });

  const form = document.getElementById('folder-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('folder-form-error');
    errEl.style.display = 'none';
    const fd = new FormData(form);
    const submitBtn = document.getElementById('folder-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    try {
      if (isEdit) {
        await api(`/api/folders/${folder.id}`, { method: 'PUT', body: fd });
        toast('Pasta atualizada.');
        closeModal();
        if (parseHash().view === 'folder' && parseHash().id === folder.id) renderFolderView(folder.id);
        else loadFolders();
      } else {
        await api('/api/folders', { method: 'POST', body: fd });
        toast('Pasta criada.');
        closeModal();
        loadFolders();
      }
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Salvar alterações' : 'Criar pasta';
    }
  });
}

async function confirmDeleteFolder(folder) {
  openConfirmModal({
    title: 'Excluir pasta?',
    message: `"${folder.name}" e todos os itens dentro dela serão removidos permanentemente.`,
    confirmLabel: 'Excluir pasta',
    onConfirm: async () => {
      try {
        await api(`/api/folders/${folder.id}`, { method: 'DELETE' });
        toast('Pasta excluída.');
        if (parseHash().view === 'folder' && parseHash().id === folder.id) location.hash = '';
        else loadFolders();
      } catch (e) {
        toast(e.message, 'error');
      }
    }
  });
}

function openConfirmModal({ title, message, confirmLabel, onConfirm }) {
  const html = `
    <div class="modal-title-row"><h2>${esc(title)}</h2><button class="modal-close" data-modal-close>${ICONS.close}</button></div>
    <p style="color:var(--ink-soft); font-size:14px; line-height:1.6; margin: 0 0 8px;">${esc(message)}</p>
    <div class="form-actions">
      <button type="button" class="btn btn-danger btn-block" id="confirm-btn">${confirmLabel}</button>
      <button type="button" class="btn btn-text" data-modal-close>Cancelar</button>
    </div>
  `;
  openModal(html);
  document.getElementById('confirm-btn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

// ---------------------------------------------------------------
// FOLDER VIEW (items gallery)
// ---------------------------------------------------------------
async function renderFolderView(id) {
  appEl.innerHTML = `
    <div class="view-enter">
      <div class="folder-header">
        <button class="btn btn-icon back-btn" id="back-btn">${ICONS.back}</button>
        <div class="folder-info">
          <h1 id="folder-title">Carregando…</h1>
          <div class="folder-sub" id="folder-sub"></div>
        </div>
        <div class="actions">
          <button class="btn btn-icon" id="folder-kebab">${ICONS.kebab}</button>
        </div>
      </div>
      <div class="grid" id="items-grid">${skeletonCards(6)}</div>
    </div>
    <button class="fab" id="fab-add-item" title="Novo item">${ICONS.plus}</button>
  `;
  document.getElementById('back-btn').addEventListener('click', () => { location.hash = ''; });

  let folder;
  try {
    folder = await api(`/api/folders/${id}`);
  } catch (e) {
    appEl.innerHTML = `<div class="empty-state"><div class="icon">${ICONS.warning}</div><p>Pasta não encontrada.</p><button class="btn btn-primary" onclick="location.hash=''">Voltar</button></div>`;
    return;
  }

  document.getElementById('folder-title').textContent = folder.name;
  document.getElementById('folder-sub').textContent = `${folder.itemCount} ${folder.itemCount === 1 ? 'item' : 'itens'}`;
  const headerEl = document.querySelector('.folder-header');
  const coverImg = document.createElement('img');
  coverImg.className = 'folder-cover';
  coverImg.src = folder.photoUrl;
  coverImg.alt = folder.name;
  headerEl.insertBefore(coverImg, headerEl.querySelector('.folder-info'));

  document.getElementById('folder-kebab').addEventListener('click', () => {
    openActionSheet([
      { label: 'Editar pasta', icon: ICONS.edit, onClick: () => openFolderFormModal(folder) },
      { label: 'Excluir pasta', icon: ICONS.trash, danger: true, onClick: () => confirmDeleteFolder(folder) }
    ]);
  });

  document.getElementById('fab-add-item').addEventListener('click', () => openItemFormModal(folder.id));

  loadItems(folder.id);
}

async function loadItems(folderId) {
  const grid = document.getElementById('items-grid');
  try {
    const items = await api(`/api/folders/${folderId}/items`);
    if (!items.length) {
      grid.outerHTML = `
        <div class="empty-state" id="items-grid-empty" style="grid-column:1/-1;">
          <div class="icon">${ICONS.bag}</div>
          <p><strong>Nenhum item nesta pasta ainda</strong></p>
          <p>Adicione o link de um produto que você encontrou — foto, preço e medidas são opcionais.</p>
          <button class="btn btn-primary" id="btn-new-item-empty">${ICONS.plus} Adicionar item</button>
        </div>`;
      document.getElementById('btn-new-item-empty').addEventListener('click', () => openItemFormModal(folderId));
      return;
    }
    grid.innerHTML = items.map(itemCardHtml).join('');
    items.forEach((it) => {
      const card = grid.querySelector(`[data-item-id="${it.id}"]`);
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-kebab]')) return;
        openItemDetailModal(it, folderId);
      });
      card.querySelector('[data-kebab]').addEventListener('click', (e) => {
        e.stopPropagation();
        openActionSheet([
          { label: 'Ver ficha completa', icon: ICONS.eye, onClick: () => openItemDetailModal(it, folderId) },
          { label: 'Editar item', icon: ICONS.edit, onClick: () => openItemFormModal(folderId, it) },
          { label: 'Excluir item', icon: ICONS.trash, danger: true, onClick: () => confirmDeleteItem(it, folderId) }
        ]);
      });
    });
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">${ICONS.warning}</div><p>Erro ao carregar itens.</p></div>`;
  }
}

const STORE_TYPE_LABELS = { fisica: 'Loja física', online: 'Loja online' };

function itemDisplayTitle(item) {
  if (item.store && item.store.trim()) return item.store;
  return STORE_TYPE_LABELS[item.storeType] || 'Produto';
}

function itemCardHtml(item) {
  const price = fmtPrice(item.price);
  const hasPhoto = !!item.photoUrl;
  const media = hasPhoto
    ? `<img class="tile-img" src="${item.photoUrl}" alt="${esc(itemDisplayTitle(item))}" loading="lazy" />`
    : `<div class="tile-placeholder ${gradFor(item.id)}">${ICONS.sofa}</div>`;
  const storeTypeLabel = STORE_TYPE_LABELS[item.storeType] || '';
  return `
    <div class="tile item-card" data-item-id="${item.id}">
      ${media}
      <button class="tile-kebab" data-kebab type="button" aria-label="Mais opções">${ICONS.kebab}</button>
      <div class="tile-panel">
        ${storeTypeLabel ? `<div class="tile-tags"><span class="tile-tag">${esc(storeTypeLabel)}</span></div>` : ''}
        ${price ? `<div class="tile-price">${esc(price)}</div>` : ''}
        ${item.measurements ? `<div class="tile-line">${esc(item.measurements)}</div>` : ''}
        ${item.store ? `<div class="tile-line">${esc(item.store)}</div>` : ''}
        
      </div>
    </div>`;
}

// ---------------------------------------------------------------
// ITEM FORM (create/edit)
// ---------------------------------------------------------------
function openItemFormModal(folderId, item = null) {
  const isEdit = !!item;
  const html = `
    <div class="modal-title-row"><h2>${isEdit ? 'Editar item' : 'Novo item'}</h2><button class="modal-close" data-modal-close>${ICONS.close}</button></div>
    <form id="item-form">
      <div class="field">
        <label>Loja física ou online <span class="req">*</span></label>
        <div class="store-type-toggle">
          <label class="store-type-option">
            <input type="radio" name="storeType" value="fisica" ${isEdit && item.storeType === 'fisica' ? 'checked' : ''} required />
            <span>Loja física</span>
          </label>
          <label class="store-type-option">
            <input type="radio" name="storeType" value="online" ${isEdit && item.storeType === 'online' ? 'checked' : ''} required />
            <span>Loja online</span>
          </label>
        </div>
        <div class="field-hint">O único campo obrigatório.</div>
      </div>
      <div class="field">
        <label>Link do produto <span class="opt">(opcional)</span></label>
        <input type="text" name="link" placeholder="https://loja.com/produto" value="${isEdit ? esc(item.link || '') : ''}" />
      </div>
      <div class="field">
        <label>Foto do produto <span class="opt">(opcional)</span></label>
        <div class="photo-picker">
          ${isEdit && item.photoUrl
            ? `<img class="photo-preview" id="item-photo-preview" src="${item.photoUrl}" />`
            : `<div class="photo-preview-empty" id="item-photo-preview-empty">${ICONS.sofa}</div>`}
          <div>
            <button type="button" class="btn btn-ghost btn-sm" id="item-photo-pick-btn">Escolher foto</button>
            ${isEdit && item.photoUrl ? `<button type="button" class="btn btn-text btn-sm" id="item-photo-remove-btn">Remover</button>` : ''}
          </div>
        </div>
        <input type="file" accept="image/*" name="photo" id="item-photo-input" style="display:none" />
        <input type="hidden" name="removePhoto" id="item-remove-photo-flag" value="false" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Preço <span class="opt">(opcional)</span></label>
          <input type="number" step="0.01" min="0" name="price" placeholder="0,00" value="${isEdit && item.price !== null ? item.price : ''}" />
        </div>
        <div class="field">
          <label>Medidas <span class="opt">(opcional)</span></label>
          <input type="text" name="measurements" placeholder="Ex: 120x60x75cm" value="${isEdit ? esc(item.measurements) : ''}" />
        </div>
      </div>
      <div class="field">
        <label>Loja <span class="opt">(opcional)</span></label>
        <input type="text" name="store" placeholder="Ex: Madeira Madeira" value="${isEdit ? esc(item.store) : ''}" maxlength="80" />
      </div>
      <div class="field">
        <label>Observações <span class="opt">(opcional)</span></label>
        <textarea name="notes" placeholder="Cor, prazo de entrega, alternativas...">${isEdit ? esc(item.notes) : ''}</textarea>
      </div>
      <div class="field-error" id="item-form-error" style="display:none;"></div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-block" id="item-submit-btn">${isEdit ? 'Salvar alterações' : 'Adicionar item'}</button>
        <button type="button" class="btn btn-text" data-modal-close>Cancelar</button>
      </div>
    </form>
  `;
  openModal(html);

  const photoInput = document.getElementById('item-photo-input');
  document.getElementById('item-photo-pick-btn').addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', () => {
    if (!photoInput.files.length) return;
    document.getElementById('item-remove-photo-flag').value = 'false';
    const url = URL.createObjectURL(photoInput.files[0]);
    const existingPreview = document.getElementById('item-photo-preview');
    const existingEmpty = document.getElementById('item-photo-preview-empty');
    if (existingPreview) existingPreview.src = url;
    else if (existingEmpty) existingEmpty.outerHTML = `<img class="photo-preview" id="item-photo-preview" src="${url}" />`;
  });
  const removeBtn = document.getElementById('item-photo-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      document.getElementById('item-remove-photo-flag').value = 'true';
      photoInput.value = '';
      const existingPreview = document.getElementById('item-photo-preview');
      if (existingPreview) existingPreview.outerHTML = `<div class="photo-preview-empty" id="item-photo-preview-empty">${ICONS.sofa}</div>`;
    });
  }

  const form = document.getElementById('item-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('item-form-error');
    errEl.style.display = 'none';
    const fd = new FormData(form);
    const submitBtn = document.getElementById('item-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    try {
      if (isEdit) {
        await api(`/api/items/${item.id}`, { method: 'PUT', body: fd });
        toast('Item atualizado.');
      } else {
        await api(`/api/folders/${folderId}/items`, { method: 'POST', body: fd });
        toast('Item adicionado.');
      }
      closeModal();
      loadItems(folderId);
      refreshFolderHeaderCount(folderId);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Salvar alterações' : 'Adicionar item';
    }
  });
}

async function refreshFolderHeaderCount(folderId) {
  try {
    const folder = await api(`/api/folders/${folderId}`);
    const sub = document.getElementById('folder-sub');
    if (sub) sub.textContent = `${folder.itemCount} ${folder.itemCount === 1 ? 'item' : 'itens'}`;
  } catch (e) { /* silent */ }
}

async function confirmDeleteItem(item, folderId) {
  openConfirmModal({
    title: 'Excluir item?',
    message: `"${itemDisplayTitle(item)}" será removido permanentemente.`,
    confirmLabel: 'Excluir item',
    onConfirm: async () => {
      try {
        await api(`/api/items/${item.id}`, { method: 'DELETE' });
        toast('Item excluído.');
        loadItems(folderId);
        refreshFolderHeaderCount(folderId);
      } catch (e) {
        toast(e.message, 'error');
      }
    }
  });
}

// ---------------------------------------------------------------
// ITEM DETAIL (ficha completa)
// ---------------------------------------------------------------
function openItemDetailModal(item, folderId) {
  const price = fmtPrice(item.price);
  const storeTypeLabel = STORE_TYPE_LABELS[item.storeType] || '';
  const stats = [];
  if (storeTypeLabel) stats.push({ k: 'Tipo de loja', v: storeTypeLabel, icon: ICONS.store });
  if (price) stats.push({ k: 'Preço', v: price, icon: ICONS.tag });
  if (item.measurements) stats.push({ k: 'Medidas', v: item.measurements, icon: ICONS.rulerSmall });
  if (item.store) stats.push({ k: 'Loja', v: item.store, icon: ICONS.store });

  const html = `
    <div class="ficha-photo-wrap">
      ${item.photoUrl
        ? `<img class="ficha-photo" src="${item.photoUrl}" alt="${esc(itemDisplayTitle(item))}" />`
        : `<div class="ficha-photo-empty ${gradFor(item.id)}">${ICONS.sofa}</div>`}
      <button class="modal-close" data-modal-close>${ICONS.close}</button>
    </div>
    <div>
      <h2 class="ficha-title">${esc(itemDisplayTitle(item))}</h2>
      ${price ? `<div class="ficha-price">${esc(price)}</div>` : ''}
    </div>
    ${stats.length ? `
      <div class="ficha-grid">
        ${stats.map((s) => `<div class="ficha-stat"><div class="k">${s.icon}${esc(s.k)}</div><div class="v">${esc(s.v)}</div></div>`).join('')}
      </div>` : ''}
    ${item.notes ? `
      <div class="ficha-section-title">${ICONS.note} Observações</div>
      <div class="ficha-notes">${esc(item.notes)}</div>` : ''}
    ${item.link ? `<a class="btn btn-primary ficha-link-btn" href="${esc(item.link)}" target="_blank" rel="noopener">${ICONS.external} Ver produto — ${esc(hostFromUrl(item.link))}</a>` : ''}
    <div class="ficha-actions">
      <button class="btn btn-ghost" id="ficha-edit-btn">${ICONS.edit} Editar</button>
      <button class="btn btn-danger" id="ficha-delete-btn">${ICONS.trash} Excluir</button>
    </div>
  `;
  openModal(html);
  document.getElementById('ficha-edit-btn').addEventListener('click', () => {
    closeModal();
    openItemFormModal(folderId, item);
  });
  document.getElementById('ficha-delete-btn').addEventListener('click', () => {
    closeModal();
    confirmDeleteItem(item, folderId);
  });
}

// ---------------------------------------------------------------
// init
// ---------------------------------------------------------------
boot();
