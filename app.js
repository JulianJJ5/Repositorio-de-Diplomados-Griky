// ============================================================
//  GRIKY — REPOSITORIO DE DIPLOMADOS
//  app.js — Catalog logic: load, navigate, add, search
// ============================================================

// ---- State ----
const state = {
  catalog: [],        // all diplomados avanzados
  currentLevel: 1,   // 1 = DA list, 2 = Diplomados list, 3 = Unidades list
  selectedDA: null,  // selected Diplomado Avanzado object
  selectedDip: null, // selected Diplomado object
  searchQuery: '',
  colors: [
    'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
    'linear-gradient(135deg,#0EA5E9 0%,#06B6D4 100%)',
    'linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)',
    'linear-gradient(135deg,#10B981 0%,#06B6D4 100%)',
    'linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)',
    'linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)',
    'linear-gradient(135deg,#14B8A6 0%,#0EA5E9 100%)',
    'linear-gradient(135deg,#F97316 0%,#EF4444 100%)',
  ],
  icons: ['🎓','📚','💡','🔬','🏆','📊','🎯','🧠','⚡','🌟'],
};

// ---- DOM Refs ----
const viewEl       = document.getElementById('view');
const breadcrumbEl = document.getElementById('breadcrumb');
const titleEl      = document.getElementById('page-title');
const subtitleEl   = document.getElementById('page-subtitle');
const addBtnEl     = document.getElementById('btn-add');
const searchEl     = document.getElementById('search-input');
const statsEl      = document.getElementById('stat-count');
const modalOverlay = document.getElementById('modal-overlay');
const modalForm    = document.getElementById('modal-form');
const modalTitle   = document.getElementById('modal-title');
const toastCont    = document.getElementById('toast-container');

// ---- Init ----
async function init() {
  try {
    const res = await fetch('catalog.json');
    if (!res.ok) throw new Error('No se pudo cargar catalog.json');
    const data = await res.json();
    state.catalog = data.catalog || [];
  } catch (e) {
    console.warn('catalog.json no encontrado, iniciando vacío.', e);
    state.catalog = [];
  }
  renderLevel1();
}

// ---- RENDER LEVEL 1: Diplomados Avanzados ----
function renderLevel1() {
  state.currentLevel = 1;
  state.selectedDA   = null;
  state.selectedDip  = null;

  updateBreadcrumb([{ label: 'Inicio', icon: '🏠', active: true }]);
  titleEl.innerHTML  = 'Repositorio de <span class="highlight">Diplomados</span>';
  subtitleEl.textContent = 'Selecciona un Diplomado Avanzado para explorar su contenido';
  addBtnEl.style.display = 'flex';
  addBtnEl.textContent = '+ Nuevo Diplomado Avanzado';
  updateStats();

  const filtered = filterItems(state.catalog, 'title');

  let html = '<div class="cards-grid view">';

  if (filtered.length === 0 && state.searchQuery === '') {
    html = `<div class="empty-state view">
      <div class="empty-state-icon">📂</div>
      <h3>Sin diplomados aún</h3>
      <p>Usa el botón "Nuevo Diplomado Avanzado" para comenzar tu catálogo.</p>
    </div>`;
  } else {
    if (filtered.length === 0) {
      html += `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>Sin resultados</h3>
        <p>No se encontraron diplomados con "${state.searchQuery}".</p>
      </div>`;
    } else {
      filtered.forEach((da, i) => {
        const grad = da.color || state.colors[i % state.colors.length];
        const icon = da.icon || state.icons[i % state.icons.length];
        const dipCount = (da.diplomados || []).length;
        html += `
          <div class="card-da" onclick="selectDA('${da.id}')" id="card-da-${da.id}">
            <div class="card-da-banner" style="background:${grad}"></div>
            <div class="card-da-body">
              <div class="card-da-icon" style="background:${grad}30;border:1px solid ${grad}40">${icon}</div>
              <div class="card-da-info">
                <div class="card-da-title">${escHtml(da.title)}</div>
                <div class="card-da-desc">${escHtml(da.description || 'Sin descripción')}</div>
              </div>
              <div class="card-da-footer">
                <div class="card-da-meta">
                  📅 ${formatDate(da.createdAt)}
                </div>
                <div class="card-da-count">${dipCount} diplomado${dipCount !== 1 ? 's' : ''}</div>
                <span class="card-da-arrow">→</span>
              </div>
            </div>
          </div>`;
      });
    }
    // Add card
    html += `
      <button class="card-add" onclick="openModal('da')" id="btn-add-card">
        <div class="card-add-icon">＋</div>
        <span class="card-add-label">Nuevo Diplomado Avanzado</span>
      </button>`;
    html += '</div>';
  }

  viewEl.innerHTML = html;
}

// ---- RENDER LEVEL 2: Diplomados ----
function renderLevel2(da) {
  state.currentLevel = 2;
  state.selectedDA   = da;
  state.selectedDip  = null;

  updateBreadcrumb([
    { label: 'Inicio', icon: '🏠', onclick: 'renderLevel1()' },
    { label: da.title, icon: '📁', active: true }
  ]);
  titleEl.innerHTML  = escHtml(da.title);
  subtitleEl.textContent = da.description || 'Selecciona un diplomado para ver sus unidades';
  addBtnEl.style.display = 'flex';
  addBtnEl.textContent = '+ Nuevo Diplomado';
  updateStats();

  const dips = da.diplomados || [];
  const filtered = filterItems(dips, 'title');

  let html = '<div class="cards-grid view">';

  if (filtered.length === 0 && state.searchQuery === '') {
    html = `<div class="empty-state view">
      <div class="empty-state-icon">📂</div>
      <h3>Sin diplomados en este bloque</h3>
      <p>Añade el primer diplomado con el botón superior.</p>
    </div>`;
  } else {
    filtered.forEach((dip, i) => {
      const uCount = (dip.unidades || []).length;
      html += `
        <div class="card-dip" onclick="selectDip('${dip.id}')" id="card-dip-${dip.id}">
          <div class="card-dip-header">
            <div class="card-dip-num">${i + 1}</div>
            <div>
              <div class="card-dip-title">${escHtml(dip.title)}</div>
              <div class="card-dip-desc">${escHtml(dip.description || '')}</div>
            </div>
          </div>
          <div class="card-dip-stats">
            <div class="card-dip-stat">📦 <strong>${uCount}</strong> unidad${uCount !== 1 ? 'es' : ''}</div>
            <div class="card-dip-stat">📅 ${formatDate(dip.createdAt)}</div>
          </div>
        </div>`;
    });
    html += `
      <button class="card-add" onclick="openModal('dip')" id="btn-add-dip">
        <div class="card-add-icon">＋</div>
        <span class="card-add-label">Nuevo Diplomado</span>
      </button>`;
    html += '</div>';
  }

  viewEl.innerHTML = html;
}

// ---- RENDER LEVEL 3: Unidades / SCORMs ----
function renderLevel3(dip) {
  state.currentLevel = 3;
  state.selectedDip  = dip;

  const da = state.selectedDA;
  updateBreadcrumb([
    { label: 'Inicio',  icon: '🏠', onclick: 'renderLevel1()' },
    { label: da.title,  icon: '📁', onclick: `selectDA('${da.id}')` },
    { label: dip.title, icon: '📂', active: true }
  ]);
  titleEl.innerHTML  = escHtml(dip.title);
  subtitleEl.textContent = `${(dip.unidades||[]).length} unidades SCORM disponibles para descarga`;
  addBtnEl.style.display = 'none'; // No se añaden unidades desde UI, se suben a GitHub
  updateStats();

  const unidades = dip.unidades || [];

  if (unidades.length === 0) {
    viewEl.innerHTML = `
      <div class="empty-state view">
        <div class="empty-state-icon">📦</div>
        <h3>Sin unidades registradas</h3>
        <p>Sube los archivos .zip al repositorio y agrégalos en <code>catalog.json</code>.</p>
      </div>`;
    return;
  }

  let html = '<div class="unidades-list view">';
  unidades.forEach((u, i) => {
    html += `
      <div class="unidad-card" id="unidad-${u.id}">
        <div class="unidad-icon">📦</div>
        <div class="unidad-info">
          <div class="unidad-title">${escHtml(u.title)}</div>
          <div class="unidad-filename">${escHtml(u.filename)}</div>
        </div>
        <div class="unidad-meta">
          <span class="unidad-date">📅 ${formatDate(u.createdAt)}</span>
          <a class="btn btn-download" href="${escHtml(u.path)}" download="${escHtml(u.filename)}" onclick="showToast('Descargando ${escHtml(u.filename)}…','success')">
            ⬇ Descargar
          </a>
        </div>
      </div>`;
  });
  html += '</div>';
  viewEl.innerHTML = html;
}

// ---- Navigation ----
function selectDA(id) {
  const da = state.catalog.find(d => d.id === id);
  if (da) renderLevel2(da);
}

function selectDip(id) {
  const da = state.selectedDA;
  if (!da) return;
  const dip = (da.diplomados || []).find(d => d.id === id);
  if (dip) renderLevel3(dip);
}

// ---- Breadcrumb ----
function updateBreadcrumb(items) {
  breadcrumbEl.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    const clickAttr = item.onclick ? `onclick="${item.onclick}"` : (item.active ? '' : '');
    return `
      ${i > 0 ? '<span class="breadcrumb-sep">›</span>' : ''}
      <span class="breadcrumb-item ${item.active ? 'active' : ''}" ${clickAttr}>
        ${item.icon} ${escHtml(item.label)}
      </span>`;
  }).join('');
}

// ---- Stats ----
function updateStats() {
  const total = state.catalog.reduce((sum, da) => {
    return sum + (da.diplomados || []).reduce((s2, d) => s2 + (d.unidades || []).length, 0);
  }, 0);
  statsEl.textContent = total;
}

// ---- Search ----
searchEl.addEventListener('input', (e) => {
  state.searchQuery = e.target.value.trim().toLowerCase();
  if      (state.currentLevel === 1) renderLevel1();
  else if (state.currentLevel === 2) renderLevel2(state.selectedDA);
});

function filterItems(items, key) {
  if (!state.searchQuery) return items;
  return items.filter(it => it[key].toLowerCase().includes(state.searchQuery));
}

// ---- Add button (header) ----
addBtnEl.addEventListener('click', () => {
  if      (state.currentLevel === 1) openModal('da');
  else if (state.currentLevel === 2) openModal('dip');
});

// ---- Modal ----
function openModal(type) {
  modalForm.dataset.type = type;
  modalForm.reset();

  if (type === 'da') {
    modalTitle.textContent = 'Nuevo Diplomado Avanzado';
    document.getElementById('field-desc').placeholder = 'Ej: Formación en gestión estratégica…';
    document.getElementById('field-title').placeholder = 'Ej: Diplomado Avanzado 2';
  } else {
    modalTitle.textContent = 'Nuevo Diplomado';
    document.getElementById('field-desc').placeholder = 'Ej: Módulo de fundamentos…';
    document.getElementById('field-title').placeholder = 'Ej: Diplomado 5';
  }

  modalOverlay.classList.add('open');
  setTimeout(() => document.getElementById('field-title').focus(), 100);
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Submit modal
modalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const type  = modalForm.dataset.type;
  const title = document.getElementById('field-title').value.trim();
  const desc  = document.getElementById('field-desc').value.trim();

  if (!title) return;

  const now = new Date().toISOString().split('T')[0];
  const uid = 'id-' + Date.now();

  if (type === 'da') {
    const colorIdx = state.catalog.length % state.colors.length;
    const iconIdx  = state.catalog.length % state.icons.length;
    const newDA = {
      id: uid,
      title,
      description: desc,
      color: state.colors[colorIdx],
      icon: state.icons[iconIdx],
      createdAt: now,
      diplomados: []
    };
    state.catalog.push(newDA);
    closeModal();
    showToast(`"${title}" añadido correctamente ✓`, 'success');
    renderLevel1();
    showSaveReminder();

  } else if (type === 'dip') {
    const newDip = {
      id: uid,
      title,
      description: desc,
      createdAt: now,
      unidades: []
    };
    state.selectedDA.diplomados.push(newDip);
    closeModal();
    showToast(`"${title}" añadido correctamente ✓`, 'success');
    renderLevel2(state.selectedDA);
    showSaveReminder();
  }
});

// ---- Save reminder ----
function showSaveReminder() {
  // Build updated JSON for the user to copy
  const jsonStr = JSON.stringify({ catalog: state.catalog }, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'catalog.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('catalog.json descargado — reemplázalo en tu repositorio', 'success');
}

// ---- Toast ----
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${msg}</span>`;
  toastCont.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ---- Utils ----
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { year:'numeric', month:'short', day:'numeric' });
  } catch { return dateStr; }
}

// ---- Start ----
document.addEventListener('DOMContentLoaded', init);
