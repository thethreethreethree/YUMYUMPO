-- ============================================================
-- YUMYUMPO — Migration 017 · Honest homepage stats
-- Three fixes to get_homepage_stats():
--   1. Exclude demo restaurants from "Restaurants Listed" and
--      "Cities Covered" — only real venues count publicly.
--   2. Replace `total_applications` with `happy_travelers` —
--      distinct visitors (session_ids) tracked in the last 30 days
--      via analytics_events. Honest proxy for engaged users.
--   3. Discoveries (30d) now uses analytics_events.profile_view too
--      so it doesn't depend on restaurant_daily_stats being populated.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_homepage_stats();

CREATE OR REPLACE FUNCTION public.get_homepage_stats()
RETURNS TABLE (
  active_restaurants     INTEGER,
  total_cities           INTEGER,
  total_discoveries_30d  INTEGER,
  happy_travelers        INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER
       FROM restaurants
      WHERE is_active = TRUE
        AND COALESCE(is_demo, FALSE) = FALSE),

    (SELECT COUNT(DISTINCT
              -- Group by the first segment of `location` so "El Nido, Palawan"
              -- and "El Nido" don't double-count.
              trim(split_part(location, ',', 1))
            )::INTEGER
       FROM restaurants
      WHERE is_active = TRUE
        AND COALESCE(is_demo, FALSE) = FALSE
        AND location IS NOT NULL),

    (SELECT COUNT(*)::INTEGER
       FROM analytics_events
      WHERE event_type = 'profile_view'
        AND created_at >= NOW() - INTERVAL '30 days'),

    (SELECT COUNT(DISTINCT session_id)::INTEGER
       FROM analytics_events
      WHERE session_id IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days');
$$;

GRANT EXECUTE ON FUNCTION public.get_homepage_stats() TO anon, authenticated;

SELECT pg_notify('pgrst', 'reload schema');
