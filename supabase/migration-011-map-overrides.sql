-- ============================================================
-- YUMYUMPO — Migration 011 · Map embed + directions overrides
-- Lets owners paste a custom Google Maps embed URL and a custom
-- "Get Directions" link when our auto-geocoder mis-locates them.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS map_embed_url  TEXT,
  ADD COLUMN IF NOT EXISTS directions_url TEXT;

SELECT pg_notify('pgrst', 'reload schema');
