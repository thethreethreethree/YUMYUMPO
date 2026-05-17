/* ============================================================
   YUMYUMPO — Admin Restaurant Stats Module
   Renders the "Restaurant Stats" tab: pick a restaurant, see a
   full analytics bundle (orders, engagement, traffic, buzz,
   content) from the get_restaurant_analytics RPC (migration 027).
   ============================================================ */

'use strict';

(function () {

  function init() {
    if (window.YYP?.ready) bootstrap();
    else document.addEventListener('yyp:ready', bootstrap, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  const n   = v => (v == null ? '—' : Number(v).toLocaleString());
  const pct = v => (v == null ? '—' : v + '%');
  const peso = v => (v == null ? '—' : '₱' + Number(v).toLocaleString());

  async function bootstrap() {
    const c = window.YYP?.client;
    const select = document.getElementById('rstats-select');
    if (!c || !select) return;

    const { data } = await c.from('restaurants')
      .select('id, name')
      .order('name');
    select.innerHTML = '<option value="">Select a restaurant…</option>'
      + (data || []).map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');

    select.addEventListener('change', () => {
      if (select.value) loadStats(select.value, select.options[select.selectedIndex].text);
    });
  }

  async function loadStats(restaurantId, name) {
    const c = window.YYP?.client;
    const body  = document.getElementById('rstats-body');
    const empty = document.getElementById('rstats-empty');
    if (!c || !body) return;

    empty.classList.add('hidden');
    body.classList.remove('hidden');
    body.innerHTML = '<p class="text-sm text-gray-400 italic">Loading analytics…</p>';

    const { data, error } = await c.rpc('get_restaurant_analytics', { p_restaurant_id: restaurantId });
    if (error) {
      body.innerHTML = `<p class="text-sm text-red-600">Could not load: ${esc(error.message)}</p>`;
      return;
    }

    const o = data.orders || {};
    const e = data.engagement || {};
    const t = data.traffic || {};
    const b = data.buzz || {};
    const ct = data.content || {};
    const recent = data.recent_orders || [];

    body.innerHTML = `
      <div>
        <h2 class="font-display font-black text-xl text-brand-black mb-1">${esc(name)}</h2>
        <p class="text-sm text-gray-400">
          Buzz score <strong class="text-brand-black">${n(Math.round(b.score || 0))}</strong>
          ${b.tier ? `<span class="perf-badge ${b.tier === 'hot' ? 'perf-hot' : 'perf-stable'} ml-1">${esc(b.tier)}</span>` : ''}
        </p>
      </div>

      <!-- Order requests -->
      <section>
        <h3 class="font-display font-black text-base text-brand-black mb-3">Order Requests</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          ${statCard(n(o.total), 'Total requests')}
          ${statCard(n(o.open), 'Open / awaiting')}
          ${statCard(pct(o.accept_pct), 'Accept rate')}
          ${statCard(peso(o.avg_order_value), 'Avg order value')}
          ${statCard(o.avg_response_min == null ? '—' : o.avg_response_min + ' min', 'Avg response time')}
          ${statCard(peso(o.total_revenue), 'Revenue (paid)')}
          ${statCard(n(o.orders_7d), 'Last 7 days')}
          ${statCard(n(o.orders_30d), 'Last 30 days')}
        </div>
        <div class="section-card">
          <p class="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Status breakdown</p>
          <div class="flex flex-wrap gap-2">
            ${statusPill('Pending', o.pending)}
            ${statusPill('Acknowledged', o.acknowledged)}
            ${statusPill('Quoted', o.quoted)}
            ${statusPill('Accepted', o.accepted)}
            ${statusPill('Completed', o.completed)}
            ${statusPill('Paid', o.paid)}
            ${statusPill('Denied', o.denied)}
          </div>
          <p class="text-xs text-gray-400 mt-3">Last request: ${o.last_request_at ? new Date(o.last_request_at).toLocaleString() : 'never'}</p>
        </div>
      </section>

      <!-- Traffic -->
      <section>
        <h3 class="font-display font-black text-base text-brand-black mb-3">Traffic <span class="text-xs text-gray-400 font-normal">· last 30 days</span></h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard(n(t.profile_views_30d), 'Profile views (30d)')}
          ${statCard(n(t.profile_views_7d), 'Profile views (7d)')}
          ${statCard(n(t.card_clicks_30d), 'Card clicks')}
          ${statCard(n(t.menu_views_30d), 'Menu views')}
          ${statCard(n(t.whatsapp_30d), 'WhatsApp clicks')}
          ${statCard(n(t.instagram_30d), 'Instagram clicks')}
          ${statCard(n(t.messenger_30d), 'Messenger clicks')}
          ${statCard(n(t.website_30d), 'Website clicks')}
          ${statCard(n(t.total_events_30d), 'Total events (30d)')}
        </div>
      </section>

      <!-- Engagement -->
      <section>
        <h3 class="font-display font-black text-base text-brand-black mb-3">Engagement <span class="text-xs text-gray-400 font-normal">· all time</span></h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard(n(e.follows), 'Followers')}
          ${statCard(n(e.saves), 'Saved to lists')}
          ${statCard(n(e.history_views), 'Profile visits (logged-in)')}
          ${statCard(n(e.reactions_love), '❤️ Love')}
          ${statCard(n(e.reactions_want), '📍 Want to go')}
          ${statCard(n(e.reactions_been), '✅ Been there')}
        </div>
      </section>

      <!-- Content -->
      <section>
        <h3 class="font-display font-black text-base text-brand-black mb-3">Content</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${statCard(n(ct.announcements_published), 'Live announcements')}
          ${statCard(n(ct.announcements_pending), 'Pending announcements')}
          ${statCard(n(ct.announcements_total), 'Announcements (total)')}
        </div>
      </section>

      <!-- Recent orders -->
      <section>
        <h3 class="font-display font-black text-base text-brand-black mb-3">Recent Order Requests</h3>
        ${recent.length ? `<div class="space-y-2">${recent.map(recentRow).join('')}</div>`
          : '<p class="text-sm text-gray-400 italic">No order requests yet.</p>'}
      </section>
    `;
  }

  function statCard(value, label) {
    return `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${esc(label)}</div></div>`;
  }
  function statusPill(label, count) {
    return `<span class="app-status ${count ? 'reviewing' : 'pending'}" style="${count ? '' : 'opacity:.55'}">${esc(label)}: ${n(count || 0)}</span>`;
  }
  function recentRow(r) {
    const when = new Date(r.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    return `
      <div class="app-card" style="cursor:default">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p class="text-sm font-bold text-brand-black">${esc(r.customer_name || 'Customer')}</p>
            <p class="text-xs text-gray-400">${esc(when)}</p>
          </div>
          <div class="flex items-center gap-3">
            ${r.quoted_total != null ? `<span class="text-sm font-bold text-brand-black">${peso(r.quoted_total)}</span>` : ''}
            <span class="app-status ${esc(r.status)}">${esc(r.status)}</span>
          </div>
        </div>
      </div>`;
  }

})();
