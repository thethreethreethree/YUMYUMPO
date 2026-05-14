/* ============================================================
   YUMYUMPO — Order Tracker
   Customer-facing page at /order?token=<tracking_token>.
   Polls every 20s for status / quoted price / owner message.
   ============================================================ */

'use strict';

const STATUS_LABEL = {
  pending:      'Awaiting restaurant',
  acknowledged: 'Restaurant is reviewing',
  quoted:       'Quote ready',
  accepted:     'Order accepted',
  denied:       'Request declined',
  completed:    'Completed',
  paid:         'Paid',
};

const TIMELINE_ORDER = ['pending','acknowledged','quoted','accepted','paid'];


let ORDER = null;
let POLL_TIMER = null;


document.addEventListener('DOMContentLoaded', () => {
  if (window.YYP?.ready) init();
  else document.addEventListener('yyp:ready', init, { once: true });
});


async function init() {
  const token = new URLSearchParams(location.search).get('token');
  if (!token) {
    document.getElementById('ord-content').innerHTML =
      '<div class="ord-empty">No order token in the URL. Open this page from the link you got after placing your request.</div>';
    return;
  }
  await loadOrder(token);
  POLL_TIMER = setInterval(() => loadOrder(token), 20_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadOrder(token);
  });
}


async function loadOrder(token) {
  const c = window.YYP?.client;
  if (!c) return;
  /* Use the SECURITY DEFINER RPC so the link works for anyone with the
     token — signed in or not — without exposing the whole table. */
  const { data, error } = await c.rpc('get_order_by_token', { p_token: token });

  const wrap = document.getElementById('ord-content');
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    wrap.innerHTML = '<div class="ord-empty">Couldn\'t find this order. The link may be invalid.</div>';
    clearInterval(POLL_TIMER);
    return;
  }
  /* Re-shape the flat RPC row into the nested form render() expects. */
  ORDER = {
    ...row,
    restaurants: {
      name:             row.restaurant_name,
      slug:             row.restaurant_slug,
      cover_image_url:  row.restaurant_cover,
      whatsapp_url:     row.restaurant_whatsapp,
      phone:            row.restaurant_phone,
    },
  };
  render(ORDER);
}


function render(o) {
  const wrap = document.getElementById('ord-content');
  const r = o.restaurants || {};
  const statusLabel = STATUS_LABEL[o.status] || o.status;
  const items = Array.isArray(o.items) ? o.items : [];

  /* Timeline progress */
  const stepIdx = TIMELINE_ORDER.indexOf(o.status);
  const denied = o.status === 'denied';

  wrap.innerHTML = `
    <div class="ord-card">
      <div class="flex items-center justify-between mb-3 gap-3">
        <div>
          <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Restaurant</p>
          <a href="restaurant.html?slug=${encodeURIComponent(r.slug || '')}" class="font-display font-black text-lg text-brand-black hover:underline">${escapeHtml(r.name || 'Restaurant')}</a>
        </div>
        <span class="ord-status ${denied ? 'denied' : o.status}">${statusLabel}</span>
      </div>

      <!-- Timeline -->
      <div class="ord-timeline mt-4">
        ${TIMELINE_ORDER.map((step, i) => {
          if (denied && step !== 'pending') {
            const cls = step === 'pending' ? 'done' : 'pending-step';
            return `<div class="ord-step ${cls}"><span class="ord-step-dot"></span><span class="ord-step-text">${STATUS_LABEL[step]}</span></div>`;
          }
          const cls = i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'pending-step';
          const time = stepTimestamp(o, step);
          return `<div class="ord-step ${cls}">
            <span class="ord-step-dot"></span>
            <span class="ord-step-text">${STATUS_LABEL[step]}</span>
            ${time ? `<span class="ord-step-time">${time}</span>` : ''}
          </div>`;
        }).join('')}
        ${denied ? `<div class="ord-step current"><span class="ord-step-dot" style="background:#DC2626"></span><span class="ord-step-text" style="color:#B91C1C">Request declined</span></div>` : ''}
      </div>
    </div>

    <!-- Items -->
    <div class="ord-card">
      <h3 class="ord-section-title">Your order</h3>
      <div class="ord-items">
        ${items.map(it => `
          <div class="ord-item-row">
            <span><span class="ord-item-qty">${it.qty || 1}×</span> ${escapeHtml(it.name)}</span>
            <span>${it.price ? escapeHtml(it.price) : ''}</span>
          </div>`).join('')}
      </div>
      ${o.quoted_total != null
        ? `<div class="ord-total"><span>Total</span><span>₱${Number(o.quoted_total).toLocaleString()}</span></div>`
        : `<p class="text-xs text-gray-400 italic mt-3">Restaurant will quote a total when they review your request.</p>`}
    </div>

    <!-- Restaurant message -->
    ${o.owner_message ? `
      <div class="ord-card">
        <h3 class="ord-section-title">Message from the restaurant</h3>
        <div class="ord-msg">${escapeHtml(o.owner_message)}</div>
      </div>` : ''}

    <!-- Delivery details -->
    <div class="ord-card">
      <h3 class="ord-section-title">Pickup / delivery</h3>
      <p class="text-sm text-gray-600">
        <strong>${o.delivery_method === 'delivery' ? '🛵 Delivery' : o.delivery_method === 'dinein' ? '🍽 Dine-in' : '🥡 Pickup'}</strong>
        ${o.preferred_time ? ` · ${escapeHtml(o.preferred_time)}` : ''}
      </p>
      ${o.delivery_address ? `<p class="text-sm text-gray-600 mt-1">${escapeHtml(o.delivery_address)}</p>` : ''}
      ${(o.allergens && o.allergens.length) ? `<p class="text-xs text-red-600 font-bold mt-2">⚠️ Allergies: ${o.allergens.map(escapeHtml).join(', ')}</p>` : ''}
      ${o.notes ? `<p class="text-sm text-gray-500 italic mt-2">"${escapeHtml(o.notes)}"</p>` : ''}
    </div>

    <!-- Action -->
    ${actionFor(o, r)}
  `;

  /* Mark-as-paid goes through the narrow RPC so a customer can't mutate
     anything else (status / items / quoted_total). */
  document.getElementById('ord-mark-paid')?.addEventListener('click', async () => {
    if (!confirm('Confirm you\'ve paid the restaurant?')) return;
    const { error } = await window.YYP.client.rpc('mark_order_paid', { p_order_id: o.id });
    if (error) return alert('Could not mark paid: ' + error.message);
    loadOrder(new URLSearchParams(location.search).get('token'));
  });
}


function stepTimestamp(o, step) {
  const map = {
    pending:      o.created_at,
    acknowledged: o.acknowledged_at,
    quoted:       o.quoted_at,
    accepted:     o.accepted_at,
    paid:         o.paid_at,
  };
  const ts = map[step];
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
}


function actionFor(o, r) {
  if (o.status === 'accepted' || o.status === 'quoted') {
    return `
      <div class="ord-card">
        <h3 class="ord-section-title">Ready to pay the restaurant?</h3>
        <p class="text-sm text-gray-600 mb-3">YUMYUMPO doesn't handle payment — coordinate directly with the restaurant.</p>
        <div class="flex flex-wrap gap-2">
          ${r.whatsapp_url ? `<a class="ord-btn primary" target="_blank" rel="noopener noreferrer" href="${escapeAttr(r.whatsapp_url)}">💬 WhatsApp the restaurant</a>` : ''}
          ${r.phone ? `<a class="ord-btn" style="background:#F3F3F3;color:#111" href="tel:${escapeAttr(r.phone)}">📞 ${escapeHtml(r.phone)}</a>` : ''}
        </div>
        <button id="ord-mark-paid" class="ord-btn dark mt-3 w-full">I've paid — mark this complete</button>
      </div>`;
  }
  if (o.status === 'paid' || o.status === 'completed') {
    return `<div class="ord-card text-center"><div class="text-3xl mb-2">🎉</div><p class="font-bold text-brand-black">All done — enjoy!</p><p class="text-sm text-gray-500 mt-1">Save the restaurant in your favorites so you can re-order anytime.</p>
      <a href="restaurant.html?slug=${encodeURIComponent(r.slug)}" class="ord-btn primary mt-3 inline-flex">Back to ${escapeHtml(r.name)}</a></div>`;
  }
  return '';
}


function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }
