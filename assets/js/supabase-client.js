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
      /* Warm up the buzz tier cache (no-op if RPC isn't deployed yet). */
      preloadBuzzTiers();
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
    /* Slug match is case-insensitive so legacy capitalised slugs still resolve. */
    const { data, error } = await c
      .from('restaurants')
      .select(`
        *,
        restaurant_tags ( tag_name ),
        operating_hours ( day_of_week, open_time, close_time, is_closed ),
        menu_categories (
          id, name, sort_order,
          menu_items ( id, name, description, price, price_note, image_url, gallery_urls, tags, is_available, sort_order )
        )
      `)
      .ilike('slug', slug)
      .maybeSingle();
    if (error) { console.error('[YUMYUMPO] getRestaurantBySlug:', error); return null; }
    if (!data) return null;

    /* Shape-adapter — bridge Supabase columns to the static template's field names. */
    if (data.gallery_urls && !data.gallery)            data.gallery      = data.gallery_urls;
    if (data.food_gallery_urls && !data.food_gallery)  data.food_gallery = data.food_gallery_urls;
    if (data.map_embed_url && !data.map_embed)         data.map_embed    = data.map_embed_url;
    if (Array.isArray(data.restaurant_tags))           data.tags         = data.restaurant_tags.map(t => t.tag_name);
    if (Array.isArray(data.operating_hours)) {
      const fmt = t => {
        if (!t) return '';
        const [hh, mm] = String(t).split(':');
        const h = parseInt(hh, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = ((h + 11) % 12) + 1;
        return `${h12}:${mm || '00'} ${period}`;
      };
      data.hours = data.operating_hours.map(h => ({
        day:    h.day_of_week,
        open:   fmt(h.open_time),
        close:  fmt(h.close_time),
        closed: !!h.is_closed,
      }));
    }

    /* Menu adapter: normalise each item so renderMenu sees a consistent shape. */
    if (Array.isArray(data.menu_categories)) {
      data.menu_categories.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
      data.menu_categories.forEach(cat => {
        if (!Array.isArray(cat.menu_items)) return;
        cat.menu_items.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
        cat.items = cat.menu_items.map(it => {
          const gallery = Array.isArray(it.gallery_urls) && it.gallery_urls.length
            ? it.gallery_urls
            : (it.image_url ? [it.image_url] : []);
          return {
            id:          it.id,
            name:        it.name,
            description: it.description || '',
            price:       it.price || '',
            price_note:  it.price_note || '',
            image:       gallery[0] || '',          // legacy alias used by old templates
            image_url:   gallery[0] || '',
            gallery,
            tags:        Array.isArray(it.tags) ? it.tags : [],
            is_available: it.is_available !== false,
          };
        });
      });
    }
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

  /* ════════════════════════════════════════════════════════
     HOMEPAGE PICKS — reads from the homepage_picks view
     created by migration-001. Tags are pre-joined.
  ════════════════════════════════════════════════════════ */
  async function getHomepagePicks(opts = {}) {
    const c = sb();
    if (!c) return null;
    const {
      featured = null,    // true → featured only; false → non-featured; null → all
      ranked   = null,    // true → only rows with rank_label
      cuisine  = null,
      limit    = 50,
      order    = 'rating' // 'rating' | 'created' | 'rank'
    } = opts;

    let q = c.from('homepage_picks').select('*').limit(limit);
    if (featured === true)  q = q.eq('is_featured', true);
    if (featured === false) q = q.eq('is_featured', false);
    if (ranked   === true)  q = q.not('rank_label', 'is', null);
    if (cuisine)            q = q.eq('cuisine_type', cuisine);

    if      (order === 'rating')  q = q.order('google_rating', { ascending: false });
    else if (order === 'created') q = q.order('created_at',    { ascending: false });
    else if (order === 'rank')    q = q.order('rank_label',    { ascending: true });

    const { data, error } = await q;
    if (error) { console.error('[YUMYUMPO] getHomepagePicks:', error); return null; }
    return (data || []).map(normalizeRestaurant);
  }

  async function getHomepageStats() {
    const c = sb();
    if (!c) return null;
    const { data, error } = await c.rpc('get_homepage_stats');
    if (error) { console.error('[YUMYUMPO] getHomepageStats:', error); return null; }
    return Array.isArray(data) ? data[0] : data;
  }

  /* ════════════════════════════════════════════════════════
     NORMALIZER — Supabase row → card template shape
     Card templates expect:  cuisine, rating, reviews, image, cover,
       tags, ai_summary, has_yumyumpo_site, website, slug, name,
       location, rank, badge.
  ════════════════════════════════════════════════════════ */
  function normalizeRestaurant(row) {
    if (!row) return null;
    return {
      id:                 row.id,
      slug:               row.slug,
      name:               row.name,
      cuisine:            row.cuisine_type,
      cuisine_type:       row.cuisine_type,
      description:        row.description,
      ai_summary:         row.ai_summary || row.description || '',
      location:           row.location,
      address:            row.address,
      rating:             Number(row.google_rating) || 0,
      reviews:            row.review_count || 0,
      image:              row.cover_image_url,
      cover:              row.cover_image_url,
      cover_image_url:    row.cover_image_url,
      logo_image_url:     row.logo_image_url,
      website:            row.website_url,
      website_url:        row.website_url,
      has_yumyumpo_site:  !!row.has_yumyumpo_site,
      is_featured:        !!row.is_featured,
      rank:               row.rank_label || null,
      rank_label:         row.rank_label || null,
      badge:              row.rank_label || (row.is_featured ? 'Featured' : ''),
      badge_style:        row.rank_label ? 'dark' : 'default',
      tags:               Array.isArray(row.tags) ? row.tags : [],
      created_at:         row.created_at,
      buzz:               computeBuzz(row),
    };
  }

  /* Buzz tier:
     1) If the real `restaurant_buzz_tiers` RPC has been loaded into
        BUZZ_BY_SLUG (see preloadBuzzTiers below) use that.
     2) Otherwise fall back to a review-count + rating heuristic so
        cards never look dead before real engagement data exists. */
  let BUZZ_BY_SLUG = null;
  function computeBuzz(row) {
    if (BUZZ_BY_SLUG && row.slug && BUZZ_BY_SLUG[row.slug]) return BUZZ_BY_SLUG[row.slug];
    const reviews = Number(row.review_count) || 0;
    const rating  = Number(row.google_rating) || 0;
    if (reviews >= 2000 && rating >= 4.7) return 'hot';
    if (reviews >= 800  && rating >= 4.6) return 'trending';
    if (row.is_featured && rating >= 4.7) return 'hot';
    return null;
  }

  async function preloadBuzzTiers() {
    const c = sb();
    if (!c) return;
    try {
      const { data, error } = await c.rpc('restaurant_buzz_tiers');
      if (error || !Array.isArray(data) || !data.length) return;
      BUZZ_BY_SLUG = Object.create(null);
      data.forEach(row => { if (row.slug && row.buzz_tier) BUZZ_BY_SLUG[row.slug] = row.buzz_tier; });
    } catch {} /* RPC may not exist yet — fall back to heuristic silently. */
  }

  /* Public helpers */
  window.db = {
    getRestaurants,
    getRestaurantBySlug,
    trackAnalyticsEvent,
    getHomepagePicks,
    getHomepageStats,
    normalizeRestaurant,
  };

})();
