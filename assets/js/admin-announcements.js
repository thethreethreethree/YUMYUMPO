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
      .select('id, title, body, type, starts_at, ends_at, is_published, created_at, restaurants(name, slug)')
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

    list.innerHTML = data.map(a => {
      const date = new Date(a.starts_at || a.created_at);
      const dateStr = date.toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
      return `
        <div class="app-card" style="cursor:default">
          <div class="flex items-start justify-between gap-4 mb-1">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="app-status pending">${esc(a.type || 'announcement')}</span>
                ${!a.is_published ? '<span class="app-status rejected">DRAFT</span>' : ''}
              </div>
              <h3 class="font-display font-black text-base text-brand-black">${esc(a.title)}</h3>
              <p class="text-sm text-gray-500 mt-1">${esc(a.restaurants?.name || '—')} · ${esc(dateStr)}</p>
              ${a.body ? `<p class="text-sm text-gray-600 mt-2 line-clamp-2">${esc(a.body)}</p>` : ''}
            </div>
            <button class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B" data-delete="${esc(a.id)}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this announcement?')) return;
        await client.from('venue_announcements').delete().eq('id', btn.dataset.delete);
        loadAnnouncements();
      });
    });
  };

})();
