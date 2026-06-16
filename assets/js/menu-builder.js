/* ============================================================
   YUMYUMPO — Digital Menu Builder (account/menu-builder.html)
   Mobile-first menu creation for restaurant owners. Loads the
   owner's restaurant + menu, lets them add/edit/reorder
   categories & items with photos, and saves atomically via the
   save_restaurant_menu RPC (migration 029).
   ============================================================ */

'use strict';

(function () {
  const TAGS = ['Best Seller', "Chef's Pick", 'Spicy', 'Vegetarian', 'Vegan', 'New', 'Popular', 'Gluten-Free'];
  const CAT_EMOJI = ['🍽️', '🥗', '🍜', '🍕', '🍰', '🍹', '☕', '🔥', '🌶️', '🥘'];
  const BUCKET = 'restaurant-photos';

  let restaurant = null;
  let MENU = [];            // [{ name, items:[{...}] }]
  let dirty = false;
  let photoTarget = null;   // { ci, ii }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.YYP?.ready) init();
    else document.addEventListener('yyp:ready', init, { once: true });
  });

  async function init() {
    const c = window.YYP?.client;
    if (!c) return gate();

    const { data: { user } } = await c.auth.getUser();
    if (!user) return gate();

    /* If ?slug= is present, load that restaurant — allowed for admins
       AND for co-owners. Falls back to the user's first owned
       restaurant otherwise. */
    const overrideSlug = new URLSearchParams(location.search).get('slug');
    let row = null, adminEdit = false;

    if (overrideSlug) {
      const { data } = await c.from('restaurants').select('*').ilike('slug', overrideSlug).maybeSingle();
      if (data) {
        let isAdmin = false;
        try { const { data: a } = await c.rpc('is_admin'); isAdmin = !!a; } catch {}
        let isOwner = false;
        if (!isAdmin) {
          try { const { data: o } = await c.rpc('is_restaurant_owner', { p_restaurant_id: data.id }); isOwner = !!o; } catch {}
        }
        if (isAdmin || isOwner) { row = data; adminEdit = isAdmin && !isOwner; }
      }
    }
    if (!row) {
      const { data, error } = await c.rpc('get_my_restaurant');
      row = Array.isArray(data) ? data[0] : data;
      if (error || !row) return gate();
    }
    restaurant = row;

    await loadMenu(c);

    document.getElementById('mb-loading').style.display = 'none';
    document.getElementById('mb-app').style.display = '';
    document.getElementById('mb-savebar').style.display = 'flex';
    document.getElementById('mb-restaurant').textContent =
      (restaurant.name || 'Your Menu') + (adminEdit ? ' — admin edit' : '');
    document.getElementById('mb-preview').href = `/menu?slug=${encodeURIComponent(restaurant.slug)}`;
    const qrLink = document.getElementById('mb-qr');
    if (qrLink) qrLink.href = `/account/qr-poster.html?slug=${encodeURIComponent(restaurant.slug)}`;
    /* keep the slug context on the back-to-dashboard link */
    if (adminEdit) {
      const back = document.querySelector('.mb-nav-back');
      if (back) back.href = `/account/restaurant.html?slug=${encodeURIComponent(restaurant.slug)}`;
    }

    wire();
    render();
  }

  function gate() {
    document.getElementById('mb-loading').style.display = 'none';
    document.getElementById('mb-gate').style.display = '';
  }

  async function loadMenu(c) {
    const [{ data: cats }, { data: items }] = await Promise.all([
      c.from('menu_categories').select('id, name, sort_order')
        .eq('restaurant_id', restaurant.id).order('sort_order'),
      c.from('menu_items').select('id, menu_category_id, name, description, price, price_note, image_url, gallery_urls, tags, is_available, sort_order')
        .eq('restaurant_id', restaurant.id).order('sort_order'),
    ]);

    MENU = (cats || []).map(cat => ({
      name: cat.name || '',
      items: (items || [])
        .filter(it => it.menu_category_id === cat.id)
        .map(it => ({
          name: it.name || '',
          description: it.description || '',
          price: it.price || '',
          price_note: it.price_note || '',
          image_url: it.image_url || (Array.isArray(it.gallery_urls) && it.gallery_urls[0]) || '',
          tags: Array.isArray(it.tags) ? it.tags : [],
          is_available: it.is_available !== false,
          _expanded: false,
        })),
    }));
  }

  /* ── Render ─────────────────────────────────────────────── */
  function render() {
    const wrap  = document.getElementById('mb-cats');
    const empty = document.getElementById('mb-empty');
    const addBtn = document.getElementById('mb-add-cat');
    const tips  = document.getElementById('mb-tips');

    if (!MENU.length) {
      wrap.innerHTML = '';
      empty.style.display = '';
      addBtn.style.display = 'none';
      tips.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    addBtn.style.display = '';
    tips.style.display = '';

    wrap.innerHTML = MENU.map((cat, ci) => catCardHTML(cat, ci)).join('');
  }

  function catCardHTML(cat, ci) {
    const last = MENU.length - 1;
    return `
      <div class="mb-cat" data-ci="${ci}">
        <div class="mb-cat-head">
          <span class="mb-cat-emoji">${CAT_EMOJI[ci % CAT_EMOJI.length]}</span>
          <input class="mb-cat-name" data-ci="${ci}" data-field="cat-name"
                 placeholder="Category name" value="${attr(cat.name)}" />
          <button class="mb-iconbtn" data-action="cat-up" data-ci="${ci}" ${ci === 0 ? 'disabled' : ''} aria-label="Move up">▲</button>
          <button class="mb-iconbtn" data-action="cat-down" data-ci="${ci}" ${ci === last ? 'disabled' : ''} aria-label="Move down">▼</button>
          <button class="mb-iconbtn danger" data-action="cat-del" data-ci="${ci}" aria-label="Delete category">🗑</button>
        </div>
        <div class="mb-items">
          ${cat.items.map((it, ii) => itemHTML(it, ci, ii)).join('')}
          <button class="mb-add-item" data-action="item-add" data-ci="${ci}">＋ Add item</button>
        </div>
      </div>`;
  }

  function itemHTML(it, ci, ii) {
    const last = MENU[ci].items.length - 1;
    const photoStyle = it.image_url ? `background-image:url('${attr(it.image_url)}')` : '';
    return `
      <div class="mb-item ${it._expanded ? 'expanded' : ''}" data-ci="${ci}" data-ii="${ii}">
        <div class="mb-item-row">
          <div class="mb-item-photo ${it.image_url ? 'has-img' : ''}" data-action="item-photo" data-ci="${ci}" data-ii="${ii}" style="${photoStyle}">
            ${it.image_url ? '' : '📷'}
          </div>
          <div class="mb-item-fields">
            <input class="mb-item-name" data-ci="${ci}" data-ii="${ii}" data-field="name"
                   placeholder="Item name" value="${attr(it.name)}" />
            <input class="mb-item-price" data-ci="${ci}" data-ii="${ii}" data-field="price"
                   placeholder="Price e.g. ₱180" value="${attr(it.price)}" />
          </div>
          <button class="mb-item-toggle ${it._expanded ? 'open' : ''}" data-action="item-expand" data-ci="${ci}" data-ii="${ii}" aria-label="More">⌄</button>
        </div>
        <div class="mb-item-detail">
          <div class="mb-field-label">Description</div>
          <textarea class="mb-textarea" data-ci="${ci}" data-ii="${ii}" data-field="description"
                    placeholder="Make it mouth-watering…">${esc(it.description)}</textarea>

          <div class="mb-field-label">Price note (optional)</div>
          <input class="mb-input" data-ci="${ci}" data-ii="${ii}" data-field="price_note"
                 placeholder="e.g. per person, good for 2" value="${attr(it.price_note)}" />

          <div class="mb-field-label">Tags</div>
          <div class="mb-tags">
            ${TAGS.map(t => `<button type="button" class="mb-tag ${it.tags.includes(t) ? 'on' : ''}" data-action="item-tag" data-ci="${ci}" data-ii="${ii}" data-tag="${attr(t)}">${esc(t)}</button>`).join('')}
          </div>

          <div class="mb-item-meta">
            <div class="mb-avail ${it.is_available ? 'on' : ''}" data-action="item-avail" data-ci="${ci}" data-ii="${ii}">
              <span class="mb-switch"></span>
              <span>${it.is_available ? 'Available' : 'Sold out'}</span>
            </div>
            <div style="display:flex;gap:6px">
              <button class="mb-iconbtn" data-action="item-up" data-ci="${ci}" data-ii="${ii}" ${ii === 0 ? 'disabled' : ''}>▲</button>
              <button class="mb-iconbtn" data-action="item-down" data-ci="${ci}" data-ii="${ii}" ${ii === last ? 'disabled' : ''}>▼</button>
              <button class="mb-iconbtn danger" data-action="item-del" data-ci="${ci}" data-ii="${ii}">🗑</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ── Events (delegated) ─────────────────────────────────── */
  function wire() {
    const cats = document.getElementById('mb-cats');

    /* Text inputs — update the model in place, no re-render (keeps focus). */
    cats.addEventListener('input', e => {
      const el = e.target;
      const ci = +el.dataset.ci, ii = el.dataset.ii;
      if (el.dataset.field === 'cat-name') { MENU[ci].name = el.value; }
      else if (ii != null) { MENU[ci].items[+ii][el.dataset.field] = el.value; }
      markDirty();
    });

    cats.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      const ci = btn.dataset.ci != null ? +btn.dataset.ci : null;
      const ii = btn.dataset.ii != null ? +btn.dataset.ii : null;

      if (a === 'cat-del') {
        if (!confirm('Delete this category and all its items?')) return;
        MENU.splice(ci, 1); markDirty(); render();
      } else if (a === 'cat-up')   { swap(MENU, ci, ci - 1); markDirty(); render(); }
      else if (a === 'cat-down')   { swap(MENU, ci, ci + 1); markDirty(); render(); }
      else if (a === 'item-add')   { MENU[ci].items.push(blankItem(true)); markDirty(); render(); focusLastItem(ci); }
      else if (a === 'item-del')   { MENU[ci].items.splice(ii, 1); markDirty(); render(); }
      else if (a === 'item-up')    { swap(MENU[ci].items, ii, ii - 1); markDirty(); render(); }
      else if (a === 'item-down')  { swap(MENU[ci].items, ii, ii + 1); markDirty(); render(); }
      else if (a === 'item-expand') {
        const it = MENU[ci].items[ii]; it._expanded = !it._expanded;
        btn.closest('.mb-item').classList.toggle('expanded', it._expanded);
        btn.classList.toggle('open', it._expanded);
      }
      else if (a === 'item-avail') {
        const it = MENU[ci].items[ii]; it.is_available = !it.is_available;
        btn.classList.toggle('on', it.is_available);
        btn.querySelector('span:last-child').textContent = it.is_available ? 'Available' : 'Sold out';
        markDirty();
      }
      else if (a === 'item-tag') {
        const it = MENU[ci].items[ii], tag = btn.dataset.tag;
        const i = it.tags.indexOf(tag);
        if (i >= 0) it.tags.splice(i, 1); else it.tags.push(tag);
        btn.classList.toggle('on');
        markDirty();
      }
      else if (a === 'item-photo') { openPhoto(ci, ii); }
    });

    document.getElementById('mb-add-cat').addEventListener('click', addCategory);
    document.getElementById('mb-empty-add').addEventListener('click', addCategory);
    document.getElementById('mb-save').addEventListener('click', save);
    document.getElementById('mb-file').addEventListener('change', onPhotoPicked);

    /* Scan a menu photo → AI extracts categories + items. */
    document.getElementById('mb-scan-btn').addEventListener('click', () =>
      document.getElementById('mb-scan-file').click());
    document.getElementById('mb-scan-file').addEventListener('change', onMenuScanned);

    window.addEventListener('beforeunload', e => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  function addCategory() {
    MENU.push({ name: '', items: [blankItem(false)] });
    markDirty();
    render();
    const inputs = document.querySelectorAll('.mb-cat-name');
    inputs[inputs.length - 1]?.focus();
  }

  function blankItem(expanded) {
    return { name: '', description: '', price: '', price_note: '', image_url: '', tags: [], is_available: true, _expanded: !!expanded };
  }
  function swap(arr, i, j) { if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
  function focusLastItem(ci) {
    const card = document.querySelector(`.mb-cat[data-ci="${ci}"]`);
    const names = card?.querySelectorAll('.mb-item-name');
    names && names[names.length - 1]?.focus();
  }

  /* ── Photo upload ───────────────────────────────────────── */
  function openPhoto(ci, ii) {
    photoTarget = { ci, ii };
    document.getElementById('mb-file').click();
  }

  async function onPhotoPicked(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !photoTarget) return;
    if (file.size > 5 * 1024 * 1024) return toast('Image must be under 5 MB', true);

    const { ci, ii } = photoTarget;
    toast('Uploading photo…');
    const c = window.YYP.client;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${restaurant.slug}/menu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error } = await c.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) return toast('Upload failed: ' + error.message, true);

    const { data } = c.storage.from(BUCKET).getPublicUrl(path);
    MENU[ci].items[ii].image_url = data?.publicUrl || '';
    markDirty();
    render();
    toast('Photo added ✓');
  }

  /* ── Scan a menu photo (AI) ─────────────────────────────────
     Sends the image to the menu-scan edge function, which uses
     Claude vision to extract categories + items, then merges the
     result into the builder for the owner to review and save. */
  async function onMenuScanned(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('Image must be under 8 MB', true);

    const endpoint = window.YUMYUMPO_CONFIG?.MENU_SCAN_ENDPOINT;
    if (!endpoint) return toast('Menu scanning is unavailable right now.', true);

    const busy = showScanBusy();
    try {
      const image = await fileToDataURL(file);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.YUMYUMPO_CONFIG.SUPABASE_ANON_KEY || '',
          'Authorization': 'Bearer ' + (window.YUMYUMPO_CONFIG.SUPABASE_ANON_KEY || ''),
        },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.categories)) {
        throw new Error(data.error || 'Could not read that menu.');
      }
      if (!data.categories.length) {
        toast('No menu items found — try a clearer photo.', true);
        return;
      }
      const added = mergeScannedMenu(data.categories);
      markDirty();
      render();
      toast(`Added ${added} item${added === 1 ? '' : 's'} — review &amp; save ✓`);
    } catch (err) {
      toast(err.message || 'Menu scan failed.', true);
    } finally {
      busy.remove();
    }
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read the image file.'));
      r.readAsDataURL(file);
    });
  }

  /* Merge scanned categories into MENU — append to a matching
     category (case-insensitive) or create a new one. */
  function mergeScannedMenu(categories) {
    let count = 0;
    categories.forEach(sc => {
      const name = (sc.name || 'Menu').trim();
      let cat = MENU.find(c => (c.name || '').trim().toLowerCase() === name.toLowerCase());
      if (!cat) { cat = { name, items: [] }; MENU.push(cat); }
      (sc.items || []).forEach(si => {
        if (!si.name) return;
        cat.items.push({
          name: si.name, description: si.description || '', price: si.price || '',
          price_note: '', image_url: '', tags: [], is_available: true, _expanded: false,
        });
        count++;
      });
    });
    return count;
  }

  function showScanBusy() {
    const el = document.createElement('div');
    el.className = 'mb-scan-busy';
    el.innerHTML = `<div class="mb-spinner"></div>
      <p>Reading your menu…</p>
      <span>Our AI is pulling out the dishes and prices. This takes a few seconds.</span>`;
    document.body.appendChild(el);
    return el;
  }

  /* ── Save ───────────────────────────────────────────────── */
  async function save() {
    const btn = document.getElementById('mb-save');
    btn.disabled = true; btn.textContent = 'Saving…';

    const payload = MENU.map(cat => ({
      name: (cat.name || '').trim(),
      items: cat.items
        .filter(it => (it.name || '').trim())
        .map(it => ({
          name: it.name.trim(),
          description: it.description || '',
          price: it.price || '',
          price_note: it.price_note || '',
          image_url: it.image_url || '',
          gallery_urls: it.image_url ? [it.image_url] : [],
          tags: it.tags || [],
          is_available: it.is_available !== false,
        })),
    })).filter(cat => cat.name);

    const { error } = await window.YYP.client.rpc('save_restaurant_menu', {
      p_restaurant_id: restaurant.id,
      p_categories: payload,
    });

    btn.disabled = false; btn.textContent = 'Save menu';
    if (error) { toast('Could not save: ' + error.message, true); return; }

    clearDirty();
    toast('Menu saved — it\'s live now ✨');
  }

  function markDirty() {
    dirty = true;
    const s = document.getElementById('mb-savebar-status');
    s.textContent = 'Unsaved changes';
    s.classList.add('dirty');
  }
  function clearDirty() {
    dirty = false;
    const s = document.getElementById('mb-savebar-status');
    s.textContent = 'All changes saved';
    s.classList.remove('dirty');
  }

  let toastTimer;
  function toast(msg, isErr) {
    const t = document.getElementById('mb-toast');
    t.textContent = msg;
    t.className = 'mb-toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'mb-toast'; }, 2600);
  }

  /* HTML helpers */
  function esc(s) { return String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function attr(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();
