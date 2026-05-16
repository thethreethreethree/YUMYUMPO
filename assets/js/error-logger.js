/* ============================================================
   YUMYUMPO — Client Error Logger
   ────────────────────────────────────────────────────────────
   Captures uncaught errors + unhandled promise rejections and
   posts them to the `error_logs` table (migration 025) so the
   team has visibility into real-world breakage.

   Lightweight + defensive:
     • Buffers errors until the Supabase client is ready
     • De-dupes identical messages within a short window
     • Caps total reports per page load (no error storms)
     • Never throws — a logger that crashes is worse than none
   ============================================================ */

'use strict';

(function () {
  if (window.__yypErrorLogger) return;
  window.__yypErrorLogger = true;

  const MAX_PER_PAGE = 12;
  const DEDUPE_MS    = 10_000;

  let sent = 0;
  const recent = new Map();           // message -> last-sent timestamp
  const buffer = [];                  // errors awaiting the client

  function client() { return window.YYP?.client || null; }

  async function flush() {
    const c = client();
    if (!c || !buffer.length) return;
    const batch = buffer.splice(0, buffer.length);
    try {
      await c.from('error_logs').insert(batch);
    } catch (_) { /* swallow — never let logging break the page */ }
  }

  function report(message, source, stack, context) {
    try {
      if (sent >= MAX_PER_PAGE) return;
      message = String(message || 'Unknown error').slice(0, 1000);

      const now = Date.now();
      const last = recent.get(message);
      if (last && now - last < DEDUPE_MS) return;
      recent.set(message, now);
      sent++;

      const uid = window.YYP?.client?.auth
        ? undefined  // resolved async below; keep row lean
        : undefined;

      buffer.push({
        message,
        source:     (source || '').slice(0, 300) || null,
        url:        location.href.slice(0, 500),
        user_agent: navigator.userAgent.slice(0, 400),
        stack:      stack ? String(stack).slice(0, 4000) : null,
        context:    context || null,
      });
      flush();
    } catch (_) { /* never throw */ }
  }

  /* Uncaught runtime errors */
  window.addEventListener('error', (e) => {
    /* Ignore resource-load errors (img/script 404s) — not actionable JS bugs. */
    if (e && e.target && e.target !== window && e.target.tagName) return;
    report(e.message, e.filename + ':' + e.lineno, e.error && e.error.stack);
  }, true);

  /* Unhandled promise rejections */
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    report(
      (r && (r.message || r)) || 'Unhandled promise rejection',
      'promise',
      r && r.stack
    );
  });

  /* Flush any buffered errors once the Supabase client comes online. */
  if (window.YYP?.ready) flush();
  else document.addEventListener('yyp:ready', flush, { once: true });

  /* Expose a manual hook for try/catch blocks that want to record. */
  window.YYP = window.YYP || {};
  window.YYP.logError = function (err, context) {
    report(err && (err.message || err), 'manual', err && err.stack, context);
  };
})();
