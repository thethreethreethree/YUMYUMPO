-- ============================================================
-- YUMYUMPO — Migration 005 · Buzz Tier Indicator
-- Run AFTER migration-004-social.sql
-- ────────────────────────────────────────────────────────────
-- Adds a per-restaurant "buzz" tier derived from engagement signals
-- (saves, reactions, follows, views in the last 7 days).
-- Tiers are percentile-based so the indicator stays populated
-- even when total activity is low.
--   hot       → top 10%
--   trending  → top 30%
--   (null)    → rest
-- Frontend renders 🔥 Hot / 📈 Trending / nothing.
-- ============================================================

CREATE OR REPLACE FUNCTION restaurant_buzz_tiers()
RETURNS TABLE (
  restaurant_id UUID,
  slug          TEXT,
  buzz_score    NUMERIC,
  buzz_tier     TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH scored AS (
    SELECT
      r.id   AS restaurant_id,
      r.slug,
      (
        COALESCE((SELECT COUNT(*) FROM saved_places s
                  WHERE s.restaurant_id = r.id
                    AND s.created_at >= NOW() - INTERVAL '7 days'), 0) * 3
      + COALESCE((SELECT COUNT(*) FROM venue_reactions rx
                  WHERE rx.restaurant_id = r.id
                    AND rx.created_at >= NOW() - INTERVAL '7 days'), 0) * 2
      + COALESCE((SELECT COUNT(*) FROM venue_follows f
                  WHERE f.restaurant_id = r.id
                    AND f.created_at >= NOW() - INTERVAL '7 days'), 0) * 1
      + COALESCE((SELECT COUNT(*) FROM venue_history h
                  WHERE h.restaurant_id = r.id
                    AND h.viewed_at >= NOW() - INTERVAL '7 days'), 0) * 0.5
      )::NUMERIC AS buzz_score
    FROM restaurants r
    WHERE r.is_active = TRUE
  ),
  ranked AS (
    SELECT
      restaurant_id, slug, buzz_score,
      PERCENT_RANK() OVER (ORDER BY buzz_score) AS pct
    FROM scored
    WHERE buzz_score > 0
  )
  SELECT
    restaurant_id, slug, buzz_score,
    CASE
      WHEN pct >= 0.90 THEN 'hot'
      WHEN pct >= 0.70 THEN 'trending'
      ELSE NULL
    END AS buzz_tier
  FROM ranked
  WHERE pct >= 0.70;
$$;

GRANT EXECUTE ON FUNCTION restaurant_buzz_tiers() TO anon, authenticated;
