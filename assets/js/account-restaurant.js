/* ============================================================
   YUMYUMPO — Restaurant Owner Dashboard
   Loads the restaurant owned by the signed-in user and lets
   them edit basic info + upload gallery photos (max 6).
   ============================================================ */

'use strict';

const MAX_GALLERY = 6;
const BUCKET = 'restaurant-photos';

let restaurant = null;          // current row
let originalSnapshot = null;    // for change detection / discard
let pendingGallery = [];        // mirror of gallery_urls during edit
let dirty = false;


document.addEventListener('DOMContentLoaded', () => {
  if (window.YYP?.ready) init();
  else document.addEventListener('yyp:ready', init, { once: true });
});


async function init() {
  const c = window.YYP?.client;
  if (!c) return showGate();

  const { data: { user } } = await c.auth.getUser();
  if (!user) return showGate();

  /* Fetch the user's restaurant via the helper RPC (RLS-safe). */
  const { data, error } = await c.rpc('get_my_restaurant');
  if (error) {
    console.error('[Owner] get_my_restaurant:', error);
    return showNoRestaurant();
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return showNoRestaurant();

  restaurant = row;
  originalSnapshot = JSON.stringify(row);
  pendingGallery = Array.isArray(row.gallery_urls) ? [...row.gallery_urls] : [];

  populateForm();
  wireEvents();
  showMain();
}


/* ── UI states ───────────────────────────────────────────── */
function showGate()        { document.getElementById('auth-gate').style.display = 'block'; }
function showNoRestaurant(){ document.getElementById('no-restaurant').style.display = 'block'; }
function showMain()        { document.getElementById('main').style.display = 'block'; }


/* ── Populate form from row ──────────────────────────────── */
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
        <span style="font-size:1.6rem;line-height:1">＋</span>
        <span>Add photo</span>
      </div>
    `);
  }

  document.getElementById('gallery-count').textContent = `${pendingGallery.length} / ${MAX_GALLERY} photos`;
}


/* ── Wire events ─────────────────────────────────────────── */
function wireEvents() {
  document.getElementById('owner-form').addEventListener('input', markDirty);

  document.getElementById('cover-file').addEventListener('change', e => handleSingleUpload(e, 'cover'));
  document.getElementById('logo-file').addEventListener('change',  e => handleSingleUpload(e, 'logo'));
  document.getElementById('gallery-file').addEventListener('change', handleGalleryUpload);

  document.getElementById('save-btn').addEventListener('click', save);
  document.getElementById('discard-btn').addEventListener('click', discard);

  window.removeGalleryPhoto = removeGalleryPhoto;
}

function markDirty() {
  dirty = true;
  document.getElementById('save-bar').style.display = 'block';
}


/* ── Photo upload ────────────────────────────────────────── */
async function handleSingleUpload(e, kind) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast('File too big — 5MB max.');
  const url = await uploadToBucket(file);
  if (!url) return;
  if (kind === 'cover') { restaurant.cover_image_url = url; renderCover(); }
  if (kind === 'logo')  { restaurant.logo_image_url  = url; renderLogo();  }
  markDirty();
  e.target.value = '';
}

async function handleGalleryUpload(e) {
  const files = [...(e.target.files || [])];
  if (!files.length) return;
  const slotsLeft = MAX_GALLERY - pendingGallery.length;
  if (slotsLeft <= 0) return toast(`You already have ${MAX_GALLERY} photos.`);
  for (const file of files.slice(0, slotsLeft)) {
    if (file.size > 5 * 1024 * 1024) { toast(`${file.name} skipped — over 5MB.`); continue; }
    const url = await uploadToBucket(file);
    if (url) pendingGallery.push(url);
  }
  renderGallery();
  markDirty();
  e.target.value = '';
}

function removeGalleryPhoto(idx) {
  pendingGallery.splice(idx, 1);
  renderGallery();
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

  const payload = {
    tagline:         fd.tagline       || null,
    description:     fd.description   || null,
    location:        fd.location      || null,
    address:         fd.address       || null,
    phone:           fd.phone         || null,
    website_url:     fd.website_url   || null,
    whatsapp_url:    fd.whatsapp_url  || null,
    instagram_url:   fd.instagram_url || null,
    facebook_url:    fd.facebook_url  || null,
    messenger_url:   fd.messenger_url || null,
    cover_image_url: restaurant.cover_image_url || null,
    logo_image_url:  restaurant.logo_image_url  || null,
    gallery_urls:    pendingGallery,
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = await c.from('restaurants').update(payload).eq('id', restaurant.id);
  btn.disabled = false; btn.textContent = 'Save Changes';

  if (error) return toast('Save failed: ' + error.message);

  Object.assign(restaurant, payload);
  originalSnapshot = JSON.stringify(restaurant);
  dirty = false;
  document.getElementById('save-bar').style.display = 'none';
  toast('✓ Saved');
}

function discard() {
  if (!confirm('Discard unsaved changes?')) return;
  restaurant = JSON.parse(originalSnapshot);
  pendingGallery = Array.isArray(restaurant.gallery_urls) ? [...restaurant.gallery_urls] : [];
  dirty = false;
  document.getElementById('save-bar').style.display = 'none';
  populateForm();
}


/* ── Toast ───────────────────────────────────────────────── */
let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  toastTimer = setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2400);
}
