/* ============================================================
   YUMYUMPO — Restaurant Owner Dashboard
   Loads the restaurant owned by the signed-in user (or, if admin,
   any restaurant via ?slug=) and lets them edit every field shown
   on the public profile page.
   ============================================================ */

'use strict';

const MAX_GALLERY = 3;
const BUCKET = 'restaurant-photos';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

let restaurant = null;
let originalSnapshot = null;
let pendingGallery = [];
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
  originalSnapshot = JSON.stringify(row);
  pendingGallery = Array.isArray(row.gallery_urls) ? [...row.gallery_urls] : [];

  await loadHours(c, row.id);
  await loadMenu(c, row.id);

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

  const fields = ['tagline','description','location','address','phone','website_url','whatsapp_url','instagram_url','facebook_url','messenger_url'];
  fields.forEach(name => {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) el.value = restaurant[name] || '';
  });

  document.getElementById('ro-cuisine').textContent = restaurant.cuisine_type || '—';
  document.getElementById('ro-slug').textContent    = restaurant.slug || '—';

  renderCover();
  renderLogo();
  renderGallery();
  renderHours();
  renderMenu();
}

function renderCover() {
  const el = document.getElementById('cover-preview');
  const url = restaurant.cover_image_url;
  el.innerHTML = url ? `<img src="${url}" alt="">` : '<div class="text-gray-400 text-xs flex h-full items-center justify-center">No cover image</div>';
}

function renderLogo() {
  const el = document.getElementById('logo-preview');
  const url = restaurant.logo_image_url;
  el.innerHTML = url ? `<img src="${url}" alt="">` : '<div class="text-gray-400 text-xs flex h-full items-center justify-center">No logo</div>';
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = pendingGallery.map((url, i) => `
    <div class="photo-tile" data-idx="${i}">
      <img src="${url}" alt="">
      <button type="button" class="photo-remove" onclick="removeGalleryPhoto(${i})" aria-label="Remove">×</button>
    </div>
  `).join('');
  if (pendingGallery.length < MAX_GALLERY) {
    grid.insertAdjacentHTML('beforeend', `
      <div class="photo-add" onclick="document.getElementById('gallery-file').click()">
        <span style="font-size:1.6rem;line-height:1">＋</span><span>Add photo</span>
      </div>`);
  }
  document.getElementById('gallery-count').textContent = `${pendingGallery.length} / ${MAX_GALLERY} photos`;
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
    .select('id, menu_category_id, name, description, price, image_url, gallery_urls, tags, sort_order, is_available')
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

  document.getElementById('save-btn').addEventListener('click', save);
  document.getElementById('discard-btn').addEventListener('click', discard);

  document.getElementById('add-category-btn').addEventListener('click', () => {
    categories.push({ name:'', sort_order: categories.length, items:[] });
    renderMenu();
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

function markDirty() { dirty = true; document.getElementById('save-bar').style.display = 'block'; }


/* ── Photo upload ────────────────────────────────────────── */
async function handleSingleUpload(e, kind) {
  const file = e.target.files?.[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('File too big — 5MB max.');
  const url = await uploadToBucket(file); if (!url) return;
  if (kind === 'cover') { restaurant.cover_image_url = url; renderCover(); }
  if (kind === 'logo')  { restaurant.logo_image_url  = url; renderLogo();  }
  markDirty(); e.target.value = '';
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

function removeGalleryPhoto(idx) { pendingGallery.splice(idx,1); renderGallery(); markDirty(); }

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

  const payload = {
    tagline:         fd.tagline       || null,
    description:     fd.description   || null,
    location:        fd.location      || null,
    address:         fd.address       || null,
    phone:           fd.phone         || null,
    website_url:     normalizeUrl(fd.website_url)        || null,
    whatsapp_url:    normalizeWhatsapp(fd.whatsapp_url)  || null,
    instagram_url:   normalizeInstagram(fd.instagram_url)|| null,
    facebook_url:    normalizeUrl(fd.facebook_url)       || null,
    messenger_url:   normalizeUrl(fd.messenger_url)      || null,
    cover_image_url: restaurant.cover_image_url || null,
    logo_image_url:  restaurant.logo_image_url  || null,
    gallery_urls:    pendingGallery,
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  /* 1. Restaurant fields */
  const { error: e1 } = await c.from('restaurants').update(payload).eq('id', restaurant.id);
  if (e1) { btn.disabled=false; btn.textContent='Save Changes'; return toast('Save failed: ' + e1.message); }

  /* 2. Hours — wipe and re-insert (idempotent, small N=7) */
  await c.from('operating_hours').delete().eq('restaurant_id', restaurant.id);
  const hoursRows = DAYS.map(d => ({
    restaurant_id: restaurant.id,
    day_of_week:   d,
    open_time:     hours[d].is_closed ? null : hours[d].open_time,
    close_time:    hours[d].is_closed ? null : hours[d].close_time,
    is_closed:     hours[d].is_closed,
  }));
  const { error: e2 } = await c.from('operating_hours').insert(hoursRows);
  if (e2) { btn.disabled=false; btn.textContent='Save Changes'; return toast('Hours save failed: ' + e2.message); }

  /* 3. Menu — wipe and re-insert (items first cascade-delete, then categories) */
  await c.from('menu_items').delete().eq('restaurant_id', restaurant.id);
  await c.from('menu_categories').delete().eq('restaurant_id', restaurant.id);
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    if (!cat.name?.trim()) continue;
    const { data: insertedCat, error: ec } = await c.from('menu_categories').insert({
      restaurant_id: restaurant.id,
      name: cat.name.trim(),
      sort_order: ci,
    }).select().single();
    if (ec) { console.warn('cat save:', ec.message); continue; }
    const itemRows = cat.items
      .filter(it => it.name?.trim())
      .map((it, ii) => {
        const photos = Array.isArray(it.photos) ? it.photos.slice(0, MAX_ITEM_PHOTOS) : [];
        return {
          restaurant_id:    restaurant.id,
          menu_category_id: insertedCat.id,
          name:             it.name.trim(),
          description:      it.description || null,
          price:            it.price || null,
          image_url:        photos[0] || null,
          gallery_urls:     photos,
          tags:             Array.isArray(it.tags) ? it.tags : [],
          sort_order:       ii,
          is_available:     it.is_available !== false,
        };
      });
    if (itemRows.length) {
      const { error: ei } = await c.from('menu_items').insert(itemRows);
      if (ei) console.warn('items save:', ei.message);
    }
  }

  btn.disabled = false; btn.textContent = 'Save Changes';
  Object.assign(restaurant, payload);
  originalSnapshot = JSON.stringify(restaurant);
  dirty = false;
  document.getElementById('save-bar').style.display = 'none';
  toast('✓ Saved');
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
