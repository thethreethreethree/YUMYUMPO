-- ============================================================
-- YUMYUMPO — Extended Analytics Schema  v2.0
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Extends the base schema.sql with full intelligence tables.
-- ============================================================


-- ── SESSIONS ────────────────────────────────────────────────
-- One row per browser session (30-min inactivity = new session)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id    TEXT PRIMARY KEY,
  device_type   TEXT CHECK (device_type IN ('mobile','tablet','desktop','unknown')),
  referrer      TEXT,
  landing_page  TEXT,
  page_count    INTEGER DEFAULT 1,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_started_idx ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_device_idx  ON analytics_sessions(device_type);


-- ── ANALYTICS EVENTS (enhanced) ─────────────────────────────
-- Drop and recreate if upgrading from the base schema
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS session_id  TEXT REFERENCES analytics_sessions(session_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS path        TEXT,
  ADD COLUMN IF NOT EXISTS referrer    TEXT;

CREATE INDEX IF NOT EXISTS analytics_events_session_idx  ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_date ON analytics_events((created_at::date));

-- Full-text index on metadata for query searches
CREATE INDEX IF NOT EXISTS analytics_events_metadata_idx ON analytics_events USING GIN(metadata);


-- ── EVENT TYPE REFERENCE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_types (
  event_type    TEXT PRIMARY KEY,
  description   TEXT,
  category      TEXT,  -- 'navigation','engagement','conversion','ai'
  is_conversion BOOLEAN DEFAULT FALSE
);

INSERT INTO event_types (event_type, description, category, is_conversion) VALUES
  ('page_view',            'Any page loaded',                    'navigation',  false),
  ('profile_view',         'Restaurant profile page opened',     'navigation',  false),
  ('card_click',           'Restaurant card clicked from list',  'engagement',  false),
  ('thumbnail_click',      'Thumbnail image clicked',            'engagement',  false),
  ('whatsapp_click',       'WhatsApp button tapped',             'conversion',  true),
  ('website_click',        'External website link clicked',      'conversion',  true),
  ('messenger_click',      'Messenger button tapped',            'conversion',  true),
  ('call_click',           'Phone call initiated',               'conversion',  true),
  ('instagram_click',      'Instagram link clicked',             'engagement',  false),
  ('facebook_click',       'Facebook link clicked',              'engagement',  false),
  ('search',               'Search query submitted',             'engagement',  false),
  ('cuisine_filter',       'Cuisine filter applied',             'engagement',  false),
  ('tag_filter',           'Tag/vibe filter applied',            'engagement',  false),
  ('ai_recommendation_click','AI search result clicked',          'ai',          false),
  ('social_share',         'Share button tapped',                'engagement',  false),
  ('gallery_view',         'Photo gallery opened',               'engagement',  false),
  ('menu_view',            'Menu section scrolled into view',    'engagement',  false),
  ('map_view',             'Map section scrolled into view',     'engagement',  false),
  ('scroll_depth',         'Scroll milestone reached',           'engagement',  false),
  ('time_on_page',         'Time-on-page measurement',           'engagement',  false),
  ('save_restaurant',      'Restaurant saved to favourites',     'engagement',  false),
  ('load_more',            'Load more button clicked',           'engagement',  false)
ON CONFLICT (event_type) DO NOTHING;


-- ── RESTAURANT DAILY STATS ──────────────────────────────────
-- Pre-aggregated per-restaurant per-day metrics for fast dashboard queries
CREATE TABLE IF NOT EXISTS restaurant_daily_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  stat_date       DATE NOT NULL,
  profile_views   INTEGER DEFAULT 0,
  card_clicks     INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  website_clicks  INTEGER DEFAULT 0,
  messenger_clicks INTEGER DEFAULT 0,
  call_clicks     INTEGER DEFAULT 0,
  instagram_clicks INTEGER DEFAULT 0,
  facebook_clicks INTEGER DEFAULT 0,
  gallery_views   INTEGER DEFAULT 0,
  menu_views      INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  avg_time_seconds NUMERIC(8,2) DEFAULT 0,
  UNIQUE(restaurant_id, stat_date)
);

CREATE INDEX IF NOT EXISTS daily_stats_restaurant_idx ON restaurant_daily_stats(restaurant_id);
CREATE INDEX IF NOT EXISTS daily_stats_date_idx       ON restaurant_daily_stats(stat_date DESC);


-- ── PLATFORM METRICS ─────────────────────────────────────────
-- Global daily platform health snapshot
CREATE TABLE IF NOT EXISTS platform_metrics (
  metric_date      DATE PRIMARY KEY,
  total_events     INTEGER DEFAULT 0,
  unique_sessions  INTEGER DEFAULT 0,
  profile_views    INTEGER DEFAULT 0,
  conversions      INTEGER DEFAULT 0,
  new_restaurants  INTEGER DEFAULT 0,
  search_count     INTEGER DEFAULT 0,
  top_restaurant_id UUID REFERENCES restaurants(id),
  avg_ctr          NUMERIC(5,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS platform_metrics_date_idx ON platform_metrics(metric_date DESC);


-- ── SEARCH QUERIES LOG ──────────────────────────────────────
-- Tracks popular searches for AI training and SEO
CREATE TABLE IF NOT EXISTS search_queries (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query      TEXT NOT NULL,
  session_id TEXT,
  result_count INTEGER,
  clicked_slug TEXT,  -- which result was clicked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS search_queries_query_idx   ON search_queries(query);
CREATE INDEX IF NOT EXISTS search_queries_created_idx ON search_queries(created_at DESC);


-- ── FUNCTIONS ────────────────────────────────────────────────

-- Get restaurant performance summary for a date range
CREATE OR REPLACE FUNCTION get_restaurant_performance(
  p_restaurant_id UUID,
  p_days          INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_views     BIGINT,
  total_whatsapp  BIGINT,
  total_website   BIGINT,
  total_calls     BIGINT,
  total_conversions BIGINT,
  ctr_percent     NUMERIC,
  avg_daily_views NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(SUM(ae.profile_views),   0) AS total_views,
    COALESCE(SUM(ae.whatsapp_clicks), 0) AS total_whatsapp,
    COALESCE(SUM(ae.website_clicks),  0) AS total_website,
    COALESCE(SUM(ae.call_clicks),     0) AS total_calls,
    COALESCE(SUM(ae.whatsapp_clicks + ae.website_clicks + ae.call_clicks + ae.messenger_clicks), 0) AS total_conversions,
    CASE
      WHEN SUM(ae.profile_views) > 0
      THEN ROUND(SUM(ae.whatsapp_clicks + ae.website_clicks + ae.call_clicks)::NUMERIC
             / SUM(ae.profile_views)::NUMERIC * 100, 2)
      ELSE 0
    END AS ctr_percent,
    ROUND(AVG(ae.profile_views), 1) AS avg_daily_views
  FROM restaurant_daily_stats ae
  WHERE ae.restaurant_id = p_restaurant_id
    AND ae.stat_date >= CURRENT_DATE - p_days;
$$;


-- Get top N restaurants by a given metric
CREATE OR REPLACE FUNCTION get_top_restaurants(
  p_metric  TEXT DEFAULT 'profile_views',
  p_days    INTEGER DEFAULT 7,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE (
  restaurant_id UUID,
  name          TEXT,
  cuisine_type  TEXT,
  metric_value  BIGINT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.cuisine_type,
    COALESCE(
      CASE p_metric
        WHEN 'profile_views'   THEN SUM(s.profile_views)
        WHEN 'whatsapp_clicks' THEN SUM(s.whatsapp_clicks)
        WHEN 'website_clicks'  THEN SUM(s.website_clicks)
        WHEN 'total_conversions' THEN SUM(s.whatsapp_clicks + s.website_clicks + s.call_clicks)
        ELSE SUM(s.profile_views)
      END, 0
    ) AS metric_value
  FROM restaurants r
  LEFT JOIN restaurant_daily_stats s
    ON s.restaurant_id = r.id AND s.stat_date >= CURRENT_DATE - p_days
  WHERE r.is_active = TRUE
  GROUP BY r.id, r.name, r.cuisine_type
  ORDER BY metric_value DESC
  LIMIT p_limit;
END;
$$;


-- Aggregate daily stats from raw events (run as a scheduled job)
CREATE OR REPLACE FUNCTION aggregate_daily_stats(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO restaurant_daily_stats (
    restaurant_id, stat_date,
    profile_views, card_clicks, whatsapp_clicks, website_clicks,
    messenger_clicks, call_clicks, instagram_clicks, facebook_clicks,
    gallery_views, menu_views, unique_sessions
  )
  SELECT
    ae.restaurant_id,
    p_date,
    COUNT(*) FILTER (WHERE ae.event_type = 'profile_view'),
    COUNT(*) FILTER (WHERE ae.event_type = 'card_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'whatsapp_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'website_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'messenger_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'call_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'instagram_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'facebook_click'),
    COUNT(*) FILTER (WHERE ae.event_type = 'gallery_view'),
    COUNT(*) FILTER (WHERE ae.event_type = 'menu_view'),
    COUNT(DISTINCT ae.session_id)
  FROM analytics_events ae
  WHERE ae.restaurant_id IS NOT NULL
    AND ae.created_at::date = p_date
  GROUP BY ae.restaurant_id
  ON CONFLICT (restaurant_id, stat_date)
  DO UPDATE SET
    profile_views    = EXCLUDED.profile_views,
    card_clicks      = EXCLUDED.card_clicks,
    whatsapp_clicks  = EXCLUDED.whatsapp_clicks,
    website_clicks   = EXCLUDED.website_clicks,
    messenger_clicks = EXCLUDED.messenger_clicks,
    call_clicks      = EXCLUDED.call_clicks,
    instagram_clicks = EXCLUDED.instagram_clicks,
    facebook_clicks  = EXCLUDED.facebook_clicks,
    gallery_views    = EXCLUDED.gallery_views,
    menu_views       = EXCLUDED.menu_views,
    unique_sessions  = EXCLUDED.unique_sessions;
END;
$$;


-- ── VIEWS ────────────────────────────────────────────────────

-- Drop the old basic view and recreate with more metrics
DROP VIEW IF EXISTS restaurant_analytics;

CREATE VIEW restaurant_analytics AS
SELECT
  r.id,
  r.name,
  r.slug,
  r.cuisine_type,
  r.location,
  r.google_rating,
  r.is_featured,
  -- 7-day aggregates
  COALESCE(SUM(s.profile_views),    0)::INT AS views_7d,
  COALESCE(SUM(s.card_clicks),      0)::INT AS card_clicks_7d,
  COALESCE(SUM(s.whatsapp_clicks),  0)::INT AS whatsapp_7d,
  COALESCE(SUM(s.website_clicks),   0)::INT AS website_7d,
  COALESCE(SUM(s.call_clicks),      0)::INT AS calls_7d,
  COALESCE(SUM(s.unique_sessions),  0)::INT AS sessions_7d,
  COALESCE(SUM(s.whatsapp_clicks + s.website_clicks + s.call_clicks + s.messenger_clicks), 0)::INT AS total_conversions_7d,
  CASE
    WHEN SUM(s.profile_views) > 0
    THEN ROUND(SUM(s.whatsapp_clicks + s.website_clicks + s.call_clicks)::NUMERIC
           / SUM(s.profile_views) * 100, 2)
    ELSE 0
  END AS ctr_percent
FROM restaurants r
LEFT JOIN restaurant_daily_stats s
  ON s.restaurant_id = r.id AND s.stat_date >= CURRENT_DATE - 7
GROUP BY r.id, r.name, r.slug, r.cuisine_type, r.location, r.google_rating, r.is_featured
ORDER BY views_7d DESC;


-- Platform-level summary view
CREATE VIEW platform_summary AS
SELECT
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_active)  AS active_restaurants,
  COUNT(DISTINCT r.id) FILTER (WHERE r.is_featured) AS featured_restaurants,
  COALESCE(SUM(s.profile_views),   0)::BIGINT AS total_views_7d,
  COALESCE(SUM(s.whatsapp_clicks), 0)::BIGINT AS total_whatsapp_7d,
  COALESCE(SUM(s.website_clicks),  0)::BIGINT AS total_website_7d,
  COALESCE(SUM(s.unique_sessions), 0)::BIGINT AS unique_sessions_7d,
  CASE
    WHEN SUM(s.profile_views) > 0
    THEN ROUND(SUM(s.whatsapp_clicks + s.website_clicks + s.call_clicks)::NUMERIC
           / SUM(s.profile_views) * 100, 2)
    ELSE 0
  END AS platform_ctr_7d
FROM restaurants r
LEFT JOIN restaurant_daily_stats s
  ON s.restaurant_id = r.id AND s.stat_date >= CURRENT_DATE - 7;


-- ── RLS FOR NEW TABLES ───────────────────────────────────────
ALTER TABLE analytics_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_daily_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries          ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can insert their own session
CREATE POLICY "Anyone can insert sessions"
  ON analytics_sessions FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Anyone can update own session"
  ON analytics_sessions FOR UPDATE USING (TRUE);

-- Search queries: public insert
CREATE POLICY "Anyone can insert search queries"
  ON search_queries FOR INSERT WITH CHECK (TRUE);

-- Daily stats + platform metrics: read-only for now (admin reads via service key)
CREATE POLICY "Public can read daily stats"
  ON restaurant_daily_stats FOR SELECT USING (TRUE);
