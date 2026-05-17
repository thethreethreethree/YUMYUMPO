/* ============================================================
   YUMYUMPO — Digital Menu (menu.html)
   Standalone, sleek public menu rendered from a restaurant's
   own menu data. Reached via /menu?slug=… (the QR target).
   Separate from the Order Request feature.
   ============================================================ */

'use strict';

(function () {
  let RESTAURANT = null;
  let CATS = [];

  document.addEventListener('DOMContentLoaded', () => {
    if (window.YYP?.ready) init();
    else document.addEventListener('yyp:ready', init, { once: true });
  });

  async function init() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug) return showError();

    let r;
    try {
      r = await window.db?.getRestaurantBySlug(slug);
    } catch (e) {
      console.warn('[menu] load failed', e);
    }
    if (!r) return showError();

    RESTAURANT = r;
    CATS = (r.menu_categories || [])
      .map(c => ({ ...c, items: c.items || c.menu_items || [] }))
      .filter(c => c.items.length);

    render();

    /* Record the digital-menu open (QR scans land here). */
    window.db?.trackAnalyticsEvent('digital_menu_view', r.id, { slug: r.slug });
  }

  function showError() {
    document.getElementById('menu-loading').style.display = 'none';
    document.getElementById('menu-error').style.display = '';
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  /* Is the restaurant open right now, per its hours? */
  function openStatus(r) {
    const hrs = r.hours || [];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const row = hrs.find(h => h.day === today);
    if (!row) return null;
    if (row.closed) return { open: false, label: 'Closed today' };
    if (!row.open || !row.close) return null;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const toM = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
    const o = toM(row.open), c = toM(row.close);
    const isOpen = c > o ? (mins >= o && mins < c) : (mins >= o || mins < c);
    return { open: isOpen, label: isOpen ? `Open · until ${row.close}` : `Closed · opens ${row.open}` };
  }

  function render() {
    const r = RESTAURANT;
    document.getElementById('page-title').textContent = `${r.name} — Menu`;
    document.getElementById('meta-desc').setAttribute('content', `Digital menu for ${r.name}${r.location ? ' · ' + r.location : ''}`);

    /* Hero */
    const hero = document.getElementById('menu-hero');
    if (r.cover_image_url) hero.style.backgroundImage = `url("${r.cover_image_url}")`;

    const logo = document.getElementById('menu-logo');
    if (r.logo_image_url) logo.style.backgroundImage = `url("${r.logo_image_url}")`;
    else logo.textContent = '🍽️';

    document.getElementById('menu-name').textContent = r.name || 'Menu';
    document.getElementById('menu-meta').textContent =
      [r.cuisine_type, r.location].filter(Boolean).join('  ·  ');

    const status = openStatus(r);
    const statusEl = document.getElementById('menu-status');
    if (status) {
      statusEl.innerHTML = `<span class="menu-pill ${status.open ? 'open' : 'closed'}">${status.open ? '● ' : ''}${esc(status.label)}</span>`;
    }

    document.getElementById('menu-profile-link').href = `restaurant.html?slug=${encodeURIComponent(r.slug)}`;

    /* Empty menu */
    if (!CATS.length) {
      document.getElementById('menu-sticky').style.display = 'none';
      document.getElementById('menu-body').innerHTML = `
        <div class="menu-empty">
          <div class="menu-empty-emoji">🍴</div>
          <p>This restaurant hasn't published its menu yet.</p>
        </div>`;
      reveal();
      return;
    }

    /* Category jump-nav */
    const nav = document.getElementById('menu-catnav');
    nav.innerHTML = CATS.map((c, i) =>
      `<button class="menu-cat-pill${i === 0 ? ' active' : ''}" data-cat="${i}">${esc(c.name)}</button>`
    ).join('');
    nav.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => showCat(+btn.dataset.cat, true));
    });

    /* Body */
    document.getElementById('menu-body').innerHTML = CATS.map((c, i) => `
      <section class="menu-cat" id="cat-${i}" data-cat-section="${i}">
        <div class="menu-cat-head">
          <span class="menu-cat-num">${String(i + 1).padStart(2, '0')}</span>
          <div class="menu-cat-titlewrap">
            <h2 class="menu-cat-title">${esc(c.name)}</h2>
            <span class="menu-cat-count">${c.items.length} item${c.items.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        ${c.items.map(itemCard).join('')}
      </section>
    `).join('');

    wireSearch();
    wireLightbox();
    showCat(0, false);   // one category at a time — start on the first
    reveal();
  }

  /* Show a single category; hide the rest. The cat-nav pills act
     as tabs. `scroll` lifts the page to the menu start on tap. */
  let activeCat = 0;
  function showCat(i, scroll) {
    activeCat = i;
    document.querySelectorAll('[data-cat-section]').forEach(sec => {
      const on = +sec.dataset.catSection === i;
      sec.style.display = on ? '' : 'none';
      if (on) sec.querySelectorAll('.menu-item').forEach(el => el.classList.add('in'));
    });
    document.querySelectorAll('.menu-cat-pill').forEach(p => {
      const on = +p.dataset.cat === i;
      p.classList.toggle('active', on);
      if (on) p.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
    if (scroll) {
      const sticky = document.getElementById('menu-sticky');
      const y = (sticky?.offsetTop || 0);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  /* Tag → colour class. Gives the menu visual rhythm + meaning. */
  const TAG_CLASS = {
    'best seller': 't-gold', 'bestseller': 't-gold', 'popular': 't-gold',
    "chef's pick": 't-black', 'chefs pick': 't-black', 'new': 't-black',
    'spicy': 't-red', 'hot': 't-red',
    'vegetarian': 't-green', 'vegan': 't-green', 'gluten-free': 't-green', 'healthy': 't-green',
  };
  const FEATURED_TAGS = ['best seller', 'bestseller', "chef's pick", 'chefs pick'];

  function itemCard(it) {
    const photo = it.image || it.image_url || (it.gallery && it.gallery[0]) || '';
    const available = it.is_available !== false;
    const itemTags = it.tags || [];
    const featured = itemTags.some(t => FEATURED_TAGS.includes(String(t).toLowerCase()));
    const mono = (it.name || '?').trim().charAt(0).toUpperCase();

    const tags = itemTags.map(t => {
      const cls = TAG_CLASS[String(t).toLowerCase()] || '';
      return `<span class="menu-item-tag ${cls}">${esc(t)}</span>`;
    }).join('');

    const media = photo
      ? `<img class="menu-item-photo" src="${esc(photo)}" alt="${esc(it.name)}" loading="lazy" data-zoom="${esc(photo)}" />`
      : `<div class="menu-item-noimg">${esc(mono)}</div>`;

    return `
      <article class="menu-item${available ? '' : ' unavailable'}${featured ? ' featured' : ''}" data-name="${esc((it.name || '').toLowerCase())}">
        ${media}
        <div class="menu-item-body">
          <div class="menu-item-top">
            <div>
              <div class="menu-item-name">${featured ? '<span class="menu-item-star">★</span> ' : ''}${esc(it.name || 'Item')}</div>
              ${it.price_note ? `<div class="menu-item-pricenote">${esc(it.price_note)}</div>` : ''}
            </div>
            ${it.price ? `<div class="menu-item-price">${esc(it.price)}</div>` : ''}
          </div>
          ${it.description ? `<p class="menu-item-desc">${esc(it.description)}</p>` : ''}
          <div class="menu-item-tags">
            ${tags}
            ${available ? '' : '<span class="menu-item-tag out">Sold out</span>'}
          </div>
        </div>
      </article>`;
  }

  function wireSearch() {
    const input = document.getElementById('menu-search');
    const clear = document.getElementById('menu-search-clear');
    const apply = () => {
      const q = input.value.trim().toLowerCase();
      clear.style.display = q ? 'block' : 'none';

      if (!q) {
        /* No query — reset per-item filters, back to single-category view. */
        document.querySelectorAll('.menu-item').forEach(el => { el.style.display = ''; });
        showCat(activeCat, false);
        return;
      }

      /* Searching — look across ALL categories, show only matches. */
      document.querySelectorAll('.menu-item').forEach(el => {
        el.style.display = el.dataset.name.includes(q) ? '' : 'none';
        el.classList.add('in');
      });
      document.querySelectorAll('[data-cat-section]').forEach(sec => {
        const anyVisible = [...sec.querySelectorAll('.menu-item')].some(el => el.style.display !== 'none');
        sec.style.display = anyVisible ? '' : 'none';
      });
    };
    input.addEventListener('input', apply);
    clear.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
  }

  function wireLightbox() {
    const box = document.getElementById('menu-lightbox');
    const img = document.getElementById('menu-lightbox-img');
    document.getElementById('menu-body').addEventListener('click', e => {
      const t = e.target.closest('[data-zoom]');
      if (!t) return;
      img.src = t.dataset.zoom;
      box.style.display = 'flex';
    });
    const close = () => { box.style.display = 'none'; img.src = ''; };
    box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('menu-lightbox-close')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function reveal() {
    document.getElementById('menu-loading').style.display = 'none';
    document.getElementById('menu-app').style.display = '';
  }
})();
