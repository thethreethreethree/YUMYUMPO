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
      .select('id, title, body, type, status, payment_status, price_php, admin_notes, starts_at, ends_at, is_published, created_at, image_url, link_url, restaurants(name, slug)')
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
          <button class="apps-filter-btn" style="background:#FFD000;border-color:#FFD000;color:#111;font-weight:800" data-review-approve="${esc(a.id)}">✓ Approve</button>
          <button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-review-reject="${esc(a.id)}">✕ Reject</button>`;
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

      const runWhen = a.starts_at
        ? new Date(a.starts_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })
        : null;
      return `
        <div class="app-card" style="cursor:default">
          <div class="flex items-start justify-between gap-4 mb-1 flex-wrap">
            <div class="flex items-start gap-3 flex-1 min-w-0">
              ${a.image_url
                ? `<img src="${esc(a.image_url)}" alt="" style="width:96px;height:96px;border-radius:12px;object-fit:cover;flex-shrink:0;cursor:pointer" onclick="window.open('${esc(a.image_url)}','_blank')" />`
                : '<div style="width:96px;height:96px;border-radius:12px;background:#F3F3F3;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.6rem">📣</div>'}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  ${pill}
                  <span class="text-xs font-bold text-gray-500">${esc(a.type || 'announcement')}</span>
                </div>
                <h3 class="font-display font-black text-base text-brand-black">${esc(a.title)}</h3>
                <p class="text-sm text-gray-500 mt-1">${esc(a.restaurants?.name || '—')}</p>
                ${a.body ? `<p class="text-sm text-gray-600 mt-2">${esc(a.body)}</p>` : ''}
                <p class="text-xs text-gray-400 mt-2">
                  Requested ${esc(dateStr)}${runWhen ? ' · Runs <strong class="text-brand-black">' + esc(runWhen) + '</strong> (3h)' : ''}
                </p>
                ${a.link_url ? `<p class="text-xs mt-1"><a href="${esc(a.link_url)}" target="_blank" rel="noopener" class="text-brand-black underline">${esc(a.link_url)}</a></p>` : ''}
                ${a.admin_notes ? `<p class="text-xs text-gray-400 mt-1"><strong>Note:</strong> ${esc(a.admin_notes)}</p>` : ''}
              </div>
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

    /* Approve pending owner request — free during early access,
       publishes immediately on approval. */
    list.querySelectorAll('[data-review-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.reviewApprove;
        if (!confirm('Approve this announcement? It goes live to followers immediately.')) return;
        const { error } = await client.rpc('review_announcement', {
          p_id: id, p_decision: 'approved', p_notes: null, p_price_php: null,
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

  };

})();
