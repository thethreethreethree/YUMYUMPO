/* ============================================================
   YUMYUMPO — Admin Announcements Module
   Loaded by admin/index.html. Lets admins post + manage
   venue_announcements that show up in users' Following feed.
   ============================================================ */

'use strict';

(function () {

  function init() {
    if (window.YYP?.ready) bootstrap();
    else document.addEventListener('yyp:ready', bootstrap, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();


  function bootstrap() {
    populateRestaurantSelect();
    loadAnnouncements();
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  async function populateRestaurantSelect() {
    const client = window.YYP?.client;
    if (!client) return;
    const { data } = await client.from('restaurants')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');

    const select = document.getElementById('ann-restaurant');
    if (!select || !data) return;
    select.innerHTML = '<option value="">Select a restaurant…</option>'
      + data.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
  }


  window.submitAnnouncement = async function (e) {
    e.preventDefault();
    const client = window.YYP?.client;
    if (!client) return;

    const msg = document.getElementById('ann-msg');
    const btn = document.getElementById('ann-submit');
    msg.classList.add('hidden');
    btn.disabled = true; btn.textContent = 'Posting…';

    const restaurant_id = document.getElementById('ann-restaurant').value;
    const type          = document.getElementById('ann-type').value;
    const title         = document.getElementById('ann-title').value.trim();
    const body          = document.getElementById('ann-body').value.trim() || null;
    const startsRaw     = document.getElementById('ann-starts').value;
    const endsRaw       = document.getElementById('ann-ends').value;
    const link_url      = document.getElementById('ann-link').value.trim() || null;

    const { data: { session } } = await client.auth.getSession();

    const payload = {
      restaurant_id, title, body, type, link_url,
      starts_at: startsRaw ? new Date(startsRaw).toISOString() : null,
      ends_at:   endsRaw   ? new Date(endsRaw).toISOString()   : null,
      is_published: true,
      posted_by: session?.user?.id || null,
    };

    const { error } = await client.from('venue_announcements').insert([payload]);
    btn.disabled = false; btn.textContent = 'Post announcement';

    if (error) {
      msg.className = 'text-sm font-semibold text-red-600';
      msg.textContent = 'Error: ' + error.message;
      msg.classList.remove('hidden');
      return;
    }

    msg.className = 'text-sm font-semibold text-green-600';
    msg.textContent = '✓ Posted to followers';
    msg.classList.remove('hidden');
    document.getElementById('ann-form').reset();
    loadAnnouncements();
    setTimeout(() => msg.classList.add('hidden'), 3500);
  };


  window.loadAnnouncements = async function () {
    const client = window.YYP?.client;
    if (!client) return;

    const { data, error } = await client
      .from('venue_announcements')
      .select('id, title, body, type, status, payment_status, price_php, admin_notes, starts_at, ends_at, is_published, created_at, restaurants(name, slug)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.warn('[admin-announcements]', error.message); return; }

    const list  = document.getElementById('ann-list');
    const empty = document.getElementById('ann-empty');
    if (!list) return;

    if (!data?.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    /* Sort: pending requests first (need attention), then awaiting-payment,
       then everything else by created_at. */
    const priority = a => {
      if (a.status === 'pending') return 0;
      if (a.status === 'approved' && a.payment_status === 'unpaid') return 1;
      return 2;
    };
    data.sort((a, b) => priority(a) - priority(b) || (b.created_at || '').localeCompare(a.created_at || ''));

    list.innerHTML = data.map(a => {
      const date = new Date(a.starts_at || a.created_at);
      const dateStr = date.toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });

      let pill, actions;
      if (a.status === 'pending') {
        pill = '<span class="app-status pending">PENDING REVIEW</span>';
        actions = `
          <button class="apps-filter-btn" style="background:#FFD000;border-color:#FFD000;color:#111;font-weight:800" data-review-approve="${esc(a.id)}">✓ Approve · ₱${a.price_php || 200}</button>
          <button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-review-reject="${esc(a.id)}">✕ Reject</button>`;
      } else if (a.status === 'approved' && a.payment_status === 'unpaid') {
        pill = `<span class="app-status reviewing">AWAITING PAYMENT · ₱${a.price_php}</span>`;
        actions = `
          <button class="apps-filter-btn" style="background:#FFD000;border-color:#FFD000;color:#111;font-weight:800" data-mark-paid="${esc(a.id)}">💰 Mark paid</button>
          <button class="apps-filter-btn" data-waive="${esc(a.id)}">Waive fee</button>
          <button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-delete="${esc(a.id)}">Delete</button>`;
      } else if (a.status === 'rejected') {
        pill = '<span class="app-status rejected">REJECTED</span>';
        actions = `<button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-delete="${esc(a.id)}">Delete</button>`;
      } else if (a.is_published) {
        pill = '<span class="app-status approved">LIVE</span>';
        actions = `<button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-delete="${esc(a.id)}">Delete</button>`;
      } else {
        pill = '<span class="app-status approved">APPROVED</span>';
        actions = `<button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-delete="${esc(a.id)}">Delete</button>`;
      }

      return `
        <div class="app-card" style="cursor:default">
          <div class="flex items-start justify-between gap-4 mb-1 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                ${pill}
                <span class="text-xs font-bold text-gray-500">${esc(a.type || 'announcement')}</span>
              </div>
              <h3 class="font-display font-black text-base text-brand-black">${esc(a.title)}</h3>
              <p class="text-sm text-gray-500 mt-1">${esc(a.restaurants?.name || '—')} · ${esc(dateStr)}</p>
              ${a.body ? `<p class="text-sm text-gray-600 mt-2 line-clamp-2">${esc(a.body)}</p>` : ''}
              ${a.admin_notes ? `<p class="text-xs text-gray-400 mt-2"><strong>Note:</strong> ${esc(a.admin_notes)}</p>` : ''}
            </div>
            <div class="flex flex-col gap-1 items-stretch shrink-0">${actions}</div>
          </div>
        </div>
      `;
    }).join('');

    /* Wire delete buttons (legacy + new). */
    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this announcement?')) return;
        await client.from('venue_announcements').delete().eq('id', btn.dataset.delete);
        loadAnnouncements();
      });
    });

    /* Approve pending owner request. Prompts for price + optional note. */
    list.querySelectorAll('[data-review-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reviewApprove;
        const priceStr = prompt('Price in PHP (blank = ₱200):', '200');
        if (priceStr === null) return;
        const price = parseInt(priceStr, 10) || 200;
        const note  = prompt('Optional note for the owner (blank = none):') || null;
        const { error } = await client.rpc('review_announcement', {
          p_id: id, p_decision: 'approved', p_notes: note, p_price_php: price,
        });
        if (error) return alert('Failed: ' + error.message);
        loadAnnouncements();
      });
    });

    /* Reject pending owner request — note required. */
    list.querySelectorAll('[data-review-reject]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reviewReject;
        const note = prompt('Why is this being rejected? (the owner will see this)');
        if (!note) return;
        const { error } = await client.rpc('review_announcement', {
          p_id: id, p_decision: 'rejected', p_notes: note, p_price_php: null,
        });
        if (error) return alert('Failed: ' + error.message);
        loadAnnouncements();
      });
    });

    /* Mark payment received (offline GCash/bank/manual). */
    list.querySelectorAll('[data-mark-paid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.markPaid;
        const method = prompt('Payment method (gcash/bank/manual):', 'gcash') || 'manual';
        const { error } = await client.rpc('record_announcement_payment', {
          p_id: id, p_status: 'paid', p_method: method,
        });
        if (error) return alert('Failed: ' + error.message);
        loadAnnouncements();
      });
    });

    /* Waive fee (free announcement — e.g. partnership, comp). */
    list.querySelectorAll('[data-waive]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.waive;
        if (!confirm('Waive the fee for this announcement?')) return;
        const { error } = await client.rpc('record_announcement_payment', {
          p_id: id, p_status: 'waived', p_method: 'waived',
        });
        if (error) return alert('Failed: ' + error.message);
        loadAnnouncements();
      });
    });
  };

})();
