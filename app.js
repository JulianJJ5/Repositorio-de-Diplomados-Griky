// ============================================================
//  GRIKY — REPOSITORIO DE DIPLOMADOS
//  Catálogo de solo lectura: navegación de 3 niveles + búsqueda.
//  Los ZIP viven en SharePoint; catalog.json solo describe dónde.
// ============================================================

'use strict';

// ---- Configuración ----
const CATALOG_URL = 'catalog.json';
const SEARCH_DEBOUNCE_MS = 150;

// Un único recorrido morado → cyan de la marca, partido en tramos. Mantiene
// las tarjetas distinguibles sin meter ocho familias de color en pantalla.
const FALLBACK_COLORS = [
  'linear-gradient(135deg,#7C3AED 0%,#6D5BEF 100%)',
  'linear-gradient(135deg,#6D5BEF 0%,#5B7BF0 100%)',
  'linear-gradient(135deg,#5B7BF0 0%,#4A9BF0 100%)',
  'linear-gradient(135deg,#4A9BF0 0%,#06B6D4 100%)',
];
const FALLBACK_ICONS = ['🎓', '📚', '💡', '🔬', '🏆', '📊', '🎯', '🧠', '⚡', '🌟'];

// ---- Estado ----
const state = {
  base: '',        // prefijo común de las URLs de SharePoint
  catalog: [],     // diplomados avanzados
  daId: null,      // DA seleccionado (null = nivel 1)
  dipId: null,     // curso seleccionado (null = nivel 2)
  query: '',       // búsqueda normalizada
};

// ---- Refs del DOM ----
const el = {
  view:       document.getElementById('view'),
  breadcrumb: document.getElementById('breadcrumb'),
  title:      document.getElementById('page-title'),
  subtitle:   document.getElementById('page-subtitle'),
  back:       document.getElementById('back-btn'),
  search:     document.getElementById('search-input'),
  stat:       document.getElementById('stat-count'),
  statLabel:  document.getElementById('stat-label'),
  toasts:     document.getElementById('toast-container'),
};

// ============================================================
//  Utilidades
// ============================================================

/** Escapa texto para insertarlo en HTML (incluidos atributos con comillas dobles). */
function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Quita acentos y pasa a minúsculas, para que "accion" encuentre "Acción". */
function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const dateFmt = new Intl.DateTimeFormat('es-MX', {
  year: 'numeric', month: 'short', day: 'numeric',
});

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : dateFmt.format(d);
}

/** Codifica un segmento de ruta preservando los caracteres válidos en URL. */
function encodeSegment(segment) {
  return encodeURIComponent(segment).replace(/%2F/gi, '/');
}

/**
 * Reconstruye la URL de SharePoint de una unidad.
 * catalog.json guarda `base` una vez y `folder` por curso en lugar de repetir
 * la URL completa (~400 caracteres) en cada una de las 300+ unidades.
 */
function unitUrl(curso, unidad) {
  if (unidad.pending || !curso.folder || !unidad.filename) return null;
  const folder = curso.folder.split('/').map(encodeSegment).join('/');
  // ?download=1 hace que SharePoint entregue el archivo en vez de previsualizarlo.
  return `${state.base}${folder}/${encodeSegment(unidad.filename)}?download=1`;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Primer color hex de un gradiente, para derivar tintes translúcidos. */
function accentOf(gradient) {
  const match = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(gradient || '');
  if (!match) return 'rgba(124,58,237,';
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},`;
}

function plural(n, singular, plural_) {
  return `${n} ${n === 1 ? singular : plural_}`;
}

// ============================================================
//  Consultas sobre el catálogo
// ============================================================

const findDA = (id) => state.catalog.find((da) => da.id === id) || null;

const findDip = (da, id) =>
  (da && (da.diplomados || []).find((d) => d.id === id)) || null;

function countUnits(da) {
  return (da.diplomados || []).reduce((sum, c) => sum + (c.unidades || []).length, 0);
}

/** Filtra por los campos indicados usando la búsqueda activa. */
function filterBy(items, fields) {
  if (!state.query) return items;
  return items.filter((item) =>
    fields.some((f) => normalize(item[f]).includes(state.query)));
}

// ============================================================
//  Enrutado por hash (permite compartir enlaces y usar "atrás")
// ============================================================

function readHash() {
  const [daId, dipId] = decodeURIComponent(location.hash.slice(1)).split('/');
  return { daId: daId || null, dipId: dipId || null };
}

function navigate(daId, dipId) {
  const hash = [daId, dipId].filter(Boolean).map(encodeURIComponent).join('/');
  // El render lo dispara el evento hashchange.
  if (location.hash.slice(1) === hash) render();
  else location.hash = hash;
}

// ============================================================
//  Render
// ============================================================

function render() {
  const { daId, dipId } = readHash();
  const da = findDA(daId);
  const dip = findDip(da, dipId);

  state.daId = da ? da.id : null;
  state.dipId = dip ? dip.id : null;

  if (dip) renderUnidades(da, dip);
  else if (da) renderCursos(da);
  else renderDiplomadosAvanzados();

  el.view.setAttribute('aria-busy', 'false');
}

// ---- Nivel 1: Diplomados Avanzados ----
function renderDiplomadosAvanzados() {
  el.title.innerHTML = 'Repositorio de <span class="highlight">Diplomados</span>';
  el.subtitle.textContent = 'Selecciona un Diplomado Avanzado para explorar su contenido';
  el.back.hidden = true;
  el.search.placeholder = 'Buscar diplomados…';
  setBreadcrumb([{ label: 'Inicio', icon: '🏠' }]);

  const total = state.catalog.reduce((sum, da) => sum + countUnits(da), 0);
  setStat(total, 'SCORMs');

  const matches = filterBy(state.catalog, ['title', 'description']);
  if (!matches.length) {
    el.view.innerHTML = emptyState('🔍', 'Sin resultados',
      `Ningún diplomado coincide con "${esc(el.search.value.trim())}".`);
    return;
  }

  el.view.innerHTML = `<div class="cards-grid view">${matches.map((da, i) => {
    const grad = da.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    const icon = da.icon || FALLBACK_ICONS[i % FALLBACK_ICONS.length];
    const rgba = accentOf(grad);
    const units = countUnits(da);
    return `
      <button class="card-da" type="button" data-da="${esc(da.id)}">
        <span class="card-da-banner" style="background:${esc(grad)}"></span>
        <span class="card-da-body">
          <span class="card-da-icon" style="background:${rgba}0.18);border-color:${rgba}0.3)">${icon}</span>
          <span class="card-da-info">
            <span class="card-da-title">${esc(da.title)}</span>
            <span class="card-da-desc">${esc(da.description || 'Sin descripción')}</span>
          </span>
          <span class="card-da-footer">
            <span class="card-da-count">${plural((da.diplomados || []).length, 'curso', 'cursos')}</span>
            <span class="card-da-count">${plural(units, 'unidad', 'unidades')}</span>
            <span class="card-da-arrow" aria-hidden="true">→</span>
          </span>
        </span>
      </button>`;
  }).join('')}</div>`;
}

// ---- Nivel 2: Cursos ----
function renderCursos(da) {
  el.title.textContent = da.title;
  el.subtitle.textContent = da.description || 'Selecciona un curso para ver sus unidades';
  el.back.hidden = false;
  el.search.placeholder = 'Buscar cursos…';
  setBreadcrumb([
    { label: 'Inicio', icon: '🏠', href: '#' },
    { label: da.title, icon: '📁' },
  ]);
  setStat(countUnits(da), 'SCORMs');

  const cursos = filterBy(da.diplomados || [], ['title', 'description']);
  if (!cursos.length) {
    el.view.innerHTML = state.query
      ? emptyState('🔍', 'Sin resultados', 'Ningún curso coincide con la búsqueda.')
      : emptyState('📂', 'Sin cursos', 'Este diplomado avanzado aún no tiene cursos.');
    return;
  }

  el.view.innerHTML = `<div class="cards-grid view">${cursos.map((dip, i) => {
    const unidades = dip.unidades || [];
    const listas = unidades.filter((u) => !u.pending).length;
    return `
      <button class="card-dip" type="button" data-dip="${esc(dip.id)}">
        <span class="card-dip-header">
          <span class="card-dip-num">${i + 1}</span>
          <span>
            <span class="card-dip-title">${esc(dip.title)}</span>
            <span class="card-dip-desc">${esc(dip.description || '')}</span>
          </span>
        </span>
        <span class="card-dip-stats">
          <span class="card-dip-stat">📦 <strong>${unidades.length}</strong> unidad${unidades.length === 1 ? '' : 'es'}</span>
          ${listas < unidades.length
            ? `<span class="card-dip-stat is-pending">⏳ ${unidades.length - listas} sin ruta</span>`
            : '<span class="card-dip-stat">✅ disponibles</span>'}
        </span>
      </button>`;
  }).join('')}</div>`;
}

// ---- Nivel 3: Unidades / SCORMs ----
function renderUnidades(da, dip) {
  el.title.textContent = dip.title;
  el.back.hidden = false;
  el.search.placeholder = 'Buscar unidades…';
  setBreadcrumb([
    { label: 'Inicio', icon: '🏠', href: '#' },
    { label: da.title, icon: '📁', href: `#${encodeURIComponent(da.id)}` },
    { label: dip.title, icon: '📂' },
  ]);

  const todas = dip.unidades || [];
  const disponibles = todas.filter((u) => !u.pending).length;
  el.subtitle.textContent = disponibles === todas.length
    ? `${plural(todas.length, 'unidad', 'unidades')} SCORM disponibles para descarga`
    : `${disponibles} de ${todas.length} unidades con ruta de descarga`;
  setStat(todas.length, 'unidades');

  const unidades = filterBy(todas, ['title', 'filename']);
  if (!unidades.length) {
    el.view.innerHTML = state.query
      ? emptyState('🔍', 'Sin resultados', 'Ninguna unidad coincide con la búsqueda.')
      : emptyState('📦', 'Sin unidades', 'Este curso aún no tiene unidades registradas.');
    return;
  }

  el.view.innerHTML = `<ul class="unidades-list view">${unidades.map((u, i) => {
    const url = unitUrl(dip, u);
    const action = url
      ? `<a class="btn btn-download" href="${esc(url)}" target="_blank" rel="noopener"
            data-download="${esc(u.filename)}">⬇ Descargar</a>`
      : '<span class="btn btn-pending" title="Falta registrar la carpeta de SharePoint de este curso">⏳ Ruta pendiente</span>';
    return `
      <li class="unidad-card${url ? '' : ' is-pending'}">
        <span class="unidad-icon" aria-hidden="true">${url ? '📦' : '⏳'}</span>
        <span class="unidad-index">${i + 1}</span>
        <span class="unidad-info">
          <span class="unidad-title">${esc(u.title || u.filename || 'Sin título')}</span>
          <span class="unidad-filename" title="${esc(u.filename)}">${esc(u.filename)}</span>
        </span>
        <span class="unidad-meta">
          <span class="unidad-date">📅 ${formatDate(u.createdAt)}</span>
          ${action}
        </span>
      </li>`;
  }).join('')}</ul>`;
}

// ---- Piezas compartidas ----
function setBreadcrumb(items) {
  el.breadcrumb.innerHTML = items.map((item, i) => {
    const last = i === items.length - 1;
    const sep = i > 0 ? '<span class="breadcrumb-sep" aria-hidden="true">›</span>' : '';
    const label = `${item.icon} ${esc(item.label)}`;
    return sep + (last || !item.href
      ? `<span class="breadcrumb-item active" aria-current="page">${label}</span>`
      : `<a class="breadcrumb-item" href="${esc(item.href)}">${label}</a>`);
  }).join('');
}

function setStat(count, label) {
  el.stat.textContent = count;
  el.statLabel.textContent = label;
}

function emptyState(icon, heading, message) {
  return `<div class="empty-state view">
    <div class="empty-state-icon" aria-hidden="true">${icon}</div>
    <h3>${heading}</h3>
    <p>${message}</p>
  </div>`;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = `${type === 'success' ? '✅' : '❌'} ${message}`;
  el.toasts.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ============================================================
//  Eventos (delegación: un solo listener para todas las tarjetas)
// ============================================================

el.view.addEventListener('click', (event) => {
  const daCard = event.target.closest('[data-da]');
  if (daCard) {
    navigate(daCard.dataset.da, null);
    return;
  }
  const dipCard = event.target.closest('[data-dip]');
  if (dipCard) {
    navigate(state.daId, dipCard.dataset.dip);
    return;
  }
  const link = event.target.closest('[data-download]');
  if (link) showToast(`Abriendo ${link.dataset.download}…`);
});

el.back.addEventListener('click', () => {
  navigate(state.dipId ? state.daId : null, null);
});

el.search.addEventListener('input', debounce((event) => {
  const next = normalize(event.target.value.trim());
  if (next === state.query) return;
  state.query = next;
  render();
}, SEARCH_DEBOUNCE_MS));

// Esc limpia la búsqueda; "/" la enfoca.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.activeElement === el.search) {
    el.search.value = '';
    state.query = '';
    render();
  } else if (event.key === '/' && document.activeElement !== el.search) {
    event.preventDefault();
    el.search.focus();
  }
});

window.addEventListener('hashchange', render);

// ============================================================
//  Arranque
// ============================================================

async function init() {
  try {
    // Sin opciones extra: así la petición coincide con el <link rel="preload">
    // del index.html y el navegador reutiliza la que ya está en vuelo.
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.base = data.base || '';
    state.catalog = Array.isArray(data.catalog) ? data.catalog : [];
  } catch (error) {
    console.error('No se pudo cargar el catálogo:', error);
    el.view.innerHTML = emptyState('⚠️', 'No se pudo cargar el catálogo',
      `Revisa que <code>${CATALOG_URL}</code> exista y sea JSON válido.`);
    setStat(0, 'SCORMs');
    return;
  }
  render();
}

init();
