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
let promoImageUrl = '';   // marketing image for the in-progress promo request


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
  await loadVibeTags(c, row.id);

  populateForm();
  wireEvents();
  showMain();
  /* Premium-only: surface the order inbox + poll every 20s. */
  loadOrders();
  ORDERS_POLL = setInterval(loadOrders, 20_000);
  loadPromos();
  renderMenuQR();
  wireOwnerTabs();
  loadDashAnalytics();
}


/* ── Dashboard / Edit-Profile view switcher ───────────────── */
function wireOwnerTabs() {
  document.querySelectorAll('.owner-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const v = tab.dataset.ownerview;   // 'dash' | 'profile'
      document.body.classList.toggle('owner-view-dash', v === 'dash');
      document.body.classList.toggle('owner-view-profile', v === 'profile');
      document.querySelectorAll('.owner-tab').forEach(t =>
        t.classList.toggle('active', t === tab));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}


/* ── Dashboard analytics overview ─────────────────────────── */
async function loadDashAnalytics() {
  const c = window.YYP?.client;
  const wrap = document.getElementById('dash-analytics');
  if (!c || !restaurant?.id || !wrap) return;

  const { data, error } = await c.rpc('get_restaurant_analytics', { p_restaurant_id: restaurant.id });
  if (error || !data) { wrap.innerHTML = '<p class="text-sm text-gray-400 italic col-span-full">Analytics will appear here as diners discover you.</p>'; return; }

  const t = data.traffic || {}, o = data.orders || {}, e = data.engagement || {}, b = data.buzz || {};
  const tile = (val, label) =>
    `<div style="background:#FAFAF7;border:1.5px solid #F3F3F3;border-radius:14px;padding:12px 14px">
       <div class="font-display" style="font-weight:800;font-size:1.5rem;color:#111;line-height:1">${val ?? 0}</div>
       <div style="font-size:.7rem;font-weight:700;color:#ABABAB;text-transform:uppercase;letter-spacing:.05em;margin-top:4px">${label}</div>
     </div>`;

  wrap.innerHTML =
    tile(t.profile_views_30d, 'Profile views') +
    tile(t.digital_menu_30d, 'Menu opens') +
    tile(o.total, 'Order requests') +
    tile(e.follows, 'Followers');

  const buzz = document.getElementById('dash-buzz');
  if (buzz) buzz.textContent = `Buzz score ${Math.round(b.score || 0)}${b.tier ? ' · ' + b.tier : ''}`;
}


/* ── Digital Menu QR ─────────────────────────────────────────
   Generates a QR pointing at the restaurant's public digital
   menu (/menu?slug=…) plus copy / download / preview controls. */
function renderMenuQR() {
  if (!restaurant?.slug) return;
  const box = document.getElementById('menu-qr');
  if (!box) return;

  const url = `${location.origin}/menu?slug=${encodeURIComponent(restaurant.slug)}`;
  const linkInput = document.getElementById('menu-qr-link');
  const openLink  = document.getElementById('menu-qr-open');
  if (linkInput) linkInput.value = url;
  if (openLink)  openLink.href = url;

  /* Build the QR (qrcodejs renders a <canvas> + <img> into the box). */
  box.innerHTML = '';
  if (typeof QRCode === 'function') {
    new QRCode(box, {
      text: url,
      width: 320, height: 320,          // render large, CSS scales down → crisp
      colorDark: '#111111', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
    const img = box.querySelector('img, canvas');
    if (img) { img.style.width = '100%'; img.style.height = '100%'; }
  } else {
    box.innerHTML = '<span style="font-size:.7rem;color:#ABABAB">QR unavailable</span>';
  }

  document.getElementById('menu-qr-copy')?.addEventListener('click', () => {
    if (!linkInput) return;
    linkInput.select();
    try { navigator.clipboard.writeText(url); } catch { document.execCommand('copy'); }
    const btn = document.getElementById('menu-qr-copy');
    if (btn) { btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500); }
  });

  document.getElementById('menu-qr-download')?.addEventListener('click', () => {
    const canvas = box.querySelector('canvas');
    const img    = box.querySelector('img');
    let dataUrl = null;
    if (canvas) dataUrl = canvas.toDataURL('image/png');
    else if (img && img.src) dataUrl = img.src;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `yumyumpo-menu-qr-${restaurant.slug}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  });
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

const MAX_VIBE_TAGS = 3;
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
      if (pendingVibeTags.has(t)) {
        pendingVibeTags.delete(t);
        btn.classList.remove('active');
      } else {
        if (pendingVibeTags.size >= MAX_VIBE_TAGS) {
          toast(`Pick up to ${MAX_VIBE_TAGS} tags — remove one first.`);
          return;
        }
        pendingVibeTags.add(t);
        btn.classList.add('active');
      }
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
  /* Prefer !3d!4d (the actual place pin) over @lat,lng (viewport center)
     — when both are present in a Google Maps URL they can differ by
     ~100m and !3d!4d is the accurate one. */
  if ((m = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)))      return tryPair(m[1], m[2]);
  if ((m = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)))          return tryPair(m[1], m[2]);
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

  /* The inline menu editor was retired in favour of the dedicated
     Digital Menu Builder — #add-category-btn no longer exists. */

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
      if (/maps\.app\.goo\.gl|goo\.gl\/maps/.test(raw)) {
        result.textContent = "That's a shortened share link — Google's servers hold the coordinates, your browser can't read them. Open the place in Google Maps on a desktop browser and copy the URL from the address bar (it contains @lat,lng).";
      } else {
        result.textContent = "Couldn't find coordinates in that input. Use a full Google Maps URL (with /@lat,lng/...) or paste a plain 'lat, lng' pair.";
      }
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
    /* Menu intentionally omitted — it's managed by the dedicated
       Digital Menu Builder (save_restaurant_menu). save_owner_restaurant
       only touches the menu when a `categories` key is present, so
       leaving it out keeps Builder edits safe. */
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


/* ── Order Requests Inbox (owner side) ─────────────────────
   Loads once on init, polls every 20s. Owner can:
     • Acknowledge ("will get back shortly")
     • Quote a total price + message
     • Accept / Deny
     • Mark completed
   Also drives the per-restaurant analytics tile row. */
let ORDERS = [];
let ORDERS_POLL = null;
let LAST_PENDING_COUNT = 0;

async function loadOrders() {
  const c = window.YYP?.client;
  if (!c || !restaurant?.id) return;

  /* Premium gate — hide the section entirely on non-Premium listings. */
  const sec = document.getElementById('orders-section');
  if (!sec) return;
  if (!restaurant.has_yumyumpo_site) { sec.style.display = 'none'; return; }
  sec.style.display = '';

  /* Accepting-orders toggle state */
  const acceptingEl = document.getElementById('accepting-orders-toggle');
  const acceptingLabel = document.getElementById('accepting-orders-label');
  if (acceptingEl && acceptingEl.dataset.bound !== '1') {
    acceptingEl.dataset.bound = '1';
    acceptingEl.checked = restaurant.accepting_orders !== false;
    acceptingLabel.textContent = acceptingEl.checked ? 'Accepting orders' : 'Paused — not taking orders';
    acceptingEl.addEventListener('change', async () => {
      const val = acceptingEl.checked;
      acceptingLabel.textContent = val ? 'Accepting orders' : 'Paused — not taking orders';
      await c.from('restaurants').update({ accepting_orders: val }).eq('id', restaurant.id);
      restaurant.accepting_orders = val;
    });
  }

  /* Inbox: only fetch open orders (status not in done/denied/paid) and
     cap at 30. The Analytics view is heavier — refresh every 5th tick
     (≈100s) instead of every poll. */
  const fetchAnalytics = !window._yypOrdersTick || window._yypOrdersTick % 5 === 0;
  window._yypOrdersTick = (window._yypOrdersTick || 0) + 1;

  const inboxQ = c
    .from('order_requests')
    .select('id, status, customer_name, customer_phone, items, allergens, notes, delivery_method, delivery_address, preferred_time, created_at')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['pending', 'acknowledged', 'quoted', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(30);

  const promises = [inboxQ];
  if (fetchAnalytics) {
    promises.push(c.from('restaurant_order_analytics').select('*').eq('restaurant_id', restaurant.id).maybeSingle());
  }

  const results = await Promise.all(promises);
  ORDERS = results[0].data || [];
  const analytics = fetchAnalytics ? (results[1]?.data || null) : window._yypOrdersAnalyticsCache;
  if (fetchAnalytics) window._yypOrdersAnalyticsCache = analytics;

  renderOrderAnalytics(analytics);
  renderOrders();

  /* Browser title flash for new pending */
  const pending = ORDERS.filter(o => o.status === 'pending').length;
  if (pending > LAST_PENDING_COUNT && document.hidden) {
    document.title = `🔔 (${pending}) new order — YUMYUMPO`;
  } else if (!document.hidden) {
    document.title = 'My Restaurant — YUMYUMPO';
  }
  LAST_PENDING_COUNT = pending;
}

function renderOrderAnalytics(a) {
  const wrap = document.getElementById('orders-analytics');
  if (!wrap) return;
  const tiles = [
    { label: 'All time',     value: a?.total_requests   ?? 0 },
    { label: 'Accept rate',  value: a?.accept_pct != null ? `${a.accept_pct}%` : '—' },
    { label: 'Avg response', value: a?.avg_response_min != null ? `${Math.round(a.avg_response_min)}m` : '—' },
    { label: 'Avg quoted',   value: a?.avg_order_value != null ? `₱${Number(a.avg_order_value).toLocaleString()}` : '—' },
  ];
  wrap.innerHTML = tiles.map(t => `
    <div style="background:#FAFAFA;border:1.5px solid #F3F3F3;border-radius:12px;padding:10px 12px">
      <p style="font-size:0.62rem;font-weight:800;color:#ABABAB;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">${t.label}</p>
      <p style="font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:1.15rem;color:#111">${t.value}</p>
    </div>`).join('');
}

function renderOrders() {
  const wrap = document.getElementById('orders-list');
  if (!wrap) return;
  const open = ORDERS.filter(o => !['denied','paid','completed'].includes(o.status));
  if (open.length === 0) {
    wrap.innerHTML = `<p style="text-align:center;padding:24px 12px;color:#6B6B6B;font-size:0.85rem;font-style:italic">No open requests right now. New ones land here automatically.</p>`;
    return;
  }
  wrap.innerHTML = open.map(orderRowHTML).join('');
  wrap.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => handleOrderAction(btn.dataset.id, btn.dataset.act));
  });
}

function orderRowHTML(o) {
  const ageMin = Math.max(1, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000));
  const items  = Array.isArray(o.items) ? o.items : [];
  const itemsLine = items.map(it => `${it.qty || 1}× ${escapeHtml(it.name)}`).join(', ');
  const allergyChips = (o.allergens || []).map(a => `<span style="background:#FEE2E2;color:#B91C1C;font-size:0.62rem;font-weight:800;padding:2px 7px;border-radius:999px">${escapeHtml(a)}</span>`).join(' ');
  const methodIcon = o.delivery_method === 'delivery' ? '🛵' : o.delivery_method === 'dinein' ? '🍽' : '🥡';
  const statusBg = { pending:'#FEF3C7', acknowledged:'#DBEAFE', quoted:'#FFD000', accepted:'#DCFCE7' }[o.status] || '#F3F3F3';

  return `
    <div style="border:1.5px solid #F3F3F3;border-radius:14px;padding:14px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">
        <div>
          <p style="font-weight:800;color:#111;font-size:0.95rem">${escapeHtml(o.customer_name)}</p>
          <p style="font-size:0.74rem;color:#6B6B6B">${methodIcon} ${o.delivery_method} ${o.preferred_time ? ' · ' + escapeHtml(o.preferred_time) : ''} · ${ageMin}m ago</p>
        </div>
        <span style="background:${statusBg};color:#111;font-size:0.62rem;font-weight:800;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap">${o.status}</span>
      </div>
      <p style="font-size:0.82rem;color:#111;margin:6px 0">${escapeHtml(itemsLine) || '<em>No items</em>'}</p>
      ${o.delivery_address ? `<p style="font-size:0.74rem;color:#6B6B6B">📍 ${escapeHtml(o.delivery_address)}</p>` : ''}
      ${allergyChips ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">⚠️ ${allergyChips}</div>` : ''}
      ${o.notes ? `<p style="font-size:0.78rem;color:#555;font-style:italic;margin-top:6px">"${escapeHtml(o.notes)}"</p>` : ''}
      ${o.customer_phone ? `<p style="font-size:0.74rem;color:#6B6B6B;margin-top:4px">📞 <a href="tel:${escapeAttr(o.customer_phone)}" style="color:inherit;text-decoration:underline">${escapeHtml(o.customer_phone)}</a></p>` : ''}

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;border-top:1px dashed #F3F3F3;padding-top:10px">
        ${o.status === 'pending' ? `
          <button data-act="ack"    data-id="${o.id}" style="background:#DBEAFE;color:#1E40AF;border:none;padding:7px 12px;border-radius:8px;font-weight:800;font-size:0.78rem;cursor:pointer">📨 Got it, replying soon</button>
        ` : ''}
        <button data-act="quote"  data-id="${o.id}" style="background:#FFD000;color:#111;border:none;padding:7px 12px;border-radius:8px;font-weight:800;font-size:0.78rem;cursor:pointer">💬 Quote price</button>
        ${o.status !== 'denied' ? `
          <button data-act="accept" data-id="${o.id}" style="background:#16A34A;color:#fff;border:none;padding:7px 12px;border-radius:8px;font-weight:800;font-size:0.78rem;cursor:pointer">✓ Accept</button>
          <button data-act="deny"   data-id="${o.id}" style="background:#FEE2E2;color:#B91C1C;border:none;padding:7px 12px;border-radius:8px;font-weight:800;font-size:0.78rem;cursor:pointer">✕ Deny</button>
        ` : ''}
        ${o.status === 'accepted' ? `
          <button data-act="done"   data-id="${o.id}" style="background:#111;color:#FFD000;border:none;padding:7px 12px;border-radius:8px;font-weight:800;font-size:0.78rem;cursor:pointer">Mark completed</button>
        ` : ''}
      </div>
    </div>`;
}

async function handleOrderAction(id, act) {
  const c = window.YYP?.client;
  let status, quoted = null, message = null;
  if (act === 'ack') {
    status = 'acknowledged';
    message = prompt('Optional message to the customer:', "We got your request — we'll get back to you shortly!");
    if (message === null) return; /* user cancelled */
  } else if (act === 'quote') {
    const total = prompt('Quoted total (₱) — leave blank to skip:');
    if (total === null) return;
    quoted = total === '' ? null : parseFloat(total);
    if (quoted != null && Number.isNaN(quoted)) return toast('Invalid amount.');
    message = prompt('Message about the quote (optional):', '');
    if (message === null) return;
    status = 'quoted';
  } else if (act === 'accept') {
    status = 'accepted';
    message = prompt('Message (optional):', 'Order confirmed — see you soon!');
    if (message === null) return;
  } else if (act === 'deny') {
    const reason = prompt('Reason (optional, customer sees this):', 'Sorry, we can\'t take this one today.');
    if (reason === null) return;
    status = 'denied'; message = reason;
  } else if (act === 'done') {
    status = 'completed';
  }

  const { error } = await c.rpc('update_order_status', {
    p_order_id: id, p_new_status: status, p_quoted: quoted, p_message: message,
  });
  if (error) return toast('Update failed: ' + error.message);
  toast('✓ Updated');
  loadOrders();
}


/* ── Promotions (owner-requested announcements) ──────────────
   Owner submits a request → status='pending' + payment_status='unpaid'.
   Admin reviews + collects payment offline (GCash/bank). Once
   approved + paid, migration 023's trigger flips is_published
   and the announcement appears in followers' feed. */

const PROMO_TYPE_LABEL = {
  'announcement': '📣 Announcement',
  'promo':        '💸 Promo',
  'event':        '📅 Event',
  'happy-hour':   '🍻 Happy hour',
  'live-music':   '🎵 Live music',
  'menu':         '🍽️ New menu item',
};

async function loadPromos() {
  const c = window.YYP?.client;
  const sec = document.getElementById('promos-section');
  if (!c || !restaurant?.id || !sec) return;
  sec.style.display = '';

  const newBtn  = document.getElementById('promo-new-btn');
  const form    = document.getElementById('promo-form');
  const cancel  = document.getElementById('promo-cancel');
  if (newBtn && newBtn.dataset.bound !== '1') {
    newBtn.dataset.bound = '1';
    newBtn.addEventListener('click', () => { form.style.display = ''; newBtn.style.display = 'none'; });
    cancel.addEventListener('click', () => { resetPromoForm(); form.style.display = 'none'; newBtn.style.display = ''; hidePromoMsg(); });
    form.addEventListener('submit', submitPromoRequest);

    /* Promo marketing-image upload */
    const dz   = document.getElementById('promo-image-dz');
    const file = document.getElementById('promo-image-file');
    dz?.addEventListener('click', () => file.click());
    file?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB');
      toast('Uploading image…');
      const url = await uploadToBucket(f);
      if (!url) return;
      promoImageUrl = url;
      dz.style.backgroundImage = `url('${url}')`;
      dz.style.backgroundSize = 'cover';
      dz.style.backgroundPosition = 'center';
      dz.innerHTML = '';
    });
  }

  const { data, error } = await c
    .from('venue_announcements')
    .select('id, title, body, type, status, payment_status, price_php, starts_at, ends_at, admin_notes, created_at, is_published, image_url')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const list  = document.getElementById('promo-list');
  const empty = document.getElementById('promo-empty');
  if (error) { console.warn('[promos]', error.message); return; }
  if (!data?.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  list.innerHTML = data.map(promoCardHTML).join('');
  list.querySelectorAll('[data-withdraw]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('Withdraw this request? It will be removed.')) return;
      const { error } = await c.from('venue_announcements').delete().eq('id', b.dataset.withdraw);
      if (error) return toast('Could not withdraw: ' + error.message);
      toast('Request withdrawn');
      loadPromos();
    });
  });
}

function promoCardHTML(a) {
  const created = new Date(a.created_at).toLocaleDateString(undefined, { month:'short', day:'numeric' });
  const runAt = a.starts_at
    ? new Date(a.starts_at).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
    : '';

  /* Status pill + helper text. */
  let pill, helper;
  if (a.status === 'pending') {
    pill = '<span class="app-status pending">PENDING REVIEW</span>';
    helper = "We're reviewing your request. Approval typically within 24h.";
  } else if (a.status === 'rejected') {
    pill = '<span class="app-status rejected">REJECTED</span>';
    helper = a.admin_notes ? `<strong>Admin note:</strong> ${esc(a.admin_notes)}` : 'Reach out if you have questions.';
  } else if (a.is_published) {
    pill = '<span class="app-status approved">LIVE</span>';
    helper = 'Now showing in followers\' feed.';
  } else {
    pill = '<span class="app-status approved">APPROVED</span>';
    helper = 'Approved — going live shortly.';
  }

  const canWithdraw = a.status === 'pending';

  return `
    <div class="app-card" style="cursor:default">
      <div class="flex items-start gap-3 flex-wrap">
        ${a.image_url ? `<img src="${esc(a.image_url)}" alt="" style="width:84px;height:84px;border-radius:12px;object-fit:cover;flex-shrink:0" />` : ''}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            ${pill}
          </div>
          <h3 class="font-display font-black text-base text-brand-black">${esc(a.title)}</h3>
          ${a.body ? `<p class="text-sm text-gray-600 mt-1 line-clamp-2">${esc(a.body)}</p>` : ''}
          <p class="text-xs text-gray-400 mt-2">Requested ${created}${runAt ? ' · runs ' + esc(runAt) : ''}</p>
          <p class="text-xs text-gray-600 mt-2" style="line-height:1.5">${helper}</p>
        </div>
        ${canWithdraw ? `<button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-withdraw="${esc(a.id)}">Withdraw</button>` : ''}
      </div>
    </div>`;
}

async function submitPromoRequest(e) {
  e.preventDefault();
  const c = window.YYP?.client;
  if (!c || !restaurant?.id) return;

  const btn    = document.getElementById('promo-submit');
  hidePromoMsg();

  /* Run date & time is required; promos run 3 hours from then. */
  const startsRaw = document.getElementById('promo-starts').value;
  if (!startsRaw) {
    showPromoMsg('Pick the date & time your promo should run.', 'error');
    return;
  }
  const THREE_HRS = 3 * 3600 * 1000;
  const starts = new Date(startsRaw);
  const ends   = new Date(starts.getTime() + THREE_HRS);

  btn.disabled = true; btn.textContent = 'Submitting…';

  /* Slot check — only 3 promotions may run in any overlapping
     window. Tell the owner up front instead of failing the insert. */
  const cap = await c.rpc('count_overlapping_promos', {
    p_starts: starts.toISOString(), p_ends: ends.toISOString(),
  });
  if (!cap.error && (cap.data ?? 0) >= 3) {
    showPromoMsg('That time slot is full — 3 promotions already run then. Please pick a different date or time.', 'error');
    btn.disabled = false; btn.textContent = 'Submit request';
    return;
  }

  const { data: { session } } = await c.auth.getSession();

  const payload = {
    restaurant_id: restaurant.id,
    type:    'promo',
    title:   document.getElementById('promo-title').value.trim(),
    body:    document.getElementById('promo-body').value.trim() || null,
    link_url: document.getElementById('promo-link').value.trim() || null,
    image_url: promoImageUrl || null,
    starts_at: starts.toISOString(),
    ends_at:   ends.toISOString(),
    /* RLS forbids overriding these — but include them so the row is correct. */
    status: 'pending',
    payment_status: 'unpaid',
    requested_by: session?.user?.id || null,
    posted_by:    session?.user?.id || null,
  };

  const { error } = await c.from('venue_announcements').insert([payload]);
  btn.disabled = false; btn.textContent = 'Submit request';

  if (error) {
    const msg = /PROMO_SLOT_FULL/.test(error.message || '')
      ? 'That time slot is full — 3 promotions already run then. Please pick a different date or time.'
      : 'Error: ' + error.message;
    showPromoMsg(msg, 'error');
    return;
  }
  showPromoMsg('✓ Request submitted! We\'ll review within 24h.', 'success');
  resetPromoForm();
  setTimeout(() => {
    document.getElementById('promo-form').style.display = 'none';
    document.getElementById('promo-new-btn').style.display = '';
    hidePromoMsg();
  }, 2200);
  loadPromos();
}

/* Reset the promo form + clear the uploaded image preview. */
function resetPromoForm() {
  document.getElementById('promo-form')?.reset();
  promoImageUrl = '';
  const dz = document.getElementById('promo-image-dz');
  if (dz) {
    dz.style.backgroundImage = '';
    dz.innerHTML = `<div style="color:#ABABAB;font-size:.8rem;font-weight:600;padding:16px">
        <div style="font-size:1.6rem;margin-bottom:4px">🖼️</div>
        Tap to add a marketing image<br/><span style="font-size:.7rem">Shown on your promo card · 16:9 looks best</span>
      </div>`;
  }
}

function showPromoMsg(text, kind) {
  const el = document.getElementById('promo-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'text-sm font-semibold ' + (kind === 'error' ? 'text-red-600' : 'text-green-600');
  el.classList.remove('hidden');
}
function hidePromoMsg() {
  document.getElementById('promo-msg')?.classList.add('hidden');
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
