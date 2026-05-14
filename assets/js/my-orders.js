/* ============================================================
   YUMYUMPO — Customer "My Orders" page (/account/orders.html)
   Lists every order the signed-in customer has placed.
   Each row links to the tracker page + re-order shortcut +
   favorite (❤️) tied to existing venue_reactions table.
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  if (window.YYP?.ready) init();
  else document.addEventListener('yyp:ready', init, { once: true });
});


async function init() {
  const c = window.YYP?.client;
  if (!c) return showGate();
  const { data: { user } } = await c.auth.getUser();
  if (!user) return showGate();
  document.getElementById('main').style.display = 'block';

  const { data, error } = await c
    .from('order_requests')
    .select(`*, restaurants ( name, slug, cover_image_url )`)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const wrap = document.getElementById('orders-wrap');
  if (error) { wrap.innerHTML = `<p class="text-sm text-red-600">Could not load: ${escapeHtml(error.message)}</p>`; return; }
  if (!data || data.length === 0) {
    wrap.innerHTML = `
      <div class="order-card text-center" style="padding:40px 20px">
        <div style="font-size:2.5rem;margin-bottom:8px">🍽️</div>
        <p class="font-bold text-brand-black mb-1">No order requests yet</p>
        <p class="text-sm text-gray-500 mb-4">Find a Premium restaurant and tap "Request an order".</p>
        <a href="../discover.html" class="btn-primary inline-flex">Browse restaurants</a>
      </div>`;
    return;
  }

  /* Pull favorites for the restaurants we've ordered from. */
  const restIds = [...new Set(data.map(o => o.restaurant_id))];
  const favSet = await loadFavorites(c, restIds);

  wrap.innerHTML = data.map(o => orderCardHTML(o, favSet)).join('');

  wrap.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const slug = btn.dataset.fav;
      const filled = btn.dataset.state === 'on';
      btn.dataset.state = filled ? 'off' : 'on';
      btn.innerHTML = btn.dataset.state === 'on' ? '❤️ Favorited' : '🤍 Favorite';
      try {
        await c.rpc('set_reaction', { p_slug: slug, p_reaction: 'love' });
      } catch (err) { console.warn(err); }
    });
  });

  wrap.querySelectorAll('[data-reorder]').forEach(btn => {
    btn.addEventListener('click', () => {
      /* Reorder = jump back to the restaurant page; the order modal
         supports pre-filled items via querystring later (Phase 2). */
      const slug = btn.dataset.reorder;
      location.href = `../restaurant.html?slug=${encodeURIComponent(slug)}&reorder=1`;
    });
  });
}


async function loadFavorites(c, restIds) {
  if (!restIds.length) return new Set();
  const { data } = await c.from('venue_reactions')
    .select('restaurant_id, reaction')
    .in('restaurant_id', restIds)
    .eq('reaction', 'love');
  return new Set((data || []).map(r => r.restaurant_id));
}


function orderCardHTML(o, favSet) {
  const r = o.restaurants || {};
  const items = Array.isArray(o.items) ? o.items : [];
  const summary = items.slice(0, 3).map(it => `${it.qty || 1}× ${escapeHtml(it.name)}`).join(', ')
                + (items.length > 3 ? `, +${items.length - 3} more` : '');
  const when = new Date(o.created_at).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  const isFav = favSet.has(o.restaurant_id);

  return `
    <div class="order-card">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <img src="${escapeAttr(r.cover_image_url || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&auto=format&fit=crop&q=70')}"
             style="width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0" alt="" />
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
            <a href="../restaurant.html?slug=${encodeURIComponent(r.slug || '')}" class="font-display font-black text-base text-brand-black hover:underline">${escapeHtml(r.name || 'Restaurant')}</a>
            <span class="ord-pill ${o.status}">${o.status}</span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5">${when}</p>
          <p class="text-sm text-gray-700 mt-1">${summary || '<em>No items</em>'}</p>
          ${o.quoted_total != null ? `<p class="text-sm font-bold mt-1">Total: ₱${Number(o.quoted_total).toLocaleString()}</p>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;border-top:1px dashed #F3F3F3;padding-top:10px">
        <a href="../order.html?token=${encodeURIComponent(o.tracking_token)}" class="text-xs font-bold text-brand-black bg-yellow-light px-3 py-1.5 rounded-lg hover:bg-brand-yellow">Track →</a>
        <button data-reorder="${escapeAttr(r.slug || '')}" class="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">↻ Re-order</button>
        <button data-fav="${escapeAttr(r.slug || '')}" data-state="${isFav ? 'on' : 'off'}" class="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 ml-auto">${isFav ? '❤️ Favorited' : '🤍 Favorite'}</button>
      </div>
    </div>`;
}


function showGate() { document.getElementById('auth-gate').style.display = 'block'; }
function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }
