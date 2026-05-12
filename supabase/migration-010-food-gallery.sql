-- ============================================================
-- YUMYUMPO — Migration 010 · Food gallery on restaurants
-- Adds a second gallery column for plated food shots (separate
-- from the venue gallery_urls). Maria's Kitchen has 6 food photos.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS food_gallery_urls TEXT[] DEFAULT '{}';

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS price_note TEXT;

-- Owner can manage their own restaurant_tags (vibe tags).
DROP POLICY IF EXISTS "owner manage restaurant_tags" ON restaurant_tags;
CREATE POLICY "owner manage restaurant_tags" ON restaurant_tags
  FOR ALL TO authenticated
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));

SELECT pg_notify('pgrst', 'reload schema');
