/* ============================================================
   YUMYUMPO — Order Request (customer side)
   Lives on /restaurant?slug=... when the restaurant is Premium
   (has_yumyumpo_site = true) AND accepting_orders = true.
   Renders the "Request order" CTA + a modal form. Submits to the
   submit_order_request RPC. Auth-gated.
   ============================================================ */

'use strict';

const ALLERGEN_PRESETS = ['Peanuts','Tree Nuts','Shellfish','Fish','Gluten','Dairy','Eggs','Soy','Sesame'];

document.addEventListener('yyp:restaurant-loaded', (e) => {
  const r = e.detail;
  if (!r) return;
  if (!r.has_yumyumpo_site) return;          // Premium-only feature
  injectOrderUi(r);
});


function injectOrderUi(r) {
  if (document.querySelector('.yyp-order-cta')) return;
  injectStyles();

  const accepting = r.accepting_orders !== false;
  const html = accepting
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        Request an order`
    : `🌙 Not accepting orders right now`;

  const targets = [
    document.getElementById('action-buttons'),
    document.getElementById('r-hero-content'),
  ].filter(Boolean);

  /* Build a fresh button per target so each carries its own listener —
     cloneNode would have stripped them. */
  targets.forEach(parent => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'yyp-order-cta';
    btn.innerHTML = html;
    btn.disabled = !accepting;
    if (accepting) btn.addEventListener('click', () => openOrderModal(r));
    parent.appendChild(btn);
  });
}


function openOrderModal(r) {
  /* Auth gate — must be signed in. */
  const c = window.YYP?.client;
  if (!c) return alert('Loading… try again in a moment.');
  c.auth.getUser().then(({ data }) => {
    if (!data?.user) {
      if (typeof window.YYP?.openAuthModal === 'function') {
        window.YYP.openAuthModal({ intent: 'Sign in to place an order request' });
      } else {
        location.href = '/admin/login.html';
      }
      return;
    }
    renderModal(r, data.user);
  });
}


function renderModal(r, user) {
  document.getElementById('yyp-order-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'yyp-order-modal';
  overlay.className = 'yyp-order-modal';
  overlay.innerHTML = `
    <div class="yyp-order-box">
      <div class="yyp-order-head">
        <div>
          <h2>Request an order</h2>
          <p>from <strong>${escapeHtml(r.name)}</strong></p>
        </div>
        <button type="button" class="yyp-order-close" aria-label="Close">×</button>
      </div>

      <form id="yyp-order-form" class="yyp-order-body">
        <!-- Items picker -->
        <div class="yyp-order-section">
          <label class="yyp-order-label">What are you ordering?</label>
          <div id="yyp-order-items" class="yyp-order-items"></div>
          <button type="button" id="yyp-order-add-custom" class="yyp-order-link">+ Add custom item</button>
        </div>

        <!-- Method -->
        <div class="yyp-order-section">
          <label class="yyp-order-label">How are you getting it?</label>
          <div class="yyp-order-radiogroup">
            ${['pickup','delivery','dinein'].map((m, i) => `
              <label class="yyp-order-radio">
                <input type="radio" name="delivery_method" value="${m}" ${i===0?'checked':''} />
                <span>${m === 'dinein' ? '🍽 Dine-in' : m === 'delivery' ? '🛵 Delivery' : '🥡 Pickup'}</span>
              </label>`).join('')}
          </div>
        </div>

        <!-- Delivery address (only shown for delivery) -->
        <div class="yyp-order-section" id="yyp-order-address-wrap" style="display:none">
          <label class="yyp-order-label">Delivery address</label>
          <input type="text" name="delivery_address" class="yyp-order-input" placeholder="Street, landmark, city" />
        </div>

        <!-- Preferred time -->
        <div class="yyp-order-section">
          <label class="yyp-order-label">When would you like it?</label>
          <input type="text" name="preferred_time" class="yyp-order-input" placeholder="ASAP / today 7pm / tomorrow 1pm" />
        </div>

        <!-- Contact -->
        <div class="yyp-order-section yyp-order-row">
          <div>
            <label class="yyp-order-label">Your name</label>
            <input type="text" name="customer_name" class="yyp-order-input" value="${escapeAttr(user.user_metadata?.full_name || user.user_metadata?.name || '')}" required />
          </div>
          <div>
            <label class="yyp-order-label">Phone</label>
            <input type="tel" name="customer_phone" class="yyp-order-input" placeholder="+63 9XX XXX XXXX" />
          </div>
        </div>
        <input type="hidden" name="customer_email" value="${escapeAttr(user.email || '')}" />

        <!-- Allergens -->
        <div class="yyp-order-section">
          <label class="yyp-order-label">Any allergies the kitchen should know about?</label>
          <div class="yyp-order-chips" id="yyp-order-allergens">
            ${ALLERGEN_PRESETS.map(a => `<label class="yyp-order-chip"><input type="checkbox" value="${escapeAttr(a)}" /><span>${a}</span></label>`).join('')}
          </div>
        </div>

        <!-- Notes -->
        <div class="yyp-order-section">
          <label class="yyp-order-label">Anything else? <span class="yyp-order-hint">(no onions, extra spicy, etc.)</span></label>
          <textarea name="notes" class="yyp-order-input" rows="2" maxlength="400"></textarea>
        </div>

        <!-- Submit -->
        <div class="yyp-order-foot">
          <p class="yyp-order-disclaimer">This is a <strong>request</strong>. The restaurant will quote a final price and confirm before you pay.</p>
          <button type="submit" class="yyp-order-submit">Send order request</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-on'));

  /* Wire close handlers */
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.yyp-order-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', escClose);

  function closeModal() {
    overlay.classList.remove('is-on');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }

  /* Populate items from the loaded menu */
  const menuItems = [];
  (r.menu_categories || []).forEach(cat => {
    (cat.items || []).forEach(it => menuItems.push({ ...it, category: cat.name }));
  });
  const itemsWrap = overlay.querySelector('#yyp-order-items');
  if (menuItems.length === 0) {
    itemsWrap.innerHTML = '<p class="yyp-order-empty">No menu items listed yet. Use "+ Add custom item" below.</p>';
  } else {
    itemsWrap.innerHTML = menuItems.map((it, i) => `
      <div class="yyp-order-item" data-i="${i}">
        <div class="yyp-order-item-row">
          <div class="yyp-order-item-info">
            <div class="yyp-order-item-name">${escapeHtml(it.name)}</div>
            <div class="yyp-order-item-meta">${it.category ? escapeHtml(it.category) + ' · ' : ''}${escapeHtml(it.price || '')}</div>
          </div>
          <button type="button" class="yyp-order-details-toggle" aria-expanded="false">+ Details</button>
          <div class="yyp-order-qty">
            <button type="button" class="yyp-order-qty-btn" data-delta="-1">−</button>
            <input type="number" class="yyp-order-qty-input" value="0" min="0" max="20" />
            <button type="button" class="yyp-order-qty-btn" data-delta="1">+</button>
          </div>
        </div>
        ${itemDetailsHTML()}
      </div>`).join('');

    itemsWrap.addEventListener('click', e => {
      const toggle = e.target.closest('.yyp-order-details-toggle');
      if (toggle) {
        const row = toggle.closest('.yyp-order-item');
        const panel = row?.querySelector('.yyp-order-item-details');
        if (!panel) return;
        const opening = panel.hasAttribute('hidden');
        if (opening) {
          panel.removeAttribute('hidden');
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = '− Hide details';
        } else {
          panel.setAttribute('hidden', '');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = filledCount(row) > 0 ? '✎ Edit details' : '+ Details';
        }
        return;
      }
      const btn = e.target.closest('.yyp-order-qty-btn');
      if (!btn) return;
      const row = btn.closest('.yyp-order-item');
      const input = row.querySelector('.yyp-order-qty-input');
      const delta = parseInt(btn.dataset.delta, 10);
      input.value = Math.max(0, Math.min(20, (parseInt(input.value, 10) || 0) + delta));
    });

    /* Reflect "filled" state on the toggle so the customer sees which
       items already carry per-item details after they collapse it. */
    itemsWrap.addEventListener('input', e => {
      const detail = e.target.closest('.yyp-order-detail');
      if (!detail) return;
      const row = detail.closest('.yyp-order-item');
      const toggle = row.querySelector('.yyp-order-details-toggle');
      if (!toggle) return;
      toggle.classList.toggle('is-filled', filledCount(row) > 0);
    });
  }

  /* Custom item adder */
  overlay.querySelector('#yyp-order-add-custom').addEventListener('click', () => {
    const wrap = document.createElement('div');
    wrap.className = 'yyp-order-item yyp-order-item-custom';
    wrap.innerHTML = `
      <div class="yyp-order-item-row">
        <input type="text" class="yyp-order-custom-name" placeholder="Item name (e.g. 'Whatever you recommend')" />
        <div class="yyp-order-qty">
          <button type="button" class="yyp-order-qty-btn" data-delta="-1">−</button>
          <input type="number" class="yyp-order-qty-input" value="1" min="0" max="20" />
          <button type="button" class="yyp-order-qty-btn" data-delta="1">+</button>
        </div>
      </div>`;
    itemsWrap.appendChild(wrap);
    wrap.querySelectorAll('.yyp-order-qty-btn').forEach(b => b.addEventListener('click', () => {
      const input = wrap.querySelector('.yyp-order-qty-input');
      input.value = Math.max(0, Math.min(20, (parseInt(input.value, 10) || 0) + parseInt(b.dataset.delta, 10)));
    }));
  });

  /* Delivery method toggle for address visibility */
  overlay.querySelectorAll('input[name="delivery_method"]').forEach(input => {
    input.addEventListener('change', () => {
      overlay.querySelector('#yyp-order-address-wrap').style.display = input.value === 'delivery' && input.checked ? '' : 'none';
    });
  });

  /* Submit */
  overlay.querySelector('#yyp-order-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const fd = Object.fromEntries(new FormData(form));
    const items = collectItems(itemsWrap, menuItems);
    if (items.length === 0) return toast('Pick at least one item or add a custom item.');

    const allergens = [...overlay.querySelectorAll('#yyp-order-allergens input:checked')].map(i => i.value);

    const payload = {
      restaurant_id:    r.id,
      customer_name:    (fd.customer_name || '').trim(),
      customer_phone:   fd.customer_phone || '',
      customer_email:   fd.customer_email || '',
      delivery_method:  fd.delivery_method || 'pickup',
      delivery_address: fd.delivery_address || '',
      preferred_time:   fd.preferred_time || '',
      allergens, notes: fd.notes || '',
      items,
    };

    const btn = form.querySelector('.yyp-order-submit');
    btn.disabled = true; btn.textContent = 'Sending…';
    const { data, error } = await window.YYP.client.rpc('submit_order_request', { payload });
    btn.disabled = false; btn.textContent = 'Send order request';
    if (error) return toast('Could not submit: ' + error.message);

    const row = Array.isArray(data) ? data[0] : data;
    closeModal();
    showSuccess(row?.tracking_token, r.name);
  });
}


function collectItems(wrap, menuItems) {
  const out = [];
  wrap.querySelectorAll('.yyp-order-item').forEach(row => {
    const qty = parseInt(row.querySelector('.yyp-order-qty-input').value, 10) || 0;
    if (qty <= 0) return;
    const idx = row.dataset.i;
    const extras = collectItemDetails(row);
    if (idx != null) {
      const it = menuItems[+idx];
      out.push({ name: it.name, price: it.price || null, qty, ...extras });
    } else {
      const name = row.querySelector('.yyp-order-custom-name')?.value?.trim();
      if (name) out.push({ name, price: null, qty, ...extras });
    }
  });
  return out;
}

/* Per-item details (assign-to / notes / allergies) — same input
   styling as the order-wide fields for visual consistency. */
function itemDetailsHTML() {
  return `
    <div class="yyp-order-item-details" hidden>
      <label class="yyp-order-label">Assign this item to <span class="yyp-order-hint">(optional)</span></label>
      <input type="text" class="yyp-order-input yyp-order-detail" data-detail="assign_to" placeholder="e.g. Sarah" maxlength="60" />
      <label class="yyp-order-label" style="margin-top:10px">Special notes <span class="yyp-order-hint">(extra spicy, no onions…)</span></label>
      <textarea class="yyp-order-input yyp-order-detail" data-detail="notes" rows="2" maxlength="300" placeholder="Anything the kitchen should know?"></textarea>
      <label class="yyp-order-label" style="margin-top:10px">Allergies for this item</label>
      <input type="text" class="yyp-order-input yyp-order-detail" data-detail="allergies" placeholder="e.g. peanuts, shellfish" maxlength="200" />
    </div>`;
}

function collectItemDetails(row) {
  const extras = {};
  row.querySelectorAll('.yyp-order-detail').forEach(el => {
    const v = (el.value || '').trim();
    if (v) extras[el.dataset.detail] = v;
  });
  return extras;
}

function filledCount(row) {
  return [...row.querySelectorAll('.yyp-order-detail')]
    .filter(el => (el.value || '').trim()).length;
}


function showSuccess(token, name) {
  const ok = document.createElement('div');
  ok.className = 'yyp-order-modal is-on';
  ok.innerHTML = `
    <div class="yyp-order-box">
      <div class="yyp-order-success">
        <div class="yyp-order-success-icon">✓</div>
        <h2>Request sent!</h2>
        <p><strong>${escapeHtml(name)}</strong> has been notified. You'll get an update once they review your order.</p>
        <div class="yyp-order-success-actions">
          <a class="yyp-order-submit" href="order.html?token=${encodeURIComponent(token || '')}">Track this order</a>
          <a class="yyp-order-link" href="account/index.html">See all my orders →</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(ok);
  ok.addEventListener('click', e => { if (e.target === ok) ok.remove(); });
}


function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }
function toast(msg) {
  let t = document.querySelector('.yyp-order-toast');
  if (!t) { t = document.createElement('div'); t.className = 'yyp-order-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('is-on'), 3500);
}


function injectStyles() {
  if (document.getElementById('yyp-order-styles')) return;
  const css = document.createElement('style');
  css.id = 'yyp-order-styles';
  css.textContent = `
    .yyp-order-cta {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 14px 22px; border-radius: 14px;
      background: #FFD000; color: #111;
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-weight: 800; font-size: 0.95rem;
      border: none; cursor: pointer;
      box-shadow: 0 8px 20px -6px rgba(255,208,0,0.55);
      transition: all 0.15s;
      margin-top: 14px;
    }
    .yyp-order-cta:hover:not(:disabled) { background: #E6BB00; transform: translateY(-2px); }
    .yyp-order-cta:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

    .yyp-order-modal {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(17,17,17,0.72); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      opacity: 0; pointer-events: none;
      transition: opacity 0.2s;
    }
    .yyp-order-modal.is-on { opacity: 1; pointer-events: auto; }
    .yyp-order-box {
      background: #fff; border-radius: 20px;
      width: 100%; max-width: 560px;
      max-height: 92vh; overflow-y: auto;
      box-shadow: 0 24px 60px rgba(0,0,0,0.45);
    }
    .yyp-order-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 22px 8px;
      border-bottom: 1.5px solid #F3F3F3;
    }
    .yyp-order-head h2 {
      font-family: 'Space Grotesk', sans-serif; font-weight: 900;
      font-size: 1.25rem; color: #111; letter-spacing: -0.02em;
    }
    .yyp-order-head p { font-size: 0.85rem; color: #6B6B6B; margin-top: 2px; }
    .yyp-order-close {
      background: #F3F3F3; border: none; cursor: pointer;
      width: 32px; height: 32px; border-radius: 50%;
      font-size: 1.4rem; line-height: 1; color: #111;
    }
    .yyp-order-close:hover { background: #E8E8E8; }

    .yyp-order-body { padding: 14px 22px 22px; }
    .yyp-order-section { margin-top: 14px; }
    .yyp-order-section.yyp-order-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .yyp-order-label {
      display: block; font-size: 0.78rem; font-weight: 800; color: #111;
      margin-bottom: 6px; letter-spacing: 0.01em;
    }
    .yyp-order-hint { font-weight: 500; color: #ABABAB; }
    .yyp-order-input {
      width: 100%; padding: 10px 12px;
      border: 1.5px solid #E8E8E8; border-radius: 10px;
      font-size: 0.9rem; background: #FAFAFA; color: #111;
      font-family: inherit;
    }
    .yyp-order-input:focus { outline: none; border-color: #FFD000; background: #fff; box-shadow: 0 0 0 4px rgba(255,208,0,0.18); }
    .yyp-order-link { background: none; border: none; cursor: pointer; color: #B58900; font-weight: 700; font-size: 0.8rem; padding: 0; margin-top: 6px; text-decoration: underline; }
    .yyp-order-empty { font-size: 0.82rem; color: #6B6B6B; font-style: italic; padding: 8px 0; }

    .yyp-order-items { display: flex; flex-direction: column; gap: 6px; }
    .yyp-order-item {
      display: flex; flex-direction: column; gap: 0;
      padding: 8px 10px; border: 1px solid #F3F3F3; border-radius: 10px;
    }
    .yyp-order-item-row { display: flex; align-items: center; gap: 10px; }
    .yyp-order-details-toggle {
      background: #fff; color: #B58900;
      border: 1.5px solid #FFD000; border-radius: 999px;
      font-weight: 800; font-size: 0.7rem; letter-spacing: 0.02em;
      padding: 4px 10px; cursor: pointer; white-space: nowrap;
      transition: background 0.12s, color 0.12s;
    }
    .yyp-order-details-toggle:hover { background: #FFFDF2; }
    .yyp-order-details-toggle.is-filled {
      background: #FFD000; color: #111; border-color: #FFD000;
    }
    .yyp-order-item-details {
      margin-top: 10px; padding-top: 10px;
      border-top: 1px dashed #F3F3F3;
    }
    .yyp-order-item-details[hidden] { display: none; }
    .yyp-order-item-info { flex: 1; min-width: 0; }
    .yyp-order-item-name { font-weight: 700; font-size: 0.88rem; color: #111; }
    .yyp-order-item-meta { font-size: 0.72rem; color: #6B6B6B; }
    .yyp-order-item-custom .yyp-order-custom-name {
      flex: 1; padding: 8px 10px;
      border: 1.5px solid #E8E8E8; border-radius: 8px; font-size: 0.85rem;
    }
    .yyp-order-qty { display: flex; align-items: center; gap: 4px; }
    .yyp-order-qty-btn {
      width: 26px; height: 26px; border: 1.5px solid #E8E8E8; background: #fff;
      border-radius: 8px; cursor: pointer; font-weight: 700; line-height: 1;
    }
    .yyp-order-qty-btn:hover { background: #FFFDF2; border-color: #FFD000; }
    .yyp-order-qty-input {
      width: 38px; text-align: center;
      border: 1.5px solid #E8E8E8; border-radius: 8px;
      font-size: 0.85rem; padding: 4px;
    }

    .yyp-order-radiogroup { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .yyp-order-radio {
      padding: 9px 8px; border: 1.5px solid #E8E8E8; border-radius: 10px;
      background: #fff; cursor: pointer; text-align: center;
      font-size: 0.82rem; font-weight: 700; color: #6B6B6B;
      display: flex; align-items: center; justify-content: center; gap: 4px;
    }
    .yyp-order-radio input { display: none; }
    .yyp-order-radio:hover { border-color: #FFD000; color: #111; }
    .yyp-order-radio:has(input:checked) { background: #FFD000; border-color: #FFD000; color: #111; }

    .yyp-order-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .yyp-order-chip {
      padding: 6px 12px; border: 1.5px solid #E8E8E8; border-radius: 999px;
      cursor: pointer; font-size: 0.78rem; font-weight: 700; color: #6B6B6B; background: #fff;
    }
    .yyp-order-chip input { display: none; }
    .yyp-order-chip:hover { border-color: #FFD000; color: #111; }
    .yyp-order-chip:has(input:checked) { background: #FEE2E2; border-color: #FCA5A5; color: #B91C1C; }

    .yyp-order-foot { margin-top: 18px; }
    .yyp-order-disclaimer { font-size: 0.74rem; color: #6B6B6B; margin-bottom: 10px; padding: 10px 12px; background: #FFFDF2; border: 1px solid rgba(255,208,0,0.4); border-radius: 10px; }
    .yyp-order-submit {
      display: inline-flex; align-items: center; justify-content: center;
      width: 100%; padding: 13px; border: none; border-radius: 12px;
      background: #111; color: #FFD000; font-weight: 800; font-size: 0.95rem;
      cursor: pointer; text-decoration: none;
      transition: all 0.15s;
    }
    .yyp-order-submit:hover:not(:disabled) { background: #000; }
    .yyp-order-submit:disabled { opacity: 0.7; cursor: wait; }

    .yyp-order-success {
      padding: 30px 24px 24px; text-align: center;
    }
    .yyp-order-success-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: #16A34A; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.8rem; font-weight: 900; margin: 0 auto 14px;
      box-shadow: 0 8px 20px rgba(22,163,74,0.4);
    }
    .yyp-order-success h2 { font-family: 'Space Grotesk', sans-serif; font-weight: 900; font-size: 1.4rem; color: #111; margin-bottom: 8px; }
    .yyp-order-success p { font-size: 0.9rem; color: #6B6B6B; }
    .yyp-order-success-actions { margin-top: 18px; display: flex; flex-direction: column; gap: 8px; align-items: center; }

    .yyp-order-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #DC2626; color: #fff;
      padding: 12px 20px; border-radius: 12px;
      font-size: 0.85rem; font-weight: 700;
      z-index: 10000; opacity: 0; transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(220,38,38,0.45);
    }
    .yyp-order-toast.is-on { opacity: 1; transform: translateX(-50%) translateY(0); }
  `;
  document.head.appendChild(css);
}
