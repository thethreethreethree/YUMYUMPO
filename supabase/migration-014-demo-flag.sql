-- ============================================================
-- YUMYUMPO — Migration 014 · Demo flag
-- Lets us keep Maria's Kitchen in the DB as the canonical
-- reference page while excluding it from public surfaces
-- (Vibe Map, Discover, search) so visitors only ever see
-- real restaurants admins or owners have added.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS restaurants_is_demo_idx
  ON restaurants(is_demo) WHERE is_demo = TRUE;

-- Mark Maria's Kitchen as demo
UPDATE restaurants SET is_demo = TRUE WHERE slug = 'marias-kitchen';

-- Rebuild homepage_picks so the WHERE clause drops demo rows.
-- (Schema must match the original view's columns so client code
-- expecting `tags` still works.)
CREATE OR REPLACE VIEW homepage_picks AS
SELECT
  r.id, r.slug, r.name, r.tagline, r.description, r.cuisine_type,
  r.location, r.address, r.google_rating, r.review_count,
  r.cover_image_url, r.logo_image_url, r.website_url,
  r.has_yumyumpo_site, r.is_featured, r.ai_summary, r.rank_label,
  r.created_at,
  COALESCE(
    (SELECT array_agg(tag_name) FROM restaurant_tags WHERE restaurant_id = r.id),
    '{}'::TEXT[]
  ) AS tags
FROM restaurants r
WHERE r.is_active = TRUE
  AND COALESCE(r.is_demo, FALSE) = FALSE;

GRANT SELECT ON homepage_picks TO anon, authenticated;

SELECT pg_notify('pgrst', 'reload schema');
