/* ============================================================
   YUMYUMPO — Supabase Client
   ────────────────────────────────────────────────────────────
   Reads credentials from window.YUMYUMPO_CONFIG (see config.js).
   Exposes:
     window.YYP.client       → Supabase client instance (or null)
     window.YYP.ready        → true once initialised
     window.YYP.mode         → 'production' | 'development'
     window.db               → high-level data helpers
     window.supabase         → preserved SDK namespace (NEVER overwritten)
   Fires the `yyp:ready` event when the client is available.
   ============================================================ */

(function () {
  'use strict';

  const cfg = window.YUMYUMPO_CONFIG || {};
  const MODE = cfg.MODE === 'development' ? 'development' : 'production';

  /* Singleton state */
  window.YYP = {
    client: null,
    ready:  false,
    mode:   MODE,
    config: cfg,
  };

  const url = cfg.SUPABASE_URL;
  const key = cfg.SUPABASE_ANON_KEY;
  const isPlaceholder = !url || !key || /YOUR_/.test(url) || /YOUR_/.test(key);

  if (isPlaceholder) {
    const msg = '[YUMYUMPO] Supabase credentials are missing or placeholder values. ' +
                'Copy assets/js/config.example.js to assets/js/config.js and fill in real values.';
    if (MODE === 'production') console.error(msg);
    else                       console.warn(msg + ' Running in development mode with static data only.');
    /* Still emit ready event so dependent code can proceed in static mode */
    document.dispatchEvent(new Event('yyp:ready'));
    return;
  }

  /* Load the Supabase SDK from CDN, then create the client */
  const sdkScript = document.createElement('script');
  sdkScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  sdkScript.onload = () => {
    try {
      /* window.supabase is the SDK namespace; we DO NOT overwrite it */
      const client = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      window.YYP.client = client;
      window.YYP.ready  = true;
      document.dispatchEvent(new Event('yyp:ready'));
    } catch (err) {
      console.error('[YUMYUMPO] Failed to initialise Supabase client:', err);
      document.dispatchEvent(new Event('yyp:ready'));
    }
  };
  sdkScript.onerror = () => {
    console.error('[YUMYUMPO] Could not load Supabase SDK from CDN.');
    document.dispatchEvent(new Event('yyp:ready'));
  };
  document.head.appendChild(sdkScript);


  /* ════════════════════════════════════════════════════════
     DATA HELPERS — all guard against missing client
  ════════════════════════════════════════════════════════ */
  const sb = () => window.YYP.client;

  async function getRestaurants({ cuisine, featured, search, limit = 12 } = {}) {
    const c = sb();
    if (!c) return null;
    let q = c.from('restaurants')
      .select(`
        id, slug, name, description, cuisine_type, location,
        google_rating, review_count, is_featured, is_active,
        cover_image_url, logo_image_url, website_url, has_yumyumpo_site,
        restaurant_tags ( tag_name )
      `)
      .eq('is_active', true)
      .order('google_rating', { ascending: false })
      .limit(limit);
    if (cuisine)  q = q.eq('cuisine_type', cuisine);
    if (featured) q = q.eq('is_featured', true);
    if (search)   q = q.textSearch('fts', search, { type: 'websearch' });
    const { data, error } = await q;
    if (error) { console.error('[YUMYUMPO] getRestaurants:', error); return null; }
    return data;
  }

  async function getRestaurantBySlug(slug) {
    const c = sb();
    if (!c) return null;
    const { data, error } = await c
      .from('restaurants')
      .select(`
        *,
        restaurant_tags ( tag_name ),
        menu_categories (
          id, name, sort_order,
          menu_items ( id, name, description, price, image_url, is_available, tags )
        )
      `)
      .eq('slug', slug)
      .single();
    if (error) { console.error('[YUMYUMPO] getRestaurantBySlug:', error); return null; }
    return data;
  }

  async function trackAnalyticsEvent(eventType, restaurantId = null, metadata = {}) {
    const c = sb();
    if (!c) return;
    const { error } = await c.from('analytics_events').insert([{
      event_type:    eventType,
      restaurant_id: restaurantId,
      metadata,
      page_url:      window.location.href,
      user_agent:    navigator.userAgent,
    }]);
    if (error) console.warn('[YUMYUMPO] trackAnalyticsEvent:', error);
  }

  /* Public helpers */
  window.db = { getRestaurants, getRestaurantBySlug, trackAnalyticsEvent };

})();
