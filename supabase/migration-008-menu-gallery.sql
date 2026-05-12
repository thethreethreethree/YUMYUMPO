-- ============================================================
-- YUMYUMPO — Migration 008 · Menu item photo gallery (max 3 per item)
-- Run AFTER migration-007-owner-extras.sql
-- ============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

-- Backfill: if image_url already set, drop it into gallery_urls so the
-- owner dashboard shows it as the first photo.
UPDATE menu_items
   SET gallery_urls = ARRAY[image_url]
 WHERE image_url IS NOT NULL
   AND (gallery_urls IS NULL OR cardinality(gallery_urls) = 0);

SELECT pg_notify('pgrst', 'reload schema');
