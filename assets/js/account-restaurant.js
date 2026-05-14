/* ============================================================
   YUMYUMPO — Restaurant Owner Dashboard
   Loads the restaurant owned by the signed-in user (or, if admin,
   any restaurant via ?slug=) and lets them edit every field shown
   on the public profile page.
   ============================================================ */

'use strict';

const MAX_GALLERY      = 4;   // venue gallery — matches Maria's Kitchen reference
const MAX_FOOD_GALLERY = 6;   // food gallery
const VIBE_TAG_PRESETS = [
  'Local Favorite','Family-Friendly','Budget-Friendly','Backpacker-Approved',
  'Hidden Gem','Romantic','Date Spot','Late Night','Group-Friendly',
  'Instagrammable','Scenic View','Beach Dining','WiFi-Friendly',
  'Outdoor Seating','Vegan','Healthy','Must Try','Chef Special',
  'Fine Dining','Tourist Favorite',
];
const BUCKET = 'restaurant-photos';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

let restaurant = null;
let pendingGallery = [];
let pendingFoodGallery = [];
let pendingVibeTags = new Set();   // selected lifestyle tag names
let hours = {};          // day_of_week -> { is_closed, open_time, close_time }
let categories = [];     // [{id?, name, sort_order, items:[{id?, name, price, description, sort_order}]}]
let dirty = false;
let isAdminUser = false;


document.addEventListener('DOMContentLoaded', () => {
  if (window.YYP?.ready) init();
  else document.addEventListener('yyp:ready', init, { once: true });
});


async function init() {
  const c = window.YYP?.client;
  if (!c) return showGate();
  const { data: { user } } = await c.auth.getUser();
  if (!user) return showGate();

  /* Admin override: if ?slug= present AND user is admin, edit that restaurant. */
  const params = new URLSearchParams(location.search);
  const overrideSlug = params.get('slug');

  isAdminUser = await checkIsAdmin(c);

  let row = null;
  if (overrideSlug && isAdminUser) {
    const { data, error } = await c.from('restaurants').select('*').eq('slug', overrideSlug).maybeSingle();
    if (error) { console.error('[Owner] override fetch:', error); }
    row = data;
  } else {
    const { data, error } = await c.rpc('get_my_restaurant');
    if (error) { console.error('[Owner] get_my_restaurant:', error); }
    row = Array.isArray(data) ? data[0] : data;
  }

  if (!row) return showNoRestaurant();

  restaurant = row;
  pendingGallery     = Array.isArray(row.gallery_urls)      ? [...row.gallery_urls]      : [];
  pendingFoodGallery = Array.isArray(row.food_gallery_urls) ? [...row.food_gallery_urls] : [];

  await loadHours(c, row.id);
  await loadMenu(c, row.id);
  await loadVibeTags(c, row.id);

  populateForm();
  wireEvents();
  showMain();
}


async function checkIsAdmin(c) {
  try {
    const { data } = await c.rpc('is_admin');
    return !!data;
  } catch { return false; }
}


/* ── UI states ───────────────────────────────────────────── */
function showGate()        { document.getElementById('auth-gate').style.display = 'block'; }
function showNoRestaurant(){ document.getElementById('no-restaurant').style.display = 'block'; }
function showMain()        { document.getElementById('main').style.display = 'block'; }


/* ── Populate form ───────────────────────────────────────── */
function populateForm() {
  document.getElementById('rest-name').textContent = restaurant.name || 'Your restaurant';
  const publicLink = document.getElementById('public-link');
  publicLink.href = `../restaurant.html?slug=${restaurant.slug}`;
  publicLink.textContent = `yumyumpo.vercel.app/restaurant?slug=${restaurant.slug}`;

  const fields = ['name','cuisine_type','google_rating','review_count','tagline','description','location','address','latitude','longitude','map_embed_url','directions_url','phone','website_url','whatsapp_url','instagram_url','facebook_url','messenger_url'];
  fields.forEach(name => {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) el.value = restaurant[name] ?? '';
  });

  const slugEl = document.getElementById('ro-slug');
  if (slugEl) slugEl.textContent = restaurant.slug || '—';

  renderCover();
  renderLogo();
  renderGallery();
  renderFoodGalleryUI();
  renderVibeTags();
  renderHours();
  renderMenu();
}

function renderCover() {
  paintDropZone('cover-dz', restaurant.cover_image_url, {
    icon: '🏞️', title: 'Drop your cover photo', hint: 'or click to choose · JPG / PNG / WebP · 16:9',
  });
}

function renderLogo() {
  paintDropZone('logo-dz', restaurant.logo_image_url, {
    icon: '⭐', title: 'Drop your logo', hint: 'optional · square works best',
  });
}

function paintDropZone(id, url, copy) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = url
    ? `<img src="${url}" alt="" class="dz-img" /><div class="dz-replace">Click or drop a new image to replace</div>`
    : `<div class="dz-empty">
         <div class="dz-icon">${copy.icon}</div>
         <div class="dz-title">${copy.title}</div>
         <div class="dz-hint">${copy.hint}</div>
       </div>`;
}

function renderGallery() {
  renderPhotoStrip('gallery-grid', 'gallery-count', 'gallery-file', pendingGallery, MAX_GALLERY, 'removeGalleryPhoto');
}
function renderFoodGalleryUI() {
  renderPhotoStrip('food-gallery-grid', 'food-gallery-count', 'food-gallery-file', pendingFoodGallery, MAX_FOOD_GALLERY, 'removeFoodGalleryPhoto');
}

function renderPhotoStrip(gridId, countId, fileId, list, max, removeFn) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = list.map((url, i) => `
    <div class="photo-tile" data-idx="${i}">
      <img src="${url}" alt="">
      <button type="button" class="photo-remove" onclick="${removeFn}(${i})" aria-label="Remove">×</button>
    </div>
  `).join('');
  if (list.length < max) {
    grid.insertAdjacentHTML('beforeend', `
      <div class="photo-add" onclick="document.getElementById('${fileId}').click()">
        <span style="font-size:1.6rem;line-height:1">＋</span><span>Add photo</span>
      </div>`);
  }
  const countEl = document.getElementById(countId);
  if (countEl) countEl.textContent = `${list.length} / ${max} photos`;
}


/* ── Vibe tags (restaurant_tags rows) ────────────────────── */
async function loadVibeTags(c, restaurantId) {
  const { data } = await c.from('restaurant_tags').select('tag_name').eq('restaurant_id', restaurantId);
  pendingVibeTags = new Set((data || []).map(t => t.tag_name));
}

function renderVibeTags() {
  const wrap = document.getElementById('vibe-tag-picker');
  if (!wrap) return;
  const all = Array.from(new Set([...VIBE_TAG_PRESETS, ...pendingVibeTags]));
  wrap.innerHTML = all.map(t => `
    <button type="button" class="vibe-chip ${pendingVibeTags.has(t) ? 'active' : ''}" data-tag="${escapeAttr(t)}">${t}</button>
  `).join('');
  wrap.querySelectorAll('.vibe-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tag;
      if (pendingVibeTags.has(t)) pendingVibeTags.delete(t);
      else                         pendingVibeTags.add(t);
      btn.classList.toggle('active');
      markDirty();
    });
  });
}


/* ── Hours ───────────────────────────────────────────────── */
async function loadHours(c, restaurantId) {
  const { data } = await c.from('operating_hours')
    .select('day_of_week, open_time, close_time, is_closed')
    .eq('restaurant_id', restaurantId);
  hours = {};
  DAYS.forEach(d => { hours[d] = { day_of_week:d, open_time:'09:00', close_time:'21:00', is_closed:false }; });
  (data || []).forEach(r => {
    hours[r.day_of_week] = {
      day_of_week: r.day_of_week,
      open_time:   r.open_time  ? r.open_time.slice(0,5)  : '09:00',
      close_time:  r.close_time ? r.close_time.slice(0,5) : '21:00',
      is_closed:   !!r.is_closed,
    };
  });
}

function renderHours() {
  const wrap = document.getElementById('hours-rows');
  wrap.innerHTML = DAYS.map(d => {
    const h = hours[d];
    return `
      <div class="hour-row ${h.is_closed ? 'closed' : ''}" data-day="${d}">
        <div class="day">${d.slice(0,3)}</div>
        <input type="time" value="${h.open_time}"  data-field="open_time"  ${h.is_closed?'disabled':''} />
        <input type="time" value="${h.close_time}" data-field="close_time" ${h.is_closed?'disabled':''} />
        <label class="flex items-center gap-1 text-xs font-semibold text-gray-600 cursor-pointer">
          <input type="checkbox" data-field="is_closed" ${h.is_closed?'checked':''} class="accent-brand-yellow" />
          Closed
        </label>
      </div>`;
  }).join('');
  wrap.querySelectorAll('.hour-row').forEach(row => {
    const day = row.dataset.day;
    row.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        const f = input.dataset.field;
        hours[day][f] = (input.type === 'checkbox') ? input.checked : input.value;
        if (f === 'is_closed') renderHours();
        markDirty();
      });
    });
  });
}


/* ── Menu ────────────────────────────────────────────────── */
async function loadMenu(c, restaurantId) {
  const { data: cats } = await c.from('menu_categories')
    .select('id, name, sort_order')
    .eq('restaurant_id', restaurantId)
    .order('sort_order');
  const { data: items } = await c.from('menu_items')
    .select('id, menu_category_id, name, description, price, price_note, image_url, gallery_urls, tags, sort_order, is_available')
    .eq('restaurant_id', restaurantId)
    .order('sort_order');

  categories = (cats || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order || 0,
    items: (items || [])
      .filter(it => it.menu_category_id === cat.id)
      .map(it => {
        const gallery = Array.isArray(it.gallery_urls) ? [...it.gallery_urls] : [];
        if (!gallery.length && it.image_url) gallery.push(it.image_url);
        return {
          id: it.id,
          name:        it.name,
          description: it.description || '',
          price:       it.price || '',
          photos:      gallery.slice(0, 3),
          tags:        Array.isArray(it.tags) ? it.tags : [],
          sort_order:  it.sort_order || 0,
          is_available: it.is_available !== false,
        };
      }),
  }));
}

const MAX_ITEM_PHOTOS = 3;

function renderMenu() {
  const wrap = document.getElementById('menu-categories');
  if (!categories.length) {
    wrap.innerHTML = '<p class="text-sm text-gray-400 italic">No categories yet. Click "+ Add category" above.</p>';
    return;
  }
  wrap.innerHTML = categories.map((cat, ci) => `
    <div class="menu-cat" data-ci="${ci}">
      <div class="menu-cat-head">
        <input class="menu-cat-name" list="cat-suggestions" value="${escapeAttr(cat.name)}" placeholder="Category name — pick a preset or type your own" data-ci="${ci}" data-cat-field="name" />
        <button type="button" class="btn-tiny" title="Delete category" onclick="deleteCategory(${ci})">🗑</button>
      </div>
      ${cat.items.map((it, ii) => `
        <div class="menu-item">
          <div class="mi-photos">
            ${(it.photos || []).map((url, pi) => `
              <div class="mi-photo">
                <img src="${url}" alt="">
                <button type="button" class="mi-photo-remove" onclick="removeItemPhoto(${ci},${ii},${pi})" aria-label="Remove">×</button>
              </div>
            `).join('')}
            ${(it.photos || []).length < 3 ? `
              <div class="mi-photo mi-photo-add" onclick="addItemPhoto(${ci},${ii})" title="Add photo">＋</div>
            ` : ''}
          </div>
          <div class="mi-fields">
            <div class="mi-row1">
              <input value="${escapeAttr(it.name)}"  placeholder="Item name"      data-ci="${ci}" data-ii="${ii}" data-item-field="name" />
              <input value="${escapeAttr(it.price)}" placeholder="₱180"           data-ci="${ci}" data-ii="${ii}" data-item-field="price" />
            </div>
            <input value="${escapeAttr(it.price_note || '')}" placeholder="Price note — e.g., 'good for 2', '/ slice'" data-ci="${ci}" data-ii="${ii}" data-item-field="price_note" style="font-size:0.75rem;" />
            <textarea class="mi-desc" rows="2" placeholder="Short description (optional)" data-ci="${ci}" data-ii="${ii}" data-item-field="description">${escapeAttr(it.description)}</textarea>
            <input class="mi-tags" value="${escapeAttr((it.tags || []).join(', '))}" placeholder="Tags (Best Seller, Spicy, Chef Special) — comma separated" data-ci="${ci}" data-ii="${ii}" data-item-field="tags" />
          </div>
          <button type="button" class="btn-tiny" title="Delete item" onclick="deleteItem(${ci},${ii})">×</button>
        </div>
      `).join('')}
      <button type="button" class="text-xs font-bold text-yellow-600 underline mt-1" onclick="addItem(${ci})">+ Add item</button>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-cat-field]').forEach(el => {
    el.addEventListener('input', () => {
      categories[+el.dataset.ci].name = el.value;
      markDirty();
    });
  });
  wrap.querySelectorAll('[data-item-field]').forEach(el => {
    el.addEventListener('input', () => {
      const ci = +el.dataset.ci, ii = +el.dataset.ii;
      const field = el.dataset.itemField;
      if (field === 'tags') {
        categories[ci].items[ii].tags = el.value.split(',').map(t => t.trim()).filter(Boolean);
      } else {
        categories[ci].items[ii][field] = el.value;
      }
      markDirty();
    });
  });
}

window.addItemPhoto = function(ci, ii) {
  const item = categories[ci]?.items?.[ii];
  if (!item) return;
  if ((item.photos || []).length >= MAX_ITEM_PHOTOS) return toast(`Up to ${MAX_ITEM_PHOTOS} photos per item.`);
  let input = document.getElementById('item-photo-input');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.id = 'item-photo-input';
    input.style.display = 'none';
    document.body.appendChild(input);
  }
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('File too big — 5MB max.');
    const url = await uploadToBucket(file);
    if (!url) return;
    item.photos = (item.photos || []).concat(url).slice(0, MAX_ITEM_PHOTOS);
    renderMenu();
    markDirty();
    input.value = '';
  };
  input.click();
};

window.removeItemPhoto = function(ci, ii, pi) {
  const item = categories[ci]?.items?.[ii];
  if (!item) return;
  item.photos = (item.photos || []).filter((_, idx) => idx !== pi);
  renderMenu();
  markDirty();
};

function escapeAttr(s) { return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

/* Parse coordinates from a pasted Google Maps URL or "lat, lng" pair.
   Returns {lat, lng} or null. Handles the common URL shapes:
     /@<lat>,<lng>,<zoom>z
     !3d<lat>!4d<lng>          (data parameter)
     ?q=<lat>,<lng>            (older share format)
     "11.181, 119.419"         (plain text fallback) */
function extractGmapsCoords(text) {
  if (!text) return null;
  const tryPair = (a, b) => {
    const lat = parseFloat(a), lng = parseFloat(b);
    if (Number.isFinite(lat) && Number.isFinite(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    return null;
  };
  let m;
  if ((m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)))          return tryPair(m[1], m[2]);
  if ((m = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)))      return tryPair(m[1], m[2]);
  if ((m = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)))     return tryPair(m[1], m[2]);
  if ((m = text.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)))    return tryPair(m[1], m[2]);
  if ((m = text.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/))) return tryPair(m[1], m[2]);
  return null;
}


/* ── URL normalisers — convert friendly input into proper URLs ── */
function normalizeUrl(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://' + v.replace(/^\/+/, '');
}

function normalizeWhatsapp(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;           // already a URL
  let digits = v.replace(/[^\d]/g, '');             // strip + spaces dashes
  if (!digits) return '';
  // PH numbers commonly entered as "+63 0921 ..." — drop the trunk 0 after country code
  if (digits.startsWith('630')) digits = '63' + digits.slice(3);
  // If user entered just a local "09..." number, assume PH (+63)
  if (digits.startsWith('0'))   digits = '63' + digits.slice(1);
  return 'https://wa.me/' + digits;
}

function normalizeInstagram(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^instagram\.com\//i, '');
  return 'https://instagram.com/' + handle;
}


/* Block the browser's default "open the file" behaviour for stray drops
   outside our drop zones (otherwise the page navigates away and the
   user loses unsaved edits — including a half-completed upload). */
['dragover','drop'].forEach(ev => {
  window.addEventListener(ev, e => {
    if (e.target.closest('.dz, #gallery-grid, #food-gallery-grid')) return;
    e.preventDefault();
  });
});

/* ── Wire events ─────────────────────────────────────────── */
function wireEvents() {
  document.getElementById('owner-form').addEventListener('input', e => {
    if (e.target.closest('.menu-cat')) return; // menu inputs handle their own dirty
    if (e.target.closest('.hour-row')) return;
    markDirty();
  });

  document.getElementById('cover-file').addEventListener('change', e => handleSingleUpload(e, 'cover'));
  document.getElementById('logo-file').addEventListener('change',  e => handleSingleUpload(e, 'logo'));
  document.getElementById('gallery-file').addEventListener('change', handleGalleryUpload);
  document.getElementById('food-gallery-file').addEventListener('change', handleFoodGalleryUpload);

  /* Drag & drop on the cover/logo zones */
  wireDropZone('cover-dz', 'cover-file', 'cover');
  wireDropZone('logo-dz',  'logo-file',  'logo');
  /* Drag & drop on the gallery grids too (drop anywhere in the grid) */
  wireGridDrop('gallery-grid',      'gallery-file',      handleGalleryUpload);
  wireGridDrop('food-gallery-grid', 'food-gallery-file', handleFoodGalleryUpload);

  document.getElementById('save-btn').addEventListener('click', save);
  document.getElementById('discard-btn').addEventListener('click', discard);

  document.getElementById('add-category-btn').addEventListener('click', () => {
    categories.push({ name:'', sort_order: categories.length, items:[] });
    renderMenu();
    markDirty();
  });

  /* Google Maps link → lat/lng auto-pin. Accepts: a full Google Maps
     URL (place/@lat,lng or !3dlat!4dlng), a shortened goo.gl/maps URL
     resolved into the address bar, or a plain "lat, lng" pair. */
  document.getElementById('gmaps-pin-btn')?.addEventListener('click', () => {
    const input = document.getElementById('gmaps-link');
    const result = document.getElementById('gmaps-result');
    const raw = (input?.value || '').trim();
    const coords = extractGmapsCoords(raw);
    if (!coords) {
      result.style.display = 'block';
      result.style.color   = '#DC2626';
      result.textContent   = 'Couldn\'t find coordinates in that link. Open the place in Google Maps, tap Share, copy the URL.';
      return;
    }
    const latInput = document.querySelector('[name="latitude"]');
    const lngInput = document.querySelector('[name="longitude"]');
    if (latInput) latInput.value = coords.lat.toFixed(6);
    if (lngInput) lngInput.value = coords.lng.toFixed(6);
    result.style.display = 'block';
    result.style.color   = '#15803D';
    result.textContent   = `✓ Pinned at ${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}° — Save Changes to apply.`;
    markDirty();
  });

  document.getElementById('hours-quickfill').addEventListener('click', () => {
    const mon = hours.Monday;
    ['Tuesday','Wednesday','Thursday','Friday'].forEach(d => {
      hours[d] = { ...mon, day_of_week: d };
    });
    renderHours();
    markDirty();
  });

  window.removeGalleryPhoto = removeGalleryPhoto;
  window.deleteCategory = i => { if (confirm('Delete this category and all its items?')) { categories.splice(i,1); renderMenu(); markDirty(); } };
  window.deleteItem     = (ci,ii) => { categories[ci].items.splice(ii,1); renderMenu(); markDirty(); };
  window.addItem        = ci => { categories[ci].items.push({ name:'', price:'', sort_order: categories[ci].items.length }); renderMenu(); markDirty(); };
}

function markDirty() {
  dirty = true;
  document.getElementById('save-bar').style.display = 'block';
}


/* ── Photo upload ────────────────────────────────────────── */
async function handleSingleUpload(e, kind) {
  const file = e.target.files?.[0]; if (!file) return;
  e.target.value = '';
  await processSingleFile(file, kind);
}

async function handleGalleryUpload(e) {
  const files = [...(e.target.files || [])]; if (!files.length) return;
  const slotsLeft = MAX_GALLERY - pendingGallery.length;
  if (slotsLeft <= 0) return toast(`You already have ${MAX_GALLERY} photos.`);
  for (const file of files.slice(0, slotsLeft)) {
    if (file.size > 5 * 1024 * 1024) { toast(`${file.name} skipped — over 5MB.`); continue; }
    const url = await uploadToBucket(file);
    if (url) pendingGallery.push(url);
  }
  renderGallery(); markDirty(); e.target.value = '';
}

function removeGalleryPhoto(idx)     { pendingGallery.splice(idx,1);     renderGallery();        markDirty(); }
function removeFoodGalleryPhoto(idx) { pendingFoodGallery.splice(idx,1); renderFoodGalleryUI();  markDirty(); }
window.removeFoodGalleryPhoto = removeFoodGalleryPhoto;

async function handleFoodGalleryUpload(e) {
  const files = [...(e.target.files || [])]; if (!files.length) return;
  const slotsLeft = MAX_FOOD_GALLERY - pendingFoodGallery.length;
  if (slotsLeft <= 0) return toast(`You already have ${MAX_FOOD_GALLERY} food photos.`);
  for (const file of files.slice(0, slotsLeft)) {
    if (file.size > 5 * 1024 * 1024) { toast(`${file.name} skipped — over 5MB.`); continue; }
    const url = await uploadToBucket(file);
    if (url) pendingFoodGallery.push(url);
  }
  renderFoodGalleryUI(); markDirty(); e.target.value = '';
}

function wireDropZone(zoneId, inputId, kind) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  ['dragenter','dragover'].forEach(ev => zone.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    zone.classList.add('is-dragover');
  }));
  ['dragleave','drop'].forEach(ev => zone.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    zone.classList.remove('is-dragover');
  }));
  zone.addEventListener('drop', async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await processSingleFile(file, kind);
  });
}

function wireGridDrop(gridId, inputId, handler) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  ['dragenter','dragover'].forEach(ev => grid.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    grid.classList.add('is-dragover');
  }));
  ['dragleave','drop'].forEach(ev => grid.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    grid.classList.remove('is-dragover');
  }));
  grid.addEventListener('drop', (e) => {
    const all = [...(e.dataTransfer?.files || [])];
    const files = all.filter(f => f.type?.startsWith('image/'));
    if (!files.length) {
      if (all.length) toast('Only image files are accepted.');
      return;
    }
    handler({ target: { files, value: '' } });
  });
}

async function processSingleFile(file, kind) {
  if (file.size > 5 * 1024 * 1024) return toast('File too big — 5MB max.');
  if (!file.type?.startsWith('image/')) return toast('Please drop an image file.');
  const url = await uploadToBucket(file);
  if (!url) return;
  if (kind === 'cover') { restaurant.cover_image_url = url; renderCover(); }
  if (kind === 'logo')  { restaurant.logo_image_url  = url; renderLogo();  }
  markDirty();
}

async function uploadToBucket(file) {
  const c = window.YYP.client;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${restaurant.slug}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await c.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) { toast('Upload failed: ' + error.message); return null; }
  const { data } = c.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}


/* ── Save / discard ──────────────────────────────────────── */
async function save() {
  if (!dirty) return;
  const c = window.YYP.client;
  const form = document.getElementById('owner-form');
  const fd = Object.fromEntries(new FormData(form));

  /* Build the transactional payload for save_owner_restaurant().
     One Postgres transaction — partial failures roll back cleanly. */
  const payload = {
    restaurant_id: restaurant.id,
    fields: {
      name:            (fd.name || restaurant.name || '').trim(),
      cuisine_type:    (fd.cuisine_type || restaurant.cuisine_type || '').trim(),
      google_rating:   fd.google_rating || '',
      review_count:    fd.review_count  || '',
      tagline:         fd.tagline       || null,
      description:     fd.description   || null,
      location:        fd.location      || null,
      address:         fd.address       || null,
      latitude:        fd.latitude  || '',
      longitude:       fd.longitude || '',
      map_embed_url:   sanitizeMapEmbed(fd.map_embed_url),
      directions_url:  fd.directions_url || null,
      phone:           fd.phone         || null,
      website_url:     normalizeUrl(fd.website_url)        || null,
      whatsapp_url:    normalizeWhatsapp(fd.whatsapp_url)  || null,
      instagram_url:   normalizeInstagram(fd.instagram_url)|| null,
      facebook_url:    normalizeUrl(fd.facebook_url)       || null,
      messenger_url:   normalizeUrl(fd.messenger_url)      || null,
      cover_image_url: restaurant.cover_image_url || null,
      logo_image_url:  restaurant.logo_image_url  || null,
      gallery_urls:      pendingGallery,
      food_gallery_urls: pendingFoodGallery,
    },
    hours: DAYS.map(d => ({
      day_of_week: d,
      open_time:   hours[d].is_closed ? '' : hours[d].open_time,
      close_time:  hours[d].is_closed ? '' : hours[d].close_time,
      is_closed:   !!hours[d].is_closed,
    })),
    categories: categories.map(cat => ({
      name: (cat.name || '').trim(),
      items: (cat.items || []).map(it => {
        const photos = Array.isArray(it.photos) ? it.photos.slice(0, 3) : [];
        return {
          name:         (it.name || '').trim(),
          description:  it.description || null,
          price:        it.price || null,
          price_note:   it.price_note || null,
          image_url:    photos[0] || null,
          gallery_urls: photos,
          tags:         Array.isArray(it.tags) ? it.tags : [],
          is_available: it.is_available !== false,
        };
      }),
    })),
    vibe_tags: [...pendingVibeTags],
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const { error } = await c.rpc('save_owner_restaurant', { payload });
  btn.disabled = false; btn.textContent = 'Save Changes';
  if (error) return toast('Save failed: ' + error.message);

  Object.assign(restaurant, payload.fields);
  dirty = false;
  document.getElementById('save-bar').style.display = 'none';
  toast('✓ Saved');
}

/* Whitelist map_embed_url to a known-safe Google Maps embed origin
   so an owner can't sneak attribute injection or javascript: URLs into
   the iframe on the public profile. */
function sanitizeMapEmbed(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!/^https:\/\/www\.google\.com\/maps\//i.test(trimmed)) return null;
  return trimmed;
}

function discard() {
  if (!confirm('Discard unsaved changes?')) return;
  location.reload();
}


/* ── Toast ───────────────────────────────────────────────── */
let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  toastTimer = setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 2400);
}
