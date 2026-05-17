/* ============================================================
   YUMYUMPO — Home page "Live Promotions" (location-based)
   Surfaces currently-running venue_announcements for the city the
   visitor is exploring. The city comes from their last search /
   browsing (localStorage 'yyp_city'); if none, we use whichever
   city has the most live promos. Section hides when nothing's on.
   ============================================================ */

'use strict';

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.YYP?.ready) load();
    else document.addEventListener('yyp:ready', load, { once: true });
  });

  /* The city the visitor is exploring — set by Discover / search.
     Falls back to null (then we pick the busiest city below). */
  function preferredCity() {
    try { return (localStorage.getItem('yyp_city') || '').trim() || null; }
    catch { return null; }
  }

  /* Reduce a full location ("El Nido, Palawan") to its city ("El Nido"). */
  function cityOf(loc) {
    return String(loc || '').split(',')[0].trim();
  }

  async function load() {
    const c = window.YYP?.client;
    const grid = document.getElementById('home-promos-grid');
    const sec  = document.getElementById('home-promos');
    const sub  = document.getElementById('home-promos-sub');
    if (!c || !grid || !sec) return;

    const { data, error } = await c
      .from('venue_announcements')
      .select('id, title, body, image_url, link_url, starts_at, ends_at, is_published, restaurants(name, slug, cover_image_url, location)')
      .eq('is_published', true)
      .order('starts_at', { ascending: false })
      .limit(60);

    if (error) { console.warn('[home-promos]', error.message); return; }

    /* Currently-running only. */
    const now = Date.now();
    const live = (data || []).filter(a => {
      const started  = !a.starts_at || new Date(a.starts_at).getTime() <= now;
      const notEnded = !a.ends_at   || new Date(a.ends_at).getTime()   >= now;
      return started && notEnded && a.restaurants;
    });
    if (!live.length) return;   // nothing live anywhere → stay hidden

    /* Pick the city to feature. */
    let city = preferredCity();
    if (!city) {
      /* No search context — feature whichever city has the most promos. */
      const tally = {};
      live.forEach(a => {
        const ct = cityOf(a.restaurants.location);
        if (ct) tally[ct] = (tally[ct] || 0) + 1;
      });
      city = Object.entries(tally).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
    }

    /* Filter to that city. */
    const inCity = city
      ? live.filter(a => cityOf(a.restaurants.location).toLowerCase() === city.toLowerCase())
      : live;
    if (!inCity.length) return;   // nothing live in the visitor's city

    if (sub) sub.textContent = city
      ? `Check out what's happening in ${city}`
      : "Check out what's happening near you";

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
