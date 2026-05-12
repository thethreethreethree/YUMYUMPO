-- ============================================================
-- YUMYUMPO — Migration 003 · Follow venues + announcements
-- Run AFTER migration-002-accounts.sql
-- ────────────────────────────────────────────────────────────
-- Adds the "subscribe to a venue's updates" layer:
--   1. venue_follows       — who follows which restaurant
--   2. venue_announcements — what restaurants post for their followers
--   3. venue_follower_stats view — follower counts per restaurant
--   4. RLS — public can follow; only admins can post announcements
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1.  VENUE FOLLOWS — one row per user × restaurant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_follows (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS venue_follows_user_idx       ON venue_follows(user_id);
CREATE INDEX IF NOT EXISTS venue_follows_restaurant_idx ON venue_follows(restaurant_id);


-- ─────────────────────────────────────────────────────────────
-- 2.  VENUE ANNOUNCEMENTS — events, promos, live music, etc.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_announcements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT,
  type          TEXT CHECK (type IN ('event','promo','live-music','happy-hour','menu','announcement')) DEFAULT 'announcement',
  link_url      TEXT,
  image_url     TEXT,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  is_published  BOOLEAN DEFAULT TRUE,
  posted_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venue_announcements_restaurant_idx ON venue_announcements(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS venue_announcements_published_idx  ON venue_announcements(is_published, created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 3.  FOLLOWER STATS VIEW
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW venue_follower_stats AS
SELECT
  r.id   AS restaurant_id,
  r.slug,
  COUNT(f.user_id)::INTEGER AS follower_count
FROM restaurants r
LEFT JOIN venue_follows f ON f.restaurant_id = r.id
WHERE r.is_active = TRUE
GROUP BY r.id, r.slug;

GRANT SELECT ON venue_follower_stats TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4.  FEED RPC — get all announcements from the venues this user follows
--     Returns latest first; bounded by `since` (default 60 days back).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_feed(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id            UUID,
  restaurant_id UUID,
  restaurant_slug TEXT,
  restaurant_name TEXT,
  restaurant_cover TEXT,
  title         TEXT,
  body          TEXT,
  type          TEXT,
  link_url      TEXT,
  image_url     TEXT,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    a.id,
    a.restaurant_id,
    r.slug              AS restaurant_slug,
    r.name              AS restaurant_name,
    r.cover_image_url   AS restaurant_cover,
    a.title,
    a.body,
    a.type,
    a.link_url,
    a.image_url,
    a.starts_at,
    a.ends_at,
    a.created_at
  FROM venue_announcements a
  JOIN restaurants r ON r.id = a.restaurant_id
  JOIN venue_follows f
    ON f.restaurant_id = a.restaurant_id
   AND f.user_id = auth.uid()
  WHERE a.is_published = TRUE
    AND r.is_active    = TRUE
    AND (a.ends_at IS NULL OR a.ends_at > NOW() - INTERVAL '7 days')
  ORDER BY COALESCE(a.starts_at, a.created_at) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_my_feed(INTEGER) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 5.  RLS — venue_follows
--     Anyone signed in can follow; users only see their own rows.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE venue_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own read follows" ON venue_follows;
CREATE POLICY "own read follows" ON venue_follows
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own write follows" ON venue_follows;
CREATE POLICY "own write follows" ON venue_follows
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 6.  RLS — venue_announcements
--     Public read of published; only admins create/update/delete.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE venue_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read published announcements" ON venue_announcements;
CREATE POLICY "public read published announcements" ON venue_announcements
  FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "admin manage announcements" ON venue_announcements;
CREATE POLICY "admin manage announcements" ON venue_announcements
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ─────────────────────────────────────────────────────────────
-- 7.  SEED a couple of demo announcements so the feed has content
--     immediately after migration. Idempotent.
-- ─────────────────────────────────────────────────────────────
INSERT INTO venue_announcements (restaurant_id, title, body, type, starts_at)
SELECT
  r.id,
  CASE r.slug
    WHEN 'sunset-grill'        THEN 'Live acoustic sets every Friday'
    WHEN 'izakaya-nori'        THEN 'New ramen on the menu — Spicy Miso Black'
    WHEN 'brew-and-bite'       THEN 'Buy one filter coffee, get one free this weekend'
    WHEN 'siargao-surf-kitchen' THEN 'Sunset bowls + DJ set every Saturday'
    WHEN 'fishermans-wharf'    THEN 'Beach bonfire night — Saturdays from 7pm'
  END AS title,
  CASE r.slug
    WHEN 'sunset-grill'        THEN 'Local acoustic guitarists every Friday from 7pm. No cover charge.'
    WHEN 'izakaya-nori'        THEN 'Rich tonkotsu base with charred miso, a slow-poached egg, and the heat of black garlic chili oil. Limited to 30 bowls a night.'
    WHEN 'brew-and-bite'       THEN 'All filter brews, all weekend — Saturday + Sunday until close. Walk-ins welcome.'
    WHEN 'siargao-surf-kitchen' THEN 'Acai bowls, fresh smoothies, and an open-air DJ set every Saturday from 4pm. Bring the dog.'
    WHEN 'fishermans-wharf'    THEN 'Bonfires, fresh-caught squid on the grill, cold beers, and stargazing. Every Saturday rain or shine.'
  END AS body,
  CASE r.slug
    WHEN 'sunset-grill'        THEN 'live-music'
    WHEN 'izakaya-nori'        THEN 'menu'
    WHEN 'brew-and-bite'       THEN 'promo'
    WHEN 'siargao-surf-kitchen' THEN 'event'
    WHEN 'fishermans-wharf'    THEN 'event'
  END AS type,
  CASE r.slug
    WHEN 'sunset-grill'        THEN NOW() + INTERVAL '2 days'
    WHEN 'izakaya-nori'        THEN NOW() - INTERVAL '1 day'
    WHEN 'brew-and-bite'       THEN NOW()
    WHEN 'siargao-surf-kitchen' THEN NOW() + INTERVAL '3 days'
    WHEN 'fishermans-wharf'    THEN NOW() + INTERVAL '4 days'
  END AS starts_at
FROM restaurants r
WHERE r.slug IN ('sunset-grill','izakaya-nori','brew-and-bite','siargao-surf-kitchen','fishermans-wharf')
ON CONFLICT DO NOTHING;
