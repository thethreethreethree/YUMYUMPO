/* ============================================================
   YUMYUMPO — Home page "Live Promotions"
   Surfaces currently-running venue_announcements on the landing
   page. Public-readable (RLS: anyone can read is_published rows).
   The section stays hidden when nothing is live.
   ============================================================ */

'use strict';

(function () {
  const TYPE_LABEL = {
    announcement: '📣 Announcement', promo: '💸 Promo', event: '📅 Event',
    'happy-hour': '🍻 Happy Hour', 'live-music': '🎵 Live Music', menu: '🍽️ New Dish',
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (window.YYP?.ready) load();
    else document.addEventListener('yyp:ready', load, { once: true });
  });

  async function load() {
    const c = window.YYP?.client;
    const grid = document.getElementById('home-promos-grid');
    const sec  = document.getElementById('home-promos');
    if (!c || !grid || !sec) return;

    const nowISO = new Date().toISOString();
    /* Pull published announcements that have started; filter the
       end window in JS so a null ends_at (open-ended) still shows. */
    const { data, error } = await c
      .from('venue_announcements')
      .select('id, title, body, type, image_url, link_url, starts_at, ends_at, is_published, restaurants(name, slug, cover_image_url)')
      .eq('is_published', true)
      .order('starts_at', { ascending: false })
      .limit(40);

    if (error) { console.warn('[home-promos]', error.message); return; }

    const now = Date.now();
    const live = (data || []).filter(a => {
      const started = !a.starts_at || new Date(a.starts_at).getTime() <= now;
      const notEnded = !a.ends_at || new Date(a.ends_at).getTime() >= now;
      return started && notEnded;
    }).slice(0, 9);

    if (!live.length) return;   // nothing live → section stays hidden

    grid.innerHTML = live.map(card).join('');
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
          <span class="text-xs font-black text-yellow-700 bg-yellow-light px-2 py-0.5 rounded-full">${esc(TYPE_LABEL[a.type] || '📣 Announcement')}</span>
          <h3 class="font-display font-black text-base text-brand-black mt-2 leading-tight">${esc(a.title)}</h3>
          ${a.body ? `<p class="text-sm text-gray-500 mt-1 line-clamp-2">${esc(a.body)}</p>` : ''}
          <p class="text-xs font-bold text-gray-400 mt-2">${esc(r.name || 'YUMYUMPO restaurant')}</p>
        </div>
      </a>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }
})();
