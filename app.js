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

const FALLBACK_ICONS = ['graduation', 'book', 'bulb', 'flask', 'trophy',
  'chart', 'target', 'network', 'bolt', 'star'];

/**
 * Iconos monocromos: heredan el color del texto vía `currentColor`, así que
 * no aportan color propio como hacían los emoji. Solo el trazado interior;
 * el <svg> que los envuelve lo arma icon().
 */
const ICON_PATHS = {
  graduation: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/>',
  book:       '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  bulb:       '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.1 14c.5-1 1.2-1.7 2-2.5A6 6 0 1 0 6 8c0 1.4.6 2.7 1.5 3.6.8.8 1.5 1.5 2 2.4"/>',
  flask:      '<path d="M9 2v6.5L4.2 17A2 2 0 0 0 6 20h12a2 2 0 0 0 1.8-3L15 8.5V2"/><path d="M8 2h8"/><path d="M7.5 14h9"/>',
  trophy:     '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.7V17c0 .6-.4 1-1 1.2-1.2.4-2 1.5-2 2.8"/><path d="M14 14.7V17c0 .6.4 1 1 1.2 1.2.4 2 1.5 2 2.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  chart:      '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-3"/>',
  target:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  network:    '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 7v3.5M11 11.5 6.5 16M13 11.5 17.5 16"/>',
  bolt:       '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  star:       '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1L12 2Z"/>',
  home:       '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10Z"/><path d="M9 22V12h6v10"/>',
  folder:     '<path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4Z"/>',
  layers:     '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  package:    '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>',
  clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar:   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  download:   '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  back:       '<path d="M20 12H4"/><path d="m10 6-6 6 6 6"/>',
  check:      '<path d="m4 12 5 5L20 6"/>',
  search:     '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  warning:    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  error:      '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
};

/** Devuelve el SVG de un icono, o cadena vacía si el nombre no existe. */
function icon(name, size = 16) {
  const paths = ICON_PATHS[name];
  if (!paths) return '';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

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
  setBreadcrumb([{ label: 'Inicio', icon: 'home' }]);

  const total = state.catalog.reduce((sum, da) => sum + countUnits(da), 0);
  setStat(total, 'SCORMs');

  const matches = filterBy(state.catalog, ['title', 'description']);
  if (!matches.length) {
    el.view.innerHTML = emptyState('search', 'Sin resultados',
      `Ningún diplomado coincide con "${esc(el.search.value.trim())}".`);
    return;
  }

  el.view.innerHTML = `<div class="cards-grid view">${matches.map((da, i) => {
    const grad = da.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    const name = da.icon || FALLBACK_ICONS[i % FALLBACK_ICONS.length];
    const units = countUnits(da);
    return `
      <button class="card-da" type="button" data-da="${esc(da.id)}">
        <span class="card-da-banner" style="background:${esc(grad)}"></span>
        <span class="card-da-body">
          <span class="card-da-icon">${icon(name, 22)}</span>
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
    { label: 'Inicio', icon: 'home', href: '#' },
    { label: da.title, icon: 'folder' },
  ]);
  setStat(countUnits(da), 'SCORMs');

  const cursos = filterBy(da.diplomados || [], ['title', 'description']);
  if (!cursos.length) {
    el.view.innerHTML = state.query
      ? emptyState('search', 'Sin resultados', 'Ningún curso coincide con la búsqueda.')
      : emptyState('folder', 'Sin cursos', 'Este diplomado avanzado aún no tiene cursos.');
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
          <span class="card-dip-stat">${icon('package', 14)} <strong>${unidades.length}</strong> unidad${unidades.length === 1 ? '' : 'es'}</span>
          ${listas < unidades.length
            ? `<span class="card-dip-stat is-pending">${icon('clock', 14)} ${unidades.length - listas} sin ruta</span>`
            : `<span class="card-dip-stat">${icon('check', 14)} disponibles</span>`}
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
    { label: 'Inicio', icon: 'home', href: '#' },
    { label: da.title, icon: 'folder', href: `#${encodeURIComponent(da.id)}` },
    { label: dip.title, icon: 'layers' },
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
      ? emptyState('search', 'Sin resultados', 'Ninguna unidad coincide con la búsqueda.')
      : emptyState('package', 'Sin unidades', 'Este curso aún no tiene unidades registradas.');
    return;
  }

  el.view.innerHTML = `<ul class="unidades-list view">${unidades.map((u, i) => {
    const url = unitUrl(dip, u);
    const action = url
      ? `<a class="btn btn-download" href="${esc(url)}" target="_blank" rel="noopener"
            data-download="${esc(u.filename)}">${icon('download', 15)} Descargar</a>`
      : `<span class="btn btn-pending" title="Falta registrar la carpeta de SharePoint de este curso">${icon('clock', 15)} Ruta pendiente</span>`;
    return `
      <li class="unidad-card${url ? '' : ' is-pending'}">
        <span class="unidad-icon">${icon(url ? 'package' : 'clock', 20)}</span>
        <span class="unidad-index">${i + 1}</span>
        <span class="unidad-info">
          <span class="unidad-title">${esc(u.title || u.filename || 'Sin título')}</span>
          <span class="unidad-filename" title="${esc(u.filename)}">${esc(u.filename)}</span>
        </span>
        <span class="unidad-meta">
          <span class="unidad-date">${icon('calendar', 14)} ${formatDate(u.createdAt)}</span>
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
    const label = `${icon(item.icon, 14)}<span>${esc(item.label)}</span>`;
    return sep + (last || !item.href
      ? `<span class="breadcrumb-item active" aria-current="page">${label}</span>`
      : `<a class="breadcrumb-item" href="${esc(item.href)}">${label}</a>`);
  }).join('');
}

function setStat(count, label) {
  el.stat.textContent = count;
  el.statLabel.textContent = label;
}

function emptyState(iconName, heading, message) {
  return `<div class="empty-state view">
    <div class="empty-state-icon">${icon(iconName, 40)}</div>
    <h3>${heading}</h3>
    <p>${message}</p>
  </div>`;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  // El icono es markup de confianza; el mensaje va como texto para no inyectar.
  toast.innerHTML = icon(type === 'success' ? 'check' : 'error', 16);
  toast.appendChild(document.createTextNode(` ${message}`));
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
    el.view.innerHTML = emptyState('warning', 'No se pudo cargar el catálogo',
      `Revisa que <code>${CATALOG_URL}</code> exista y sea JSON válido.`);
    setStat(0, 'SCORMs');
    return;
  }
  render();
}

init();
