-- ============================================================
-- YUMYUMPO — Migration 019 · Buzz tier weights orders
-- Order activity is the strongest demand signal we have. Rebuild
-- restaurant_buzz_tiers() so orders dominate the score:
--   saves          ×3
--   reactions      ×2
--   follows        ×1
--   views          ×0.5
--   ORDER REQUEST  ×4   (intent)
--   ORDER ACCEPTED ×6   (validated demand)
--   ORDER PAID     ×10  (real money)
-- ============================================================

CREATE OR REPLACE FUNCTION public.restaurant_buzz_tiers()
RETURNS TABLE (
  restaurant_id UUID,
  slug          TEXT,
  buzz_score    NUMERIC,
  buzz_tier     TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
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
      /* Order intent — submitted in last 7d. */
      + COALESCE((SELECT COUNT(*) FROM order_requests o
                  WHERE o.restaurant_id = r.id
                    AND o.created_at >= NOW() - INTERVAL '7 days'), 0) * 4
      /* Order validation — accepted by owner. */
      + COALESCE((SELECT COUNT(*) FROM order_requests o
                  WHERE o.restaurant_id = r.id
                    AND o.accepted_at IS NOT NULL
                    AND o.accepted_at >= NOW() - INTERVAL '7 days'), 0) * 6
      /* Real-money signal — customer marked paid. */
      + COALESCE((SELECT COUNT(*) FROM order_requests o
                  WHERE o.restaurant_id = r.id
                    AND o.paid_at IS NOT NULL
                    AND o.paid_at >= NOW() - INTERVAL '7 days'), 0) * 10
      )::NUMERIC AS buzz_score
    FROM restaurants r
    WHERE r.is_active = TRUE
      AND COALESCE(r.is_demo, FALSE) = FALSE
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

GRANT EXECUTE ON FUNCTION public.restaurant_buzz_tiers() TO anon, authenticated;

SELECT pg_notify('pgrst', 'reload schema');
