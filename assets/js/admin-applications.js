/* ============================================================
   YUMYUMPO — Admin Applications Module
   Adds the "Applications" tab to the admin dashboard.
   Loads after admin.js. Hooks into initDashboard via DOMContentLoaded.
   ============================================================ */

'use strict';

(function () {
  let allApplications   = [];
  let appsCurrentFilter = 'pending';

  /* Load once Supabase is ready */
  function init() {
    if (window.YYP?.ready) loadApplications();
    else document.addEventListener('yyp:ready', loadApplications, { once: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function loadApplications() {
    const client = window.YYP?.client;
    if (!client) return;

    const { data, error } = await client
      .from('restaurant_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Applications] load error:', error.message);
      return;
    }

    allApplications = data || [];
    updateAppCounts();
    renderApplications();
  }

  function updateAppCounts() {
    const counts = { pending: 0, reviewing: 0, approved: 0, rejected: 0 };
    allApplications.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    for (const [k, v] of Object.entries(counts)) {
      const el = document.getElementById('count-' + k);
      if (el) el.textContent = v;
    }
    const badge = document.getElementById('apps-pending-badge');
    if (badge) {
      if (counts.pending > 0) {
        badge.textContent = counts.pending;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  window.filterApps = function (filter, btn) {
    appsCurrentFilter = filter;
    document.querySelectorAll('.apps-filter-btn').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    renderApplications();
  };

  window.refreshApplications = function () {
    loadApplications();
  };

  function renderApplications() {
    const list  = document.getElementById('apps-list');
    const empty = document.getElementById('apps-empty');
    if (!list) return;

    const filtered = appsCurrentFilter === 'all'
      ? allApplications
      : allApplications.filter(a => a.status === appsCurrentFilter);

    if (!filtered.length) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    list.innerHTML = filtered.map(a => {
      const date = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const isContact = (a.restaurant_name || '').startsWith('[Contact]');
      return `
        <div class="app-card" onclick="openAppModal('${a.id}')">
          <div class="flex items-start justify-between gap-4 mb-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <h3 class="font-display font-black text-base text-brand-black">${esc(a.restaurant_name || 'Untitled')}</h3>
                ${isContact ? '<span class="text-xs font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📨 CONTACT</span>' : ''}
                ${a.needs_website ? '<span class="app-needs-website">⚡ Wants Website</span>' : ''}
              </div>
              <p class="text-sm text-gray-500">${esc(a.owner_name || 'No name')} · ${esc(a.contact_email)}</p>
              <p class="text-xs text-gray-400 mt-1">
                ${a.cuisine_type ? esc(a.cuisine_type) + ' · ' : ''}
                ${a.location ? esc(a.location) + ' · ' : ''}
                Applied ${date}
              </p>
            </div>
            <span class="app-status ${a.status} shrink-0">${a.status}</span>
          </div>
          ${(a.status === 'approved' || a.status === 'onboarded') && a.onboard_token ? `
          <div class="pt-2 mt-1 border-t border-gray-100">
            <button onclick="event.stopPropagation();sendWelcomePage('${a.id}')"
              class="apps-filter-btn" style="background:#FFD000;border-color:#FFD000;color:#111;font-weight:800">
              🎉 Send Welcome Page
            </button>
          </div>` : ''}
        </div>
      `;
    }).join('');
  }

  window.openAppModal = function (id) {
    const a = allApplications.find(x => x.id === id);
    if (!a) return;

    const date = new Date(a.created_at).toLocaleString();
    const isContact = (a.restaurant_name || '').startsWith('[Contact]');

    document.getElementById('app-modal-body').innerHTML = `
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <span class="app-status ${a.status} mb-2 inline-block">${a.status}</span>
          <h2 class="font-display font-black text-2xl text-brand-black tracking-tight">${esc(a.restaurant_name || 'Untitled')}</h2>
          <p class="text-sm text-gray-400 mt-1">Submitted ${date}</p>
        </div>
        <button onclick="closeAppModal()" class="text-gray-400 hover:text-brand-black text-2xl leading-none">×</button>
      </div>

      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Contact</p>
            <p class="text-sm text-brand-black font-semibold">${esc(a.owner_name || '—')}</p>
            <p class="text-sm"><a href="mailto:${esc(a.contact_email)}" class="text-brand-black underline">${esc(a.contact_email)}</a></p>
            ${a.contact_phone ? `<p class="text-sm text-gray-600">${esc(a.contact_phone)}</p>` : ''}
          </div>
          <div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Restaurant</p>
            <p class="text-sm text-brand-black"><strong>Cuisine:</strong> ${esc(a.cuisine_type || '—')}</p>
            <p class="text-sm text-brand-black"><strong>Location:</strong> ${esc(a.location || '—')}</p>
          </div>
        </div>

        ${a.about ? `
        <div>
          <p class="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">${isContact ? 'Message' : 'About'}</p>
          <p class="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4" style="white-space:pre-wrap">${esc(a.about)}</p>
        </div>` : ''}

        <div>
          <p class="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Digital presence</p>
          ${a.existing_website
            ? `<p class="text-sm"><strong>Has website:</strong> <a href="${esc(a.existing_website)}" target="_blank" rel="noopener" class="text-brand-black underline">${esc(a.existing_website)}</a></p>`
            : a.needs_website
              ? '<p class="text-sm"><span class="app-needs-website">⚡ Wants YUMYUMPO to build a website</span></p>'
              : '<p class="text-sm text-gray-500">Not specified.</p>'}
        </div>

        ${a.source || a.referrer_url ? `
        <div>
          <p class="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Source</p>
          <p class="text-xs text-gray-500">
            ${a.source ? 'Source: <strong class="text-brand-black">' + esc(a.source) + '</strong>' : ''}
            ${a.referrer_url ? '<br/>Referrer: ' + esc(a.referrer_url) : ''}
          </p>
        </div>` : ''}

        <div>
          <label class="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 block">Internal notes</label>
          <textarea id="app-notes" class="form-input" rows="3" placeholder="Notes for the team…">${esc(a.admin_notes || '')}</textarea>
        </div>

        <div class="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <button onclick="updateAppStatus('${a.id}','reviewing')" class="apps-filter-btn">Mark as Reviewing</button>
          <button onclick="approveAndOnboard('${a.id}')" class="apps-filter-btn" style="background:#FFD000;border-color:#FFD000;color:#111;font-weight:800">✨ Approve &amp; Onboard</button>
          <button onclick="updateAppStatus('${a.id}','rejected')"  class="apps-filter-btn" style="background:#FEE2E2;border-color:#FECACA;color:#991B1B">✕ Reject</button>
          <a href="mailto:${esc(a.contact_email)}?subject=Your%20YUMYUMPO%20application" class="apps-filter-btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px">✉ Reply</a>
        </div>
        ${a.onboard_token ? `
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-3">
          <p class="text-xs font-black text-yellow-800 uppercase tracking-wider mb-1">Claim link (share with applicant)</p>
          <div class="flex gap-2 items-center">
            <input type="text" readonly value="${esc(location.origin)}/claim?token=${esc(a.onboard_token)}" class="form-input text-xs" style="flex:1" id="claim-link-${a.id}" />
            <button class="apps-filter-btn" onclick="copyClaimLink('${a.id}')">Copy</button>
          </div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-3">
          <p class="text-xs font-black text-yellow-800 uppercase tracking-wider mb-1">🎉 Partner welcome page</p>
          <p class="text-xs text-gray-500 mb-2">A fun, celebratory page that greets your new partner by name. Release it once they're approved.</p>
          <div class="flex gap-2 items-center">
            <input type="text" readonly value="${esc(location.origin)}/welcome?token=${esc(a.onboard_token)}" class="form-input text-xs" style="flex:1" id="welcome-link-${a.id}" />
            <button class="apps-filter-btn" onclick="copyWelcomeLink('${a.id}')">Copy</button>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <a href="${esc(location.origin)}/welcome?token=${esc(a.onboard_token)}" target="_blank" rel="noopener" class="apps-filter-btn" style="text-decoration:none">Preview →</a>
            <button class="apps-filter-btn" onclick="sendWelcomePage('${a.id}')" style="background:#FFD000;border-color:#FFD000;color:#111;font-weight:800">✉ Send Welcome Page</button>
          </div>
        </div>` : ''}
      </div>
    `;

    document.getElementById('app-modal').classList.remove('hidden');
    document.getElementById('app-modal').classList.add('flex');
    document.body.style.overflow = 'hidden';
  };

  window.closeAppModal = function () {
    document.getElementById('app-modal').classList.add('hidden');
    document.getElementById('app-modal').classList.remove('flex');
    document.body.style.overflow = '';
  };

  window.updateAppStatus = async function (id, status) {
    const client = window.YYP?.client;
    if (!client) return;
    const notes = document.getElementById('app-notes')?.value || null;

    const { data: { session } } = await client.auth.getSession();
    const reviewedBy = session?.user?.id || null;

    const { error } = await client
      .from('restaurant_applications')
      .update({
        status,
        admin_notes: notes,
        reviewed_by:  reviewedBy,
        reviewed_at:  new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      alert('Update failed: ' + error.message);
      return;
    }

    const a = allApplications.find(x => x.id === id);
    if (a) {
      a.status      = status;
      a.admin_notes = notes;
      a.reviewed_at = new Date().toISOString();
    }
    updateAppCounts();
    renderApplications();
    closeAppModal();
  };

  /* Approve + spawn the restaurant draft + generate a claim link.
     Calls the migration-021 RPC then re-renders the modal so the
     admin can copy the link to share with the applicant. */
  window.approveAndOnboard = async function (id) {
    const client = window.YYP?.client;
    if (!client) return;
    if (!confirm("Approve this applicant? We'll spawn their restaurant draft and generate a claim link.")) return;

    const { data, error } = await client.rpc('approve_application', { p_app_id: id });
    if (error) { alert('Failed: ' + error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;

    const a = allApplications.find(x => x.id === id);
    if (a) {
      a.status = 'approved';
      /* Function returns out_token now (renamed to avoid PL/pgSQL
         column-ambiguity with restaurants.slug). */
      a.onboard_token = row?.out_token || row?.onboard_token;
      a.reviewed_at = new Date().toISOString();
    }
    updateAppCounts();
    renderApplications();
    /* Re-open the modal so the claim link panel is visible immediately. */
    if (typeof window.openAppModal === 'function' && a) window.openAppModal(a.id);
    alert('Approved! The claim link is now in the modal — copy and send it to the applicant.');
  };

  window.copyClaimLink = function (id) {
    const el = document.getElementById('claim-link-' + id);
    if (!el) return;
    el.select();
    try { navigator.clipboard.writeText(el.value); } catch { document.execCommand('copy'); }
    el.nextElementSibling && (el.nextElementSibling.textContent = 'Copied ✓');
    setTimeout(() => { if (el.nextElementSibling) el.nextElementSibling.textContent = 'Copy'; }, 1500);
  };

  window.copyWelcomeLink = function (id) {
    const el = document.getElementById('welcome-link-' + id);
    if (!el) return;
    el.select();
    try { navigator.clipboard.writeText(el.value); } catch { document.execCommand('copy'); }
    el.nextElementSibling && (el.nextElementSibling.textContent = 'Copied ✓');
    setTimeout(() => { if (el.nextElementSibling) el.nextElementSibling.textContent = 'Copy'; }, 1500);
  };

  /* Release the welcome page: copy the link + open a pre-filled
     email to the new partner so the admin can send it in one tap. */
  window.sendWelcomePage = function (id) {
    const a = allApplications.find(x => x.id === id);
    if (!a || !a.onboard_token) { alert('Approve this application first.'); return; }

    const url = location.origin + '/welcome?token=' + encodeURIComponent(a.onboard_token);
    try { navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }

    const name = (a.owner_name || '').trim();
    const subject = encodeURIComponent('🎉 Welcome to YUMYUMPO!');
    const body = encodeURIComponent(
      'Hi' + (name ? ' ' + name : ' there') + ',\n\n' +
      'Wonderful news — your YUMYUMPO application has been approved! 🎉\n\n' +
      'We made you a little welcome page. Open it here:\n' + url + '\n\n' +
      'It walks you through claiming your restaurant and getting set up.\n' +
      'We can\'t wait to have you on board.\n\n' +
      '— The YUMYUMPO team'
    );
    window.location.href = 'mailto:' + encodeURIComponent(a.contact_email) +
      '?subject=' + subject + '&body=' + body;
  };

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();
