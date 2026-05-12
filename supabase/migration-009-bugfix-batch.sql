-- ============================================================
-- YUMYUMPO — Migration 009 · Bugfix batch (audit findings)
-- Idempotent — safe to run anytime.
-- ============================================================

-- 1. Auto-claim trigger now fires on UPDATE too (was INSERT-only).
DROP TRIGGER IF EXISTS trg_claim_restaurants_on_profile_insert ON profiles;
CREATE TRIGGER trg_claim_restaurants_on_profile_insert
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION claim_pending_restaurants();

-- 2. Normalise any existing slugs to lowercase to keep URL lookups consistent.
UPDATE restaurants
   SET slug = lower(regexp_replace(slug, '[^a-zA-Z0-9-]', '-', 'g'))
 WHERE slug <> lower(slug);

-- 3. Reload PostgREST schema cache for the menu_items.gallery_urls column.
SELECT pg_notify('pgrst', 'reload schema');
