/* ============================================================
   YUMYUMPO — Supabase Client
   Replace the placeholders with your real Supabase credentials.
   ============================================================ */

/* ── CONFIGURATION ──
   Get these from: Supabase Dashboard → Settings → API
   Never commit real keys to a public repo — use .env or
   Vercel environment variables for production.
─────────────────────────────────────────────────────────── */
const SUPABASE_URL  = window.ENV_SUPABASE_URL  || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = window.ENV_SUPABASE_ANON || 'YOUR_SUPABASE_ANON_KEY';

/* ── LOAD THE SUPABASE SDK (CDN) ── */
(function loadSupabaseSDK() {
  // Check if already loaded
  if (window.supabase) return;

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    try {
      window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      console.log('[Supabase] Client ready.');
      document.dispatchEvent(new Event('supabase:ready'));
    } catch (err) {
      console.warn('[Supabase] Init skipped (placeholder keys). Using static data.', err.message);
    }
  };
  script.onerror = () => {
    console.warn('[Supabase] SDK could not load. Falling back to static data.');
  };
  document.head.appendChild(script);
})();


/* ── DATA HELPERS ── */

/**
 * Fetch all restaurants (optionally filtered).
 * @param {Object} options
 * @param {string} [options.cuisine]    - Filter by cuisine type
 * @param {boolean} [options.featured]  - Only featured restaurants
 * @param {string} [options.search]     - Full-text search term
 * @param {number} [options.limit=12]   - Max results
 */
async function getRestaurants({ cuisine, featured, search, limit = 12 } = {}) {
  if (!window.supabase) return null; // fall back to static data in main.js

  let query = window.supabase
    .from('restaurants')
    .select(`
      id, slug, name, description, cuisine_type,
      location, google_rating, review_count,
      is_featured, cover_image_url, logo_image_url,
      website_url, whatsapp_url, messenger_url,
      restaurant_tags ( tag_name )
    `)
    .eq('is_active', true)
    .order('google_rating', { ascending: false })
    .limit(limit);

  if (cuisine)  query = query.eq('cuisine_type', cuisine);
  if (featured) query = query.eq('is_featured', true);
  if (search)   query = query.textSearch('fts', search, { type: 'websearch' });

  const { data, error } = await query;
  if (error) { console.error('[Supabase] getRestaurants:', error); return null; }
  return data;
}

/**
 * Fetch a single restaurant by slug.
 * @param {string} slug
 */
async function getRestaurantBySlug(slug) {
  if (!window.supabase) return null;

  const { data, error } = await window.supabase
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

  if (error) { console.error('[Supabase] getRestaurantBySlug:', error); return null; }
  return data;
}

/**
 * Track an analytics event.
 * @param {string} eventType
 * @param {string|null} restaurantId
 * @param {Object} metadata
 */
async function trackAnalyticsEvent(eventType, restaurantId = null, metadata = {}) {
  if (!window.supabase) return;

  const { error } = await window.supabase
    .from('analytics_events')
    .insert([{
      event_type:    eventType,
      restaurant_id: restaurantId,
      metadata:      metadata,
      page_url:      window.location.href,
      user_agent:    navigator.userAgent,
    }]);

  if (error) console.warn('[Supabase] trackAnalyticsEvent:', error);
}

/* Expose helpers globally */
window.db = { getRestaurants, getRestaurantBySlug, trackAnalyticsEvent };
