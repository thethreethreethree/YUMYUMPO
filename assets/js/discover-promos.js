/* ============================================================
   YUMYUMPO — Discover page "Live Promotions"
   City-scoped promo strip under the cuisine filter bar. Re-renders
   when the visitor changes the Discover location filter (discover.js
   dispatches 'yyp:city-changed'). Hidden when nothing is live.
   ============================================================ */

'use strict';

(function () {
  let LIVE = null;   // cached live promos for this page load

  document.addEventListener('DOMContentLoaded', () => {
    if (window.YYP?.ready) init();
    else document.addEventListener('yyp:ready', init, { once: true });
  });

  async function init() {
    await fetchLive();
    render();
    document.addEventListener('yyp:city-changed', render);
  }

  function preferredCity() {
    try { return (localStorage.getItem('yyp_city') || '').trim() || null; }
    catch { return null; }
  }
  function cityOf(loc) { return String(loc || '').split(',')[0].trim(); }

  async function fetchLive() {
    const c = window.YYP?.client;
    if (!c) { LIVE = []; return; }
    const { data, error } = await c
      .from('venue_announcements')
      .select('id, title, body, image_url, link_url, starts_at, ends_at, is_published, restaurants(name, slug, cover_image_url, location)')
      .eq('is_published', true)
      .order('starts_at', { ascending: false })
      .limit(60);
    if (error) { console.warn('[discover-promos]', error.message); LIVE = []; return; }

    const now = Date.now();
    LIVE = (data || []).filter(a => {
      const started  = !a.starts_at || new Date(a.starts_at).getTime() <= now;
      const notEnded = !a.ends_at   || new Date(a.ends_at).getTime()   >= now;
      return started && notEnded && a.restaurants;
    });
  }

  function render() {
    const sec  = document.getElementById('discover-promos');
    const grid = document.getElementById('discover-promos-grid');
    const sub  = document.getElementById('discover-promos-sub');
    if (!sec || !grid || !LIVE) return;

    if (!LIVE.length) { sec.style.display = 'none'; return; }

    /* Feature the city the visitor filtered Discover by; else the
       busiest one. */
    let city = preferredCity();
    if (!city) {
      const tally = {};
      LIVE.forEach(a => {
        const ct = cityOf(a.restaurants.location);
        if (ct) tally[ct] = (tally[ct] || 0) + 1;
      });
      city = Object.entries(tally).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
    }

    const inCity = city
      ? LIVE.filter(a => cityOf(a.restaurants.location).toLowerCase() === city.toLowerCase())
      : LIVE;

    if (!inCity.length) { sec.style.display = 'none'; return; }

    if (sub) sub.textContent = city ? `What's happening in ${city}` : 'Promotions near you';
    grid.innerHTML = inCity.slice(0, 3).map(card).join('');   // 3 promo slots
    sec.style.display = '';
  }

  function card(a) {
    const r = a.restaurants || {};
    const img = a.image_url || r.cover_image_url || '';
    const href = r.slug ? `restaurant.html?slug=${encodeURIComponent(r.slug)}` : (a.link_url || '#');
    return `
      <a href="${esc(href)}" class="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-brand-yellow hover:-translate-y-1 transition-all" style="text-decoration:none">
        <div style="aspect-ratio:16/9;background:#F3F3F3 center/cover no-repeat${img ? `;background-image:url('${esc(img)}')` : ''}"></div>
        <div class="p-4">
          <h3 class="font-display font-black text-base text-brand-black leading-tight">${esc(a.title)}</h3>
          ${a.body ? `<p class="text-sm text-gray-500 mt-1 line-clamp-2">${esc(a.body)}</p>` : ''}
          <p class="text-xs font-bold text-gray-400 mt-2">${esc(r.name || 'YUMYUMPO restaurant')}</p>
        </div>
      </a>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
})();
