-- ============================================================
-- YUMYUMPO — Migration 004 · Social Discovery Layer
-- Run AFTER migration-003-follow.sql
-- ────────────────────────────────────────────────────────────
-- Adds the social-proof + collaborative recommendation layer:
--   1. people_also_saved()  — "users who saved X also saved Y"
--   2. trending_this_week() — restaurants with the most signals lately
--   3. activity_by_location() — "X people exploring [area] tonight"
--   4. set_reaction() — clean upsert for love/want-to-go/been-there
-- venue_reactions table already exists from migration-002.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1.  PEOPLE ALSO SAVED
--     Collaborative-filter: find the restaurants most frequently
--     saved by the same users who saved the target restaurant.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION people_also_saved(
  target_slug TEXT,
  p_limit     INTEGER DEFAULT 4
)
RETURNS TABLE (
  id           UUID,
  slug         TEXT,
  name         TEXT,
  cuisine_type TEXT,
  location     TEXT,
  google_rating NUMERIC,
  cover_image_url TEXT,
  co_save_count INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH target AS (
    SELECT id FROM restaurants WHERE slug = target_slug LIMIT 1
  ),
  target_savers AS (
    SELECT DISTINCT user_id
    FROM saved_places
    WHERE restaurant_id = (SELECT id FROM target)
  ),
  co_saves AS (
    SELECT sp.restaurant_id, COUNT(DISTINCT sp.user_id)::INTEGER AS cnt
    FROM saved_places sp
    JOIN target_savers ts ON ts.user_id = sp.user_id
    WHERE sp.restaurant_id != (SELECT id FROM target)
    GROUP BY sp.restaurant_id
  )
  SELECT
    r.id,
    r.slug,
    r.name,
    r.cuisine_type,
    r.location,
    r.google_rating,
    r.cover_image_url,
    cs.cnt AS co_save_count
  FROM co_saves cs
  JOIN restaurants r ON r.id = cs.restaurant_id
  WHERE r.is_active = TRUE
  ORDER BY cs.cnt DESC, r.google_rating DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION people_also_saved(TEXT, INTEGER) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 2.  TRENDING THIS WEEK
--     Weighted score across the last 7 days of activity:
--       + 3 per save
--       + 2 per reaction
--       + 1 per follow
--       + 0.5 per recorded view
--     Falls back to top-rated restaurants if no activity yet.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trending_this_week(p_limit INTEGER DEFAULT 8)
RETURNS TABLE (
  id              UUID,
  slug            TEXT,
  name            TEXT,
  cuisine_type    TEXT,
  location        TEXT,
  google_rating   NUMERIC,
  cover_image_url TEXT,
  has_yumyumpo_site BOOLEAN,
  website_url     TEXT,
  ai_summary      TEXT,
  trend_score     NUMERIC,
  signal_count    INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH activity AS (
    SELECT
      r.id,
      COALESCE((SELECT COUNT(*) FROM saved_places s
                WHERE s.restaurant_id = r.id
                  AND s.created_at >= NOW() - INTERVAL '7 days'), 0) AS saves,
      COALESCE((SELECT COUNT(*) FROM venue_reactions rx
                WHERE rx.restaurant_id = r.id
                  AND rx.created_at >= NOW() - INTERVAL '7 days'), 0) AS reactions,
      COALESCE((SELECT COUNT(*) FROM venue_follows f
                WHERE f.restaurant_id = r.id
                  AND f.created_at >= NOW() - INTERVAL '7 days'), 0) AS follows,
      COALESCE((SELECT COUNT(*) FROM venue_history h
                WHERE h.restaurant_id = r.id
                  AND h.viewed_at >= NOW() - INTERVAL '7 days'), 0) AS views
    FROM restaurants r
    WHERE r.is_active = TRUE
  )
  SELECT
    r.id, r.slug, r.name, r.cuisine_type, r.location,
    r.google_rating, r.cover_image_url, r.has_yumyumpo_site,
    r.website_url, r.ai_summary,
    /* Composite score */
    (a.saves * 3 + a.reactions * 2 + a.follows * 1 + a.views * 0.5
      + COALESCE(r.google_rating, 0) * 0.5)::NUMERIC AS trend_score,
    (a.saves + a.reactions + a.follows + a.views)::INTEGER AS signal_count
  FROM activity a
  JOIN restaurants r ON r.id = a.id
  ORDER BY trend_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION trending_this_week(INTEGER) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 3.  ACTIVITY BY LOCATION
--     "X people exploring [area] tonight" — counts distinct
--     users with a venue_history view in the last N hours,
--     grouped by location.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION activity_by_location(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  location      TEXT,
  active_users  INTEGER,
  venues_viewed INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    r.location,
    COUNT(DISTINCT h.user_id)::INTEGER       AS active_users,
    COUNT(DISTINCT h.restaurant_id)::INTEGER AS venues_viewed
  FROM venue_history h
  JOIN restaurants r ON r.id = h.restaurant_id
  WHERE h.viewed_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND r.location IS NOT NULL
  GROUP BY r.location
  HAVING COUNT(DISTINCT h.user_id) > 0
  ORDER BY active_users DESC;
$$;

GRANT EXECUTE ON FUNCTION activity_by_location(INTEGER) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4.  REACTIONS HELPER — set or remove a reaction
--     Returns the new state of all reactions for that venue.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_reaction(
  p_slug      TEXT,
  p_reaction  TEXT
)
RETURNS JSON
LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE
  v_user UUID := auth.uid();
  v_rest UUID;
  v_existing INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required to react.';
  END IF;
  IF p_reaction NOT IN ('love','want-to-go','been-there') THEN
    RAISE EXCEPTION 'Invalid reaction type.';
  END IF;

  SELECT id INTO v_rest FROM restaurants WHERE slug = p_slug;
  IF v_rest IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found.';
  END IF;

  /* Toggle: if user already has this reaction, remove it; else add it. */
  SELECT 1 INTO v_existing
  FROM venue_reactions
  WHERE user_id = v_user AND restaurant_id = v_rest AND reaction = p_reaction;

  IF v_existing IS NOT NULL THEN
    DELETE FROM venue_reactions
    WHERE user_id = v_user AND restaurant_id = v_rest AND reaction = p_reaction;
  ELSE
    INSERT INTO venue_reactions (user_id, restaurant_id, reaction)
    VALUES (v_user, v_rest, p_reaction);
  END IF;

  RETURN json_build_object(
    'love',       (SELECT COUNT(*) FROM venue_reactions WHERE restaurant_id = v_rest AND reaction = 'love'),
    'want_to_go', (SELECT COUNT(*) FROM venue_reactions WHERE restaurant_id = v_rest AND reaction = 'want-to-go'),
    'been_there', (SELECT COUNT(*) FROM venue_reactions WHERE restaurant_id = v_rest AND reaction = 'been-there'),
    'my_reactions',
      COALESCE((SELECT json_agg(reaction)
                FROM venue_reactions
                WHERE user_id = v_user AND restaurant_id = v_rest),
               '[]'::json)
  );
END $$;

GRANT EXECUTE ON FUNCTION set_reaction(TEXT, TEXT) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 5.  GET REACTIONS (public read) — counts + this user's reactions
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_reactions(p_slug TEXT)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'love',       COALESCE((SELECT COUNT(*) FROM venue_reactions rx
                            JOIN restaurants r ON r.id = rx.restaurant_id
                            WHERE r.slug = p_slug AND rx.reaction = 'love'), 0),
    'want_to_go', COALESCE((SELECT COUNT(*) FROM venue_reactions rx
                            JOIN restaurants r ON r.id = rx.restaurant_id
                            WHERE r.slug = p_slug AND rx.reaction = 'want-to-go'), 0),
    'been_there', COALESCE((SELECT COUNT(*) FROM venue_reactions rx
                            JOIN restaurants r ON r.id = rx.restaurant_id
                            WHERE r.slug = p_slug AND rx.reaction = 'been-there'), 0),
    'my_reactions',
      COALESCE((SELECT json_agg(rx.reaction)
                FROM venue_reactions rx
                JOIN restaurants r ON r.id = rx.restaurant_id
                WHERE r.slug = p_slug AND rx.user_id = auth.uid()),
               '[]'::json)
  );
$$;

GRANT EXECUTE ON FUNCTION get_reactions(TEXT) TO anon, authenticated;
