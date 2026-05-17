/* ============================================================
   YUMYUMPO — Admin Logs Module
   Renders the "Logs" tab in the admin dashboard:
     • error_logs      — client-side errors (migration 025)
     • admin_audit_log — admin approval/payment trail (migration 025)
   Both tables are admin-readable only via RLS.
   ============================================================ */

'use strict';

(function () {

  function init() {
    if (window.YYP?.ready) loadAdminLogs();
    else document.addEventListener('yyp:ready', loadAdminLogs, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function when(ts) {
    return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  }

  window.loadAdminLogs = async function () {
    const c = window.YYP?.client;
    if (!c) return;
    await Promise.all([loadErrorLogs(c), loadAuditLog(c)]);
  };

  async function loadErrorLogs(c) {
    const list  = document.getElementById('error-log-list');
    const empty = document.getElementById('error-log-empty');
    const badge = document.getElementById('logs-error-badge');
    if (!list) return;

    const { data, error } = await c
      .from('error_logs')
      .select('id, created_at, message, source, url, user_agent, stack')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) { console.warn('[admin-logs] error_logs:', error.message); return; }

    /* Sidebar badge: count errors from the last 24h. */
    const dayAgo = Date.now() - 86400000;
    const recent = (data || []).filter(e => new Date(e.created_at).getTime() > dayAgo).length;
    if (badge) {
      if (recent > 0) { badge.textContent = recent; badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    }

    if (!data?.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    list.innerHTML = data.map(e => `
      <div class="app-card" style="cursor:default;border-color:#FECACA">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex-1 min-w-0">
            <p class="font-mono text-sm text-red-700 font-bold break-words">${esc(e.message)}</p>
            <p class="text-xs text-gray-400 mt-1">
              ${esc(when(e.created_at))}
              ${e.source ? ' · ' + esc(e.source) : ''}
            </p>
            ${e.url ? `<p class="text-xs text-gray-400 truncate">${esc(e.url)}</p>` : ''}
            ${e.stack ? `<details class="mt-2"><summary class="text-xs font-bold text-gray-500 cursor-pointer">Stack trace</summary><pre class="text-xs text-gray-600 mt-1 whitespace-pre-wrap break-words">${esc(e.stack)}</pre></details>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  async function loadAuditLog(c) {
    const list  = document.getElementById('audit-log-list');
    const empty = document.getElementById('audit-log-empty');
    if (!list) return;

    const { data, error } = await c
      .from('admin_audit_log')
      .select('id, created_at, action, entity, entity_id, detail')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) { console.warn('[admin-logs] audit_log:', error.message); return; }
    if (!data?.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    list.innerHTML = data.map(a => {
      const d = a.detail || {};
      const label = d.restaurant_name || d.title || a.entity_id || '';
      const extra = [];
      if (d.from && d.to) extra.push(`${esc(d.from)} → ${esc(d.to)}`);
      if (d.price_php != null) extra.push(`₱${esc(d.price_php)}`);
      return `
        <div class="app-card" style="cursor:default">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-brand-black"><strong>${esc(a.action)}</strong>${label ? ' · ' + esc(label) : ''}</p>
              <p class="text-xs text-gray-400 mt-0.5">${esc(when(a.created_at))}${extra.length ? ' · ' + extra.join(' · ') : ''}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

})();
