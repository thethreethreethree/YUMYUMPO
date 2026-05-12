/* ============================================================
   YUMYUMPO — Analytics Engine  v2.0
   Self-contained, privacy-friendly, offline-resilient.
   No external dependencies. Works with or without Supabase.

   Public API:
     YAn.track(eventType, metadata)   — fire a custom event
     YAn.getSession()                 — current session object
     YAn.getLocalStats()              — aggregated local stats
     YAn.exportCSV()                  — download events as CSV
   ============================================================ */

const YAn = (() => {
  'use strict';

  /* ── CONSTANTS ─────────────────────────────────────────── */
  const STORAGE_EVENTS  = 'yyp_events';
  const STORAGE_SESSION = 'yyp_session';
  const STORAGE_STATS   = 'yyp_stats';
  const FLUSH_INTERVAL  = 8000;   // ms between Supabase flushes
  const MAX_QUEUE       = 200;    // max events stored locally
  const SESSION_TIMEOUT = 30 * 60 * 1000;  // 30 min inactivity = new session

  /* ── EVENT REGISTRY ────────────────────────────────────── */
  const EVENT_TYPES = {
    PAGE_VIEW:          'page_view',
    PROFILE_VIEW:       'profile_view',
    CARD_CLICK:         'card_click',
    THUMBNAIL_CLICK:    'thumbnail_click',
    WHATSAPP_CLICK:     'whatsapp_click',
    WEBSITE_CLICK:      'website_click',
    MESSENGER_CLICK:    'messenger_click',
    CALL_CLICK:         'call_click',
    INSTAGRAM_CLICK:    'instagram_click',
    FACEBOOK_CLICK:     'facebook_click',
    SEARCH:             'search',
    CUISINE_FILTER:     'cuisine_filter',
    TAG_FILTER:         'tag_filter',
    AI_RECOMMEND_CLICK: 'ai_recommendation_click',
    SOCIAL_SHARE:       'social_share',
    GALLERY_VIEW:       'gallery_view',
    MENU_VIEW:          'menu_view',
    MAP_VIEW:           'map_view',
    SCROLL_DEPTH:       'scroll_depth',
    TIME_ON_PAGE:       'time_on_page',
    SAVE_RESTAURANT:    'save_restaurant',
    LOAD_MORE:          'load_more',
  };

  /* ── STATE ──────────────────────────────────────────────── */
  let session     = null;
  let queue       = [];
  let flushTimer  = null;
  let pageTimer   = null;
  let pageStart   = Date.now();
  let maxScroll   = 0;
  let isFlushing  = false;

  /* ══════════════════════════════════════════════════════════
     SESSION MANAGEMENT
  ══════════════════════════════════════════════════════════ */
  function initSession() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_SESSION) || 'null');
      const now    = Date.now();

      if (stored && (now - stored.last_seen) < SESSION_TIMEOUT) {
        // Resume existing session
        session = { ...stored, last_seen: now, page_count: stored.page_count + 1 };
      } else {
        // New session
        session = {
          session_id:  crypto.randomUUID?.() || generateUUID(),
          started_at:  now,
          last_seen:   now,
          page_count:  1,
          device_type: getDeviceType(),
          referrer:    document.referrer || 'direct',
          landing_page: window.location.pathname,
        };
      }

      localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
    } catch {
      session = { session_id: generateUUID(), page_count: 1, device_type: 'unknown' };
    }
    return session;
  }

  function getDeviceType() {
    const w = window.innerWidth;
    if (w < 640)  return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }


  /* ══════════════════════════════════════════════════════════
     EVENT TRACKING CORE
  ══════════════════════════════════════════════════════════ */
  function track(eventType, metadata = {}) {
    if (!session) return;

    const event = {
      id:            generateUUID(),
      event_type:    eventType,
      restaurant_id: metadata.restaurant_id || metadata.restaurantId || null,
      session_id:    session.session_id,
      device_type:   session.device_type,
      page_url:      window.location.href,
      path:          window.location.pathname,
      referrer:      document.referrer || 'direct',
      metadata:      sanitize(metadata),
      ts:            Date.now(),
      created_at:    new Date().toISOString(),
    };

    // Store locally
    enqueue(event);

    // Update local stats aggregation
    updateLocalStats(event);

    // Dev logging
    if (isDev()) console.log('[YAn]', event.event_type, event.metadata);

    // Attempt immediate Supabase push for high-value events
    const highValue = ['website_click','card_click','fred_search'];
    if (highValue.includes(eventType)) flushNow();

    return event;
  }

  function sanitize(meta) {
    // Remove any accidentally-passed PII
    const clean = { ...meta };
    delete clean.email; delete clean.phone; delete clean.name;
    delete clean.restaurantId; // already extracted above
    return clean;
  }

  function isDev() {
    return location.hostname === 'localhost'
      || location.hostname === '127.0.0.1'
      || location.protocol === 'file:';
  }


  /* ══════════════════════════════════════════════════════════
     LOCAL EVENT QUEUE
  ══════════════════════════════════════════════════════════ */
  function enqueue(event) {
    try {
      queue.push(event);
      if (queue.length > MAX_QUEUE) queue.shift(); // drop oldest
      localStorage.setItem(STORAGE_EVENTS, JSON.stringify(queue));
    } catch { /* storage full — events still in memory */ }
  }

  function loadQueue() {
    try {
      queue = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || '[]');
    } catch { queue = []; }
  }

  function clearQueue(ids) {
    queue = queue.filter(e => !ids.includes(e.id));
    try { localStorage.setItem(STORAGE_EVENTS, JSON.stringify(queue)); } catch {}
  }


  /* ══════════════════════════════════════════════════════════
     SUPABASE FLUSH
  ══════════════════════════════════════════════════════════ */
  async function flush() {
    if (isFlushing || !queue.length) return;
    const client = window.YYP?.client;
    if (!client) return;

    isFlushing = true;
    const batch = queue.slice(0, 30); // max 30 per flush

    try {
      const rows = batch.map(e => ({
        event_type:    e.event_type,
        restaurant_id: e.restaurant_id,
        session_id:    e.session_id,
        device_type:   e.device_type,
        page_url:      e.page_url,
        metadata:      e.metadata,
        created_at:    e.created_at,
      }));

      const { error } = await client.from('analytics_events').insert(rows);
      if (!error) {
        clearQueue(batch.map(e => e.id));
        if (isDev()) console.log(`[YAn] Flushed ${batch.length} events to Supabase`);
      }
    } catch (err) {
      if (isDev()) console.warn('[YAn] Flush failed, retrying later:', err.message);
    } finally {
      isFlushing = false;
    }
  }

  async function flushNow() {
    clearTimeout(flushTimer);
    await flush();
    scheduleFlush();
  }

  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_INTERVAL);
  }


  /* ══════════════════════════════════════════════════════════
     LOCAL STATS AGGREGATION
     Maintains running counts in localStorage for instant display
     without needing a Supabase query.
  ══════════════════════════════════════════════════════════ */
  function updateLocalStats(event) {
    try {
      const stats = JSON.parse(localStorage.getItem(STORAGE_STATS) || '{}');
      const date  = new Date().toISOString().slice(0, 10);

      // Total counts
      stats.total        = (stats.total || 0) + 1;
      stats.by_type      = stats.by_type || {};
      stats.by_type[event.event_type] = (stats.by_type[event.event_type] || 0) + 1;

      // Daily counts
      stats.daily        = stats.daily || {};
      stats.daily[date]  = (stats.daily[date] || 0) + 1;

      // Per-restaurant counts
      if (event.restaurant_id) {
        stats.by_restaurant = stats.by_restaurant || {};
        const r = stats.by_restaurant[event.restaurant_id] || { views: 0, clicks: 0 };
        if (event.event_type === 'profile_view') r.views++;
        else r.clicks++;
        stats.by_restaurant[event.restaurant_id] = r;
      }

      // Sessions
      stats.sessions = stats.sessions || {};
      stats.sessions[event.session_id] = true;

      localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
    } catch {}
  }

  function getLocalStats() {
    try {
      const stats = JSON.parse(localStorage.getItem(STORAGE_STATS) || '{}');
      const events = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || '[]');

      // Compute 7-day daily traffic
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d   = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, count: stats.daily?.[key] || 0, label: d.toLocaleDateString('en-US', { weekday: 'short' }) });
      }

      // Conversion rate: external website clicks ÷ profile views
      const views    = stats.by_type?.['profile_view']   || 0;
      const websites = stats.by_type?.['website_click']  || 0;
      const cards    = stats.by_type?.['card_click']     || 0;
      const ctr = views > 0 ? ((websites / views) * 100).toFixed(1) : '0.0';

      return {
        total_events:    stats.total || 0,
        unique_sessions: Object.keys(stats.sessions || {}).length,
        profile_views:   views,
        card_clicks:     cards,
        website_clicks:  websites,
        search_events:   stats.by_type?.['search']         || 0,
        ctr_percent:     parseFloat(ctr),
        by_type:         stats.by_type || {},
        by_restaurant:   stats.by_restaurant || {},
        daily_7d:        days,
        recent_events:   events.slice(-20).reverse(),
      };
    } catch {
      return { total_events: 0, unique_sessions: 0, profile_views: 0, daily_7d: [] };
    }
  }


  /* ══════════════════════════════════════════════════════════
     AUTO-TRACKING
  ══════════════════════════════════════════════════════════ */
  function autoTrack() {
    // 1. Page view
    track(EVENT_TYPES.PAGE_VIEW, {
      title: document.title,
      path:  window.location.pathname,
    });

    // 2. Scroll depth (fires at 25%, 50%, 75%, 100%)
    const depths = new Set();
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY + window.innerHeight;
      const total    = document.documentElement.scrollHeight;
      const pct      = Math.floor((scrolled / total) * 100);
      const milestone = [25, 50, 75, 100].find(m => pct >= m && !depths.has(m));
      if (milestone) {
        depths.add(milestone);
        track(EVENT_TYPES.SCROLL_DEPTH, { depth_percent: milestone, path: window.location.pathname });
      }
      maxScroll = Math.max(maxScroll, pct);
    }, { passive: true });

    // 3. Time on page — fires on visibility change or beforeunload
    const reportTime = () => {
      const seconds = Math.round((Date.now() - pageStart) / 1000);
      if (seconds > 5) {
        track(EVENT_TYPES.TIME_ON_PAGE, {
          seconds,
          max_scroll: maxScroll,
          path: window.location.pathname,
        });
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) reportTime();
    });
    window.addEventListener('beforeunload', reportTime);

    /* 4. Outbound link tracking — only fires for real external website
       clicks (not social profiles, since cards no longer link to those). */
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.href;
      if (!href || href.startsWith(location.origin)) return;
      /* Skip mailto/tel/javascript — only http(s) destinations matter */
      if (!/^https?:/i.test(href)) return;
      track(EVENT_TYPES.WEBSITE_CLICK, extractRestaurantMeta(link));
    }, { passive: true });

    // 5. Section visibility (menu, map, hours) using IntersectionObserver
    const sections = {
      'menu-section':     EVENT_TYPES.MENU_VIEW,
      'map-section':      EVENT_TYPES.MAP_VIEW,
      'hours-section':    'hours_view',
      'food-gallery-section': EVENT_TYPES.GALLERY_VIEW,
    };

    if ('IntersectionObserver' in window) {
      const seen = new Set();
      const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !seen.has(entry.target.id)) {
            seen.add(entry.target.id);
            track(sections[entry.target.id], { section: entry.target.id });
          }
        });
      }, { threshold: 0.3 });

      Object.keys(sections).forEach(id => {
        const el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
      });
    }
  }

  function extractRestaurantMeta(el) {
    // Try to read restaurant context from nearest data attribute or URL
    const card = el.closest('[data-restaurant-id]');
    return {
      restaurant_id: card?.dataset.restaurantId || null,
      restaurant_name: card?.dataset.restaurantName || null,
    };
  }


  /* ══════════════════════════════════════════════════════════
     CSV EXPORT
  ══════════════════════════════════════════════════════════ */
  function exportCSV() {
    const events = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || '[]');
    if (!events.length) { alert('No local events to export.'); return; }

    const headers = ['id','event_type','restaurant_id','session_id','device_type','page_url','created_at'];
    const rows = events.map(e =>
      headers.map(h => JSON.stringify(e[h] ?? '')).join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `yumyumpo-analytics-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  function init() {
    initSession();
    loadQueue();
    autoTrack();
    scheduleFlush();

    // Flush on page hide (catches tab closes)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flush();
    });

    // Flush when Supabase becomes ready
    document.addEventListener('yyp:ready', flushNow);

    if (isDev()) console.log('[YAn] Analytics engine ready. Session:', session.session_id);
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── PUBLIC API ── */
  return {
    track,
    getSession:    () => session,
    getLocalStats,
    exportCSV,
    flush:         flushNow,
    EVENT_TYPES,
  };

})();

/* ── Backward-compat shims for existing tracking calls in other files ── */
window.YAn = YAn;

// Patch the old trackEvent in main.js
window.trackEvent = function(eventType, metadata = {}) {
  YAn.track(eventType, metadata);
};

// Patch the old trackAction in restaurant.js
window.trackAction = function(eventType, restaurantId, metadata = {}) {
  YAn.track(eventType, { ...metadata, restaurant_id: restaurantId });
};
