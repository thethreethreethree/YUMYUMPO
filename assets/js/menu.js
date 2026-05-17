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
      btn.addEventListener('click', () => {
        const sec = document.getElementById('cat-' + btn.dataset.cat);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    /* Body */
    document.getElementById('menu-body').innerHTML = CATS.map((c, i) => `
      <section class="menu-cat" id="cat-${i}" data-cat-section="${i}">
        <div class="menu-cat-head">
          <h2 class="menu-cat-title">${esc(c.name)}</h2>
          <span class="menu-cat-count">${c.items.length} item${c.items.length === 1 ? '' : 's'}</span>
        </div>
        ${c.items.map(itemCard).join('')}
      </section>
    `).join('');

    wireSearch();
    wireLightbox();
    wireScrollSpy();
    reveal();
  }

  function itemCard(it) {
    const photo = it.image || it.image_url || (it.gallery && it.gallery[0]) || '';
    const available = it.is_available !== false;
    const tags = (it.tags || []).map(t => `<span class="menu-item-tag">${esc(t)}</span>`).join('');
    return `
      <article class="menu-item${available ? '' : ' unavailable'}" data-name="${esc((it.name || '').toLowerCase())}">
        ${photo ? `<img class="menu-item-photo" src="${esc(photo)}" alt="${esc(it.name)}" loading="lazy" data-zoom="${esc(photo)}" />` : ''}
        <div class="menu-item-body">
          <div class="menu-item-top">
            <div>
              <div class="menu-item-name">${esc(it.name || 'Item')}</div>
              ${it.price_note ? `<div class="menu-item-pricenote">${esc(it.price_note)}</div>` : ''}
            </div>
            ${it.price ? `<div class="menu-item-price">${esc(it.price)}</div>` : ''}
          </div>
          ${it.description ? `<p class="menu-item-desc">${esc(it.description)}</p>` : ''}
          <div class="menu-item-tags">
            ${tags}
            ${available ? '' : '<span class="menu-item-tag out">Currently unavailable</span>'}
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
      document.querySelectorAll('.menu-item').forEach(el => {
        el.style.display = !q || el.dataset.name.includes(q) ? '' : 'none';
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

  /* Highlight the category pill for the section currently in view. */
  function wireScrollSpy() {
    const pills = [...document.querySelectorAll('.menu-cat-pill')];
    const sections = [...document.querySelectorAll('[data-cat-section]')];
    if (!('IntersectionObserver' in window) || !sections.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const i = en.target.dataset.catSection;
        pills.forEach(p => p.classList.toggle('active', p.dataset.cat === i));
        const active = pills.find(p => p.dataset.cat === i);
        active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      });
    }, { rootMargin: '-130px 0px -65% 0px' });
    sections.forEach(s => io.observe(s));
  }

  function reveal() {
    document.getElementById('menu-loading').style.display = 'none';
    document.getElementById('menu-app').style.display = '';
  }
})();
