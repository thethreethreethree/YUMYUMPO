/* ============================================================
   YUMYUMPO — Service Worker  v1.0.0
   ────────────────────────────────────────────────────────────
   Intentionally minimal:
     • Install/activate hooks for future offline caching
     • Pass-through fetch handler — does NOT cache HTML/JS yet
       (we keep this off to avoid stale-content bugs while the
       project is still iterating; flip CACHE_ENABLED to true
       later when we want offline support).
   ============================================================ */

'use strict';

const CACHE_NAME    = 'yumyumpo-v1';
const CACHE_ENABLED = false;   // toggle ON later for offline mode

/* Resources that are safe to pre-cache (logo, css, fonts) when enabled. */
const PRECACHE_URLS = [
  './',
  './assets/images/yumyumpo-logo.webp',
  './assets/css/styles.css',
];


/* ── INSTALL ───────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  /* Skip waiting so updates roll out on next page load */
  self.skipWaiting();

  if (CACHE_ENABLED) {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(() => null))
    );
  }
});


/* ── ACTIVATE ─────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  /* Clean up old caches and take control immediately */
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});


/* ── FETCH ────────────────────────────────────────────────
   Default: network-first, no caching (safe while iterating).
   When CACHE_ENABLED = true, we serve precached assets first
   then network-fall-through. ────────────────────────────── */
self.addEventListener('fetch', (event) => {
  if (!CACHE_ENABLED)                  return;
  if (event.request.method !== 'GET')  return;

  /* Only handle our own origin; skip Supabase, Google, etc. */
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request)
      .then(response => {
        /* Cache successful same-origin asset responses */
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone)).catch(() => null);
        }
        return response;
      })
      .catch(() => caches.match('./')) /* offline fallback */
    )
  );
});


/* ── MESSAGE ──────────────────────────────────────────────
   Allows the page to call sw.postMessage({type:'SKIP_WAITING'})
   to force-activate a new SW on demand. */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
