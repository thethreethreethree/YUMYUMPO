/* ============================================================
   YUMYUMPO — Admin Restaurant Stats Module
   Renders the "Restaurant Stats" tab: pick a restaurant, see a
   full analytics bundle (orders, engagement, traffic, buzz,
   content) from the get_restaurant_analytics RPC (migration 027).
   ============================================================ */

'use strict';

(function () {

  let LAST = null;   // { data, name, id, profile, menu } of the last-loaded restaurant

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

    /* Pull analytics + the data we need for the full restaurant export
       (profile, menu, internal notes) in one round-trip. */
    const [analyticsQ, profileQ, menuQ] = await Promise.all([
      c.rpc('get_restaurant_analytics', { p_restaurant_id: restaurantId }),
      c.from('restaurants').select(
        'id,name,slug,cuisine_type,location,address,phone,website_url,'
        + 'whatsapp_url,instagram_url,facebook_url,messenger_url,'
        + 'owner_email,owner_user_id,is_active,is_demo,has_yumyumpo_site,'
        + 'accepting_orders,google_rating,review_count,'
        + 'restaurant_notes,created_at'
      ).eq('id', restaurantId).maybeSingle(),
      c.from('menu_categories').select(
        'name,sort_order,menu_items(name,description,price,price_note,is_available,tags,sort_order)'
      ).eq('restaurant_id', restaurantId).order('sort_order'),
    ]);
    const { data, error } = analyticsQ;
    if (error) {
      body.innerHTML = `<p class="text-sm text-red-600">Could not load: ${esc(error.message)}</p>`;
      return;
    }

    /* Stash for the export + the inline Restaurant Notes editor. */
    LAST = {
      data, name,
      id:      restaurantId,
      profile: profileQ.data || {},
      menu:    Array.isArray(menuQ.data) ? menuQ.data : [],
    };

    const o = data.orders || {};
    const e = data.engagement || {};
    const t = data.traffic || {};
    const b = data.buzz || {};
    const ct = data.content || {};
    const recent = data.recent_orders || [];

    body.innerHTML = `
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="font-display font-black text-xl text-brand-black mb-1">${esc(name)}</h2>
          <p class="text-sm text-gray-400">
            Buzz score <strong class="text-brand-black">${n(Math.round(b.score || 0))}</strong>
            ${b.tier ? `<span class="perf-badge ${b.tier === 'hot' ? 'perf-hot' : 'perf-stable'} ml-1">${esc(b.tier)}</span>` : ''}
          </p>
        </div>
        <button id="rstats-export" class="btn-yellow btn-sm">⬇ Export to Excel</button>
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

      <!-- Restaurant Notes (admin-internal, included in export) -->
      <section>
        <h3 class="font-display font-black text-base text-brand-black mb-1">Restaurant Notes</h3>
        <p class="text-xs text-gray-400 mb-3">Internal — visible to admins only. Included in the export.</p>
        <textarea id="rstats-notes" rows="5" class="form-input"
          placeholder="Account-manager observations, follow-ups, onboarding context…">${esc(LAST.profile.restaurant_notes || '')}</textarea>
        <div class="flex items-center gap-3 mt-2">
          <button id="rstats-notes-save" class="btn-yellow btn-sm">Save notes</button>
          <span id="rstats-notes-status" class="text-xs text-gray-400"></span>
        </div>
      </section>
    `;

    document.getElementById('rstats-export')?.addEventListener('click', exportCSV);
    document.getElementById('rstats-notes-save')?.addEventListener('click', saveNotes);
  }

  async function saveNotes() {
    if (!LAST) return;
    const c = window.YYP?.client;
    const ta = document.getElementById('rstats-notes');
    const status = document.getElementById('rstats-notes-status');
    if (!c || !ta) return;
    const value = (ta.value || '').trim() || null;
    status.textContent = 'Saving…';
    const { error } = await c.from('restaurants')
      .update({ restaurant_notes: value })
      .eq('id', LAST.id);
    if (error) { status.textContent = 'Save failed: ' + error.message; return; }
    LAST.profile.restaurant_notes = value;
    status.textContent = 'Saved ✓';
    setTimeout(() => { if (status) status.textContent = ''; }, 1800);
  }


  /* ── Excel export ────────────────────────────────────────────
     Builds a CSV (Excel opens it natively) organized into labelled
     sections so a restaurant can read the real business impact of
     their YUMYUMPO listing: how many diners found them, engaged,
     and sent order requests. */
  function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csvRow(cells) { return cells.map(csvCell).join(','); }

  function exportCSV() {
    if (!LAST) return;
    const { data, name, profile, menu } = LAST;
    const o = data.orders || {}, e = data.engagement || {},
          t = data.traffic || {}, b = data.buzz || {}, ct = data.content || {};
    const recent = data.recent_orders || [];
    const L = [];

    L.push(csvRow(['YUMYUMPO — Restaurant Export']));
    L.push(csvRow(['Restaurant', name]));
    L.push(csvRow(['Generated', new Date().toLocaleString()]));
    L.push('');

    /* ── Profile ───────────────────────────────────────────── */
    L.push(csvRow(['PROFILE']));
    L.push(csvRow(['Field', 'Value']));
    L.push(csvRow(['Slug',              profile.slug || '']));
    L.push(csvRow(['Cuisine',           profile.cuisine_type || '']));
    L.push(csvRow(['Location',          profile.location || '']));
    L.push(csvRow(['Address',           profile.address || '']));
    L.push(csvRow(['Phone',             profile.phone || '']));
    L.push(csvRow(['Website',           profile.website_url || '']));
    L.push(csvRow(['Instagram',         profile.instagram_url || '']));
    L.push(csvRow(['Facebook',          profile.facebook_url || '']));
    L.push(csvRow(['Messenger',         profile.messenger_url || '']));
    L.push(csvRow(['WhatsApp',          profile.whatsapp_url || '']));
    L.push(csvRow(['Owner email',       profile.owner_email || '']));
    L.push(csvRow(['Owner linked',      profile.owner_user_id ? 'yes' : 'no']));
    L.push(csvRow(['Active',            profile.is_active   ? 'yes' : 'no']));
    L.push(csvRow(['Demo',              profile.is_demo     ? 'yes' : 'no']));
    L.push(csvRow(['YUMYUMPO site',     profile.has_yumyumpo_site ? 'yes' : 'no']));
    L.push(csvRow(['Accepting orders',  profile.accepting_orders  ? 'yes' : 'no']));
    L.push(csvRow(['Google rating',     profile.google_rating ?? '']));
    L.push(csvRow(['Google review #',   profile.review_count ?? '']));
    L.push(csvRow(['Listed since',      profile.created_at ? new Date(profile.created_at).toLocaleString() : '']));
    L.push('');

    /* ── Menu ──────────────────────────────────────────────── */
    L.push(csvRow(['MENU']));
    L.push(csvRow(['Category', 'Item', 'Description', 'Price', 'Price note', 'Tags', 'Available']));
    const cats = [...menu].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    let itemCount = 0;
    cats.forEach(cat => {
      const items = [...(cat.menu_items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      if (!items.length) {
        L.push(csvRow([cat.name || '', '', '', '', '', '', '']));
        return;
      }
      items.forEach(it => {
        L.push(csvRow([
          cat.name || '',
          it.name || '',
          it.description || '',
          it.price || '',
          it.price_note || '',
          Array.isArray(it.tags) ? it.tags.join('; ') : '',
          it.is_available === false ? 'no' : 'yes',
        ]));
        itemCount++;
      });
    });
    if (!cats.length) L.push(csvRow(['(no menu yet)']));
    L.push(csvRow(['Totals', cats.length + ' categories', itemCount + ' items']));
    L.push('');

    L.push(csvRow(['DISCOVERY & TRAFFIC', 'Last 30 days']));
    L.push(csvRow(['Metric', 'Value']));
    L.push(csvRow(['Profile views (30 days)',   t.profile_views_30d ?? 0]));
    L.push(csvRow(['Profile views (7 days)',    t.profile_views_7d ?? 0]));
    L.push(csvRow(['Discover card clicks',      t.card_clicks_30d ?? 0]));
    L.push(csvRow(['Menu views',                t.menu_views_30d ?? 0]));
    L.push(csvRow(['WhatsApp clicks',           t.whatsapp_30d ?? 0]));
    L.push(csvRow(['Instagram clicks',          t.instagram_30d ?? 0]));
    L.push(csvRow(['Messenger clicks',          t.messenger_30d ?? 0]));
    L.push(csvRow(['Website clicks',            t.website_30d ?? 0]));
    L.push(csvRow(['Total tracked events',      t.total_events_30d ?? 0]));
    L.push('');

    L.push(csvRow(['ORDER REQUESTS', 'All time']));
    L.push(csvRow(['Metric', 'Value']));
    L.push(csvRow(['Total order requests',      o.total ?? 0]));
    L.push(csvRow(['Open / awaiting response',  o.open ?? 0]));
    L.push(csvRow(['Accepted',                  o.accepted ?? 0]));
    L.push(csvRow(['Completed',                 o.completed ?? 0]));
    L.push(csvRow(['Paid',                      o.paid ?? 0]));
    L.push(csvRow(['Denied',                    o.denied ?? 0]));
    L.push(csvRow(['Accept rate (%)',           o.accept_pct ?? 0]));
    L.push(csvRow(['Avg response time (min)',   o.avg_response_min ?? 0]));
    L.push(csvRow(['Avg order value (PHP)',     o.avg_order_value ?? 0]));
    L.push(csvRow(['Revenue from paid (PHP)',   o.total_revenue ?? 0]));
    L.push(csvRow(['Order requests (last 7 days)',  o.orders_7d ?? 0]));
    L.push(csvRow(['Order requests (last 30 days)', o.orders_30d ?? 0]));
    L.push(csvRow(['Last request',              o.last_request_at ? new Date(o.last_request_at).toLocaleString() : 'never']));
    L.push('');

    L.push(csvRow(['DINER ENGAGEMENT', 'All time']));
    L.push(csvRow(['Metric', 'Value']));
    L.push(csvRow(['Followers',                 e.follows ?? 0]));
    L.push(csvRow(['Saved to a list',           e.saves ?? 0]));
    L.push(csvRow(['Logged-in profile visits',  e.history_views ?? 0]));
    L.push(csvRow(['Reaction: Love',            e.reactions_love ?? 0]));
    L.push(csvRow(['Reaction: Want to go',      e.reactions_want ?? 0]));
    L.push(csvRow(['Reaction: Been there',      e.reactions_been ?? 0]));
    L.push(csvRow(['Buzz score',                Math.round(b.score || 0)]));
    L.push(csvRow(['Buzz tier',                 b.tier || 'none']));
    L.push('');

    L.push(csvRow(['CONTENT']));
    L.push(csvRow(['Metric', 'Value']));
    L.push(csvRow(['Live announcements',        ct.announcements_published ?? 0]));
    L.push(csvRow(['Pending announcements',     ct.announcements_pending ?? 0]));
    L.push(csvRow(['Total announcements',       ct.announcements_total ?? 0]));
    L.push('');

    L.push(csvRow(['RECENT ORDER REQUESTS']));
    L.push(csvRow(['Date', 'Customer', 'Status', 'Quoted total (PHP)']));
    recent.forEach(r => L.push(csvRow([
      new Date(r.created_at).toLocaleString(),
      r.customer_name || 'Customer',
      r.status,
      r.quoted_total ?? '',
    ])));
    L.push('');

    /* ── Restaurant Notes (admin-internal) ─────────────────── */
    L.push(csvRow(['RESTAURANT NOTES']));
    L.push(csvRow([profile.restaurant_notes || '(none)']));

    /* BOM so Excel reads UTF-8 (₱, accents) correctly. */
    const blob = new Blob(['﻿' + L.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safe = String(name).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.href = url;
    a.download = `yumyumpo-restaurant-${safe}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
