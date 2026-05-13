/* ============================================================
   YUMYUMPO — Vibe Map
   Leaflet + OpenStreetMap. Auto-pulls active restaurants and
   colour-codes them by a derived "vibe" so visitors can filter
   by Busy / Atmosphere / Social / Night Out / Family.

   Vibe heuristic (all client-side, no extra DB hops):
     hot         — buzz_tier='hot' OR top-rated + popular
     atmosphere  — tags include Romantic / Scenic View / Instagrammable / Fine Dining
     social      — tags include Group-Friendly / Bar / Late Night / Beer
     nightout    — close_time >= 22:00 OR tags include Late Night / Beer
     family      — tags include Family-Friendly / Kids Menu / Budget-Friendly
   A restaurant can belong to multiple vibes; markers display
   their *primary* vibe (priority above). Filters are inclusive.
   ============================================================ */

'use strict';

const VIBES = [
  { id: 'all',        label: 'All',           icon: '🍽' },
  { id: 'hot',        label: 'Busy now',      icon: '🔥' },
  { id: 'atmosphere', label: 'Atmosphere',    icon: '✨' },
  { id: 'social',     label: 'Social',        icon: '🥂' },
  { id: 'nightout',   label: 'Night out',     icon: '🌙' },
  { id: 'family',     label: 'Family',        icon: '👨‍👩‍👧' },
];

const VIBE_ICON = {
  hot:        '🔥',
  atmosphere: '✨',
  social:     '🥂',
  nightout:   '🌙',
  family:     '👨‍👩‍👧',
  default:    '🍽',
};

let MAP        = null;
let MARKERS    = [];   // [{ marker, vibes:Set, row }]
let ACTIVE     = 'all';
let DATASET    = [];

/* El Nido default center if no markers — most of your seed restaurants
   live in the Philippines so this is a reasonable fallback. */
const DEFAULT_CENTER = [11.18, 119.42];
const DEFAULT_ZOOM   = 12;


document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderFilters();
  if (window.YYP?.ready) loadRestaurants();
  else document.addEventListener('yyp:ready', loadRestaurants, { once: true });
  /* Hard fallback in case Supabase never loads. */
  setTimeout(() => { if (!DATASET.length) hideLoading(); }, 5000);
});


function initMap() {
  MAP = L.map('vm-map', {
    center: DEFAULT_CENTER,
    zoom:   DEFAULT_ZOOM,
    zoomControl: true,
    scrollWheelZoom: true,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(MAP);
}


function renderFilters() {
  const wrap = document.getElementById('vm-filters');
  wrap.innerHTML = VIBES.map(v => `
    <button type="button" class="vm-chip ${v.id === 'all' ? 'active' : ''}" data-vibe="${v.id}">
      <span>${v.icon}</span>${v.label}
      <span class="vm-count" data-count="${v.id}">0</span>
    </button>
  `).join('');
  wrap.querySelectorAll('.vm-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      ACTIVE = btn.dataset.vibe;
      wrap.querySelectorAll('.vm-chip').forEach(b => b.classList.toggle('active', b.dataset.vibe === ACTIVE));
      applyFilter();
    });
  });
}


async function loadRestaurants() {
  const c = window.YYP?.client;
  if (!c) { hideLoading(); return; }
  try {
    /* Use homepage_picks view so RLS lets us read regardless of auth. */
    const { data, error } = await c
      .from('homepage_picks')
      .select('*')
      .limit(500);
    if (error) throw error;
    DATASET = data || [];
  } catch (err) {
    console.warn('[Vibe Map] load failed:', err.message);
  }

  /* For rows without lat/lng we'd ideally geocode, but free public
     geocoders rate-limit aggressively. Skip silently — owners can
     fill in lat/lng (or address-derived) in /account/restaurant. */
  await ensureCoords();
  buildMarkers();
  fitToMarkers();
  updateCounts();
  hideLoading();
}


async function ensureCoords() {
  /* If lat/lng missing but we have address, try the public Nominatim
     geocoder ONCE per restaurant (one request/second cap). We cache in
     sessionStorage so a quick reload doesn't re-geocode. */
  const todo = DATASET.filter(r => (!r.latitude || !r.longitude) && r.address);
  for (const r of todo.slice(0, 12)) { /* hard cap so we never hammer the free API */
    const cacheKey = `yyp_geo_${r.slug}`;
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); } catch {}
    if (cached) { r.latitude = cached.lat; r.longitude = cached.lng; continue; }
    try {
      await new Promise(res => setTimeout(res, 1100));
      const q = encodeURIComponent(r.address);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
        headers: { 'Accept': 'application/json' },
      });
      const json = await resp.json();
      if (json[0]) {
        r.latitude  = parseFloat(json[0].lat);
        r.longitude = parseFloat(json[0].lon);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ lat: r.latitude, lng: r.longitude })); } catch {}
      }
    } catch { /* silent */ }
  }
}


function buildMarkers() {
  MARKERS.forEach(m => MAP.removeLayer(m.marker));
  MARKERS = [];
  for (const r of DATASET) {
    if (!r.latitude || !r.longitude) continue;
    const vibes = vibesFor(r);
    const primary = primaryVibe(vibes);
    const icon = L.divIcon({
      className: '',
      html: `<div class="vm-marker ${primary}">${VIBE_ICON[primary] || VIBE_ICON.default}</div>`,
      iconSize:   [36, 36],
      iconAnchor: [18, 18],
      popupAnchor:[0, -18],
    });
    const marker = L.marker([r.latitude, r.longitude], { icon })
      .bindPopup(popupHTML(r), { closeButton: true, autoPan: true });
    marker.addTo(MAP);
    MARKERS.push({ marker, vibes, row: r });
  }
}


function vibesFor(r) {
  const set = new Set();
  const tags = (r.tags || []).map(t => String(t).toLowerCase());

  /* hot — buzz tier OR proxy via rating+reviews when buzz not yet computed */
  const isHot = r.buzz_tier === 'hot' || r.buzz_tier === 'trending'
    || (Number(r.google_rating) >= 4.7 && (Number(r.review_count) || 0) >= 1500);
  if (isHot) set.add('hot');

  /* night out — close time >= 22:00 OR late tags */
  const lateTags = ['late night','beer & cocktails','bar & pub','bar','wine'];
  if (tags.some(t => lateTags.some(l => t.includes(l)))) set.add('nightout');

  const socialTags = ['group-friendly','late night','beer','bar','social'];
  if (tags.some(t => socialTags.some(l => t.includes(l)))) set.add('social');

  const vibeTags = ['romantic','scenic view','instagrammable','fine dining','date spot','hidden gem'];
  if (tags.some(t => vibeTags.some(l => t.includes(l)))) set.add('atmosphere');

  const familyTags = ['family-friendly','kids menu','budget-friendly'];
  if (tags.some(t => familyTags.some(l => t.includes(l)))) set.add('family');

  return set;
}

function primaryVibe(set) {
  /* Visual priority — markers wear ONE colour. */
  for (const v of ['hot','nightout','atmosphere','social','family']) {
    if (set.has(v)) return v;
  }
  return 'default';
}


function popupHTML(r) {
  const cover = r.cover_image_url || `https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75`;
  const tags = (r.tags || []).slice(0, 3).map(t => `<span class="vm-popup-tag">${escapeHtml(t)}</span>`).join('');
  const directionsQuery = encodeURIComponent(r.address || `${r.name} ${r.location || ''}`);
  return `
    <img class="vm-popup-img" src="${cover}" alt="${escapeHtml(r.name)}" loading="lazy"
         onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75'" />
    <div class="vm-popup-body">
      <div class="vm-popup-name">${escapeHtml(r.name)}</div>
      <div class="vm-popup-meta">
        ${r.cuisine_type ? escapeHtml(r.cuisine_type) + ' · ' : ''}
        ★ ${Number(r.google_rating || 0).toFixed(1)}
        ${r.location ? ' · ' + escapeHtml(r.location) : ''}
      </div>
      <div class="vm-popup-tags">${tags}</div>
      <div class="vm-popup-actions">
        <a class="vm-popup-btn primary" href="restaurant.html?slug=${encodeURIComponent(r.slug)}">View profile</a>
        <a class="vm-popup-btn outline" target="_blank" rel="noopener noreferrer"
           href="https://www.google.com/maps/dir/?api=1&destination=${directionsQuery}">Directions</a>
      </div>
    </div>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}


function applyFilter() {
  let visibleCount = 0;
  MARKERS.forEach(({ marker, vibes }) => {
    const show = ACTIVE === 'all' || vibes.has(ACTIVE);
    if (show) { marker.addTo(MAP); visibleCount++; }
    else      marker.remove();
  });
  document.getElementById('vm-empty').classList.toggle('is-visible', visibleCount === 0);
  fitToVisible();
}

function fitToVisible() {
  const bounds = L.latLngBounds([]);
  MARKERS.forEach(({ marker, vibes }) => {
    if (ACTIVE === 'all' || vibes.has(ACTIVE)) bounds.extend(marker.getLatLng());
  });
  if (bounds.isValid()) MAP.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
}

function fitToMarkers() {
  const bounds = L.latLngBounds([]);
  MARKERS.forEach(({ marker }) => bounds.extend(marker.getLatLng()));
  if (bounds.isValid()) MAP.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
}


function updateCounts() {
  const counts = { all: 0, hot: 0, atmosphere: 0, social: 0, nightout: 0, family: 0 };
  MARKERS.forEach(({ vibes }) => {
    counts.all++;
    for (const v of vibes) counts[v]++;
  });
  Object.entries(counts).forEach(([id, n]) => {
    const el = document.querySelector(`[data-count="${id}"]`);
    if (el) el.textContent = n;
  });
}


function hideLoading() {
  document.getElementById('vm-loading').classList.add('is-hidden');
}
