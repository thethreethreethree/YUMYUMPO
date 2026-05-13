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
let MARKERS    = [];   // [{ marker, vibes:Set, row, region }]
let ACTIVE     = 'all';
let REGION     = 'el-nido';   // default region; expands as new locations come in
let DATASET    = [];
let REGIONS    = [];   // [{ key, label, count }]

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
    /* Query `restaurants` directly — homepage_picks view omits lat/lng,
       which silently dropped every marker. Public-read policy from
       migration-001 allows anon SELECT on active rows. */
    const { data, error } = await c
      .from('restaurants')
      .select(`
        id, slug, name, tagline, description, cuisine_type,
        location, address, latitude, longitude,
        google_rating, review_count,
        cover_image_url, logo_image_url, website_url,
        has_yumyumpo_site, is_featured, ai_summary, rank_label, created_at,
        restaurant_tags ( tag_name )
      `)
      .eq('is_active', true)
      .limit(500);
    if (error) throw error;
    /* Fetch live buzz tiers if migration-005 is applied; silently
       fall through if the RPC doesn't exist yet. */
    let buzzBySlug = {};
    try {
      const { data: buzz, error: bErr } = await c.rpc('restaurant_buzz_tiers');
      if (!bErr && Array.isArray(buzz)) {
        buzz.forEach(b => { if (b.slug) buzzBySlug[b.slug] = b.buzz_tier; });
      }
    } catch {}

    DATASET = (data || []).map(r => ({
      ...r,
      tags: Array.isArray(r.restaurant_tags) ? r.restaurant_tags.map(t => t.tag_name) : [],
      buzz_tier: buzzBySlug[r.slug] || null,
    }));
    console.info(`[Vibe Map] loaded ${DATASET.length} active restaurants`);
  } catch (err) {
    console.warn('[Vibe Map] load failed:', err.message);
  }

  /* Geocode any rows missing lat/lng via the OSM Nominatim API. Cached
     in sessionStorage so a quick reload doesn't re-geocode. */
  await ensureCoords();

  /* Diagnostic — surface anything still un-pinnable. */
  const skipped = DATASET.filter(r => !r.latitude || !r.longitude);
  if (skipped.length) {
    console.warn(`[Vibe Map] ${skipped.length} restaurants have no coords (filled neither lat/lng nor a geocodable address):`,
      skipped.map(r => `${r.name} — "${r.address || r.location || '(none)'}"`));
  }

  buildMarkers();
  buildRegions();
  applyFilter();
  hideLoading();
}


/* ── Region grouping ─────────────────────────────────────────
   We derive regions from the `location` field by taking what
   comes after the comma (or the whole string if no comma).
   "El Nido, Palawan" → "El Nido"
   "Coron, Palawan"   → "Coron"
   When new restaurants are added in other cities, they appear
   automatically — no code change required. */
function regionKey(loc) {
  if (!loc) return 'other';
  const first = String(loc).split(',')[0].trim();
  return first.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g,'') || 'other';
}
function regionLabel(loc) {
  if (!loc) return 'Other';
  return String(loc).split(',')[0].trim() || 'Other';
}

function buildRegions() {
  const map = new Map();
  MARKERS.forEach(({ row, region }) => {
    const key = region.key;
    if (!map.has(key)) map.set(key, { key, label: region.label, count: 0 });
    map.get(key).count++;
  });
  REGIONS = [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const sel = document.getElementById('vm-region');
  const totalWithCoords = MARKERS.length;
  sel.innerHTML =
    `<option value="all">All regions (${totalWithCoords})</option>` +
    REGIONS.map(r => `<option value="${r.key}">${r.label} (${r.count})</option>`).join('');

  /* Default selection: prefer El Nido if present, else first region. */
  if (REGIONS.some(r => r.key === 'el-nido')) REGION = 'el-nido';
  else if (REGIONS.length)                    REGION = REGIONS[0].key;
  else                                         REGION = 'all';
  sel.value = REGION;

  sel.onchange = () => { REGION = sel.value; applyFilter(); };
}


async function ensureCoords() {
  /* If lat/lng missing, try the public Nominatim geocoder. We try several
     query variants in order of specificity so very local addresses
     ("Pops District, Corong-Corong") fall back to the city.
     Nominatim policy: 1 req/sec — we wait between attempts. */
  const todo = DATASET.filter(r => (!r.latitude || !r.longitude) && (r.address || r.location));
  for (const r of todo.slice(0, 30)) {
    const cacheKey = `yyp_geo_${r.slug}`;
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); } catch {}
    if (cached) { r.latitude = cached.lat; r.longitude = cached.lng; continue; }

    const queries = [
      r.address,
      r.address && r.location ? `${r.address}, ${r.location}` : null,
      r.location,
      r.location ? `${r.name} ${r.location}` : null,
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    for (const q of queries) {
      try {
        await new Promise(res => setTimeout(res, 1100));
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept': 'application/json' } }
        );
        const json = await resp.json();
        if (json[0]) {
          r.latitude  = parseFloat(json[0].lat);
          r.longitude = parseFloat(json[0].lon);
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ lat: r.latitude, lng: r.longitude })); } catch {}
          console.info(`[Vibe Map] geocoded "${r.name}" via "${q}" → ${r.latitude.toFixed(4)},${r.longitude.toFixed(4)}`);
          break;
        }
      } catch { /* try next variant */ }
    }
  }
}


/* Prominence score — drives marker size + draw order so the best places
   are surfaced first. Combines every public-data signal we have today:
     • Google rating (1–5)            up to 40 pts
     • Review count (log-scaled)      up to 30 pts
     • Buzz tier (live engagement)    up to 15 pts
     • Featured / has YUMYUMPO site    up to 10 pts
   Tier thresholds are percentile-aware once we have >10 restaurants,
   so a quiet city's #1 still ranks "premium" relative to its peers. */
function prominenceScore(r) {
  const rating  = Number(r.google_rating) || 0;
  const reviews = Number(r.review_count)  || 0;
  let score = 0;
  if (rating > 3)         score += Math.min(40, (rating - 3) * 20);
  if (reviews > 0)        score += Math.min(30, Math.log10(reviews + 1) * 12);
  if (r.buzz_tier === 'hot')      score += 15;
  else if (r.buzz_tier === 'trending') score += 8;
  if (r.is_featured)      score += 6;
  if (r.has_yumyumpo_site) score += 4;
  return Math.round(score);
}

function prominenceTier(score, allScores) {
  /* Percentile-aware once the dataset is large enough; falls back to
     absolute thresholds when fewer than 8 restaurants exist. */
  if (allScores.length >= 8) {
    const sorted = [...allScores].sort((a, b) => a - b);
    const pct = sorted.indexOf(score) / (sorted.length - 1);
    if (pct >= 0.85) return 'premium';
    if (pct >= 0.55) return 'prominent';
    return 'standard';
  }
  if (score >= 55) return 'premium';
  if (score >= 30) return 'prominent';
  return 'standard';
}

function buildMarkers() {
  MARKERS.forEach(m => MAP.removeLayer(m.marker));
  MARKERS = [];

  /* First pass — compute prominence so we can tier + sort. */
  const scored = DATASET
    .filter(r => r.latitude && r.longitude)
    .map(r => ({ row: r, score: prominenceScore(r) }));
  const allScores = scored.map(s => s.score);

  /* Higher-score markers added LAST so they layer above lesser ones. */
  scored.sort((a, b) => a.score - b.score);

  for (const { row: r, score } of scored) {
    const vibes   = vibesFor(r);
    const primary = primaryVibe(vibes);
    const tier    = prominenceTier(score, allScores);
    const icon = L.divIcon({
      className: '',
      html: `<div class="vm-marker ${primary} tier-${tier}">${VIBE_ICON[primary] || VIBE_ICON.default}</div>`,
      iconSize:   tier === 'premium' ? [46, 46] : tier === 'prominent' ? [40, 40] : [34, 34],
      iconAnchor: tier === 'premium' ? [23, 23] : tier === 'prominent' ? [20, 20] : [17, 17],
      popupAnchor: [0, -18],
    });
    /* zIndexOffset surfaces premium pins above any overlap. */
    const zOffset = tier === 'premium' ? 1000 : tier === 'prominent' ? 400 : 0;
    const marker = L.marker([r.latitude, r.longitude], { icon, zIndexOffset: zOffset })
      .bindPopup(popupHTML(r, { score, tier }), { closeButton: true, autoPan: true });
    marker.addTo(MAP);
    MARKERS.push({
      marker, vibes, row: r, score, tier,
      region: { key: regionKey(r.location), label: regionLabel(r.location) },
    });
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


function popupHTML(r, ext = {}) {
  const cover = r.cover_image_url || `https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75`;
  const tags = (r.tags || []).slice(0, 3).map(t => `<span class="vm-popup-tag">${escapeHtml(t)}</span>`).join('');
  const directionsQuery = encodeURIComponent(r.address || `${r.name} ${r.location || ''}`);
  const tierBadge = ext.tier === 'premium'
    ? `<span class="vm-popup-tier vm-popup-tier-premium">★ Top pick</span>`
    : ext.tier === 'prominent'
      ? `<span class="vm-popup-tier vm-popup-tier-prominent">Recommended</span>`
      : '';
  return `
    <img class="vm-popup-img" src="${cover}" alt="${escapeHtml(r.name)}" loading="lazy"
         onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75'" />
    <div class="vm-popup-body">
      <div class="vm-popup-name">${escapeHtml(r.name)} ${tierBadge}</div>
      <div class="vm-popup-meta">
        ${r.cuisine_type ? escapeHtml(r.cuisine_type) + ' · ' : ''}
        ★ ${Number(r.google_rating || 0).toFixed(1)}
        ${r.review_count ? ` (${Number(r.review_count).toLocaleString()})` : ''}
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
  MARKERS.forEach(({ marker, vibes, region }) => {
    const vibeOk   = ACTIVE === 'all' || vibes.has(ACTIVE);
    const regionOk = REGION === 'all' || region.key === REGION;
    const show     = vibeOk && regionOk;
    if (show) { marker.addTo(MAP); visibleCount++; }
    else      marker.remove();
  });
  document.getElementById('vm-empty').classList.toggle('is-visible', visibleCount === 0);
  /* Update region meta line */
  const meta = document.getElementById('vm-region-meta');
  if (meta) meta.textContent = visibleCount ? `${visibleCount} place${visibleCount > 1 ? 's' : ''} shown` : '';
  /* Per-vibe live counts respect the selected region */
  updateCounts();
  fitToVisible();
}

function fitToVisible() {
  const bounds = L.latLngBounds([]);
  MARKERS.forEach(({ marker, vibes, region }) => {
    const vibeOk   = ACTIVE === 'all' || vibes.has(ACTIVE);
    const regionOk = REGION === 'all' || region.key === REGION;
    if (vibeOk && regionOk) bounds.extend(marker.getLatLng());
  });
  if (bounds.isValid()) {
    MAP.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  } else if (REGION === 'el-nido') {
    /* Fallback when El Nido has no markers yet — keep the user oriented. */
    MAP.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }
}

function fitToMarkers() {
  const bounds = L.latLngBounds([]);
  MARKERS.forEach(({ marker }) => bounds.extend(marker.getLatLng()));
  if (bounds.isValid()) MAP.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
}


function updateCounts() {
  const counts = { all: 0, hot: 0, atmosphere: 0, social: 0, nightout: 0, family: 0 };
  MARKERS.forEach(({ vibes, region }) => {
    if (REGION !== 'all' && region.key !== REGION) return;
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
