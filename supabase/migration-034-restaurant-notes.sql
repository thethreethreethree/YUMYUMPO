-- ============================================================
-- YUMYUMPO — Migration 034 · Restaurant internal notes
-- Free-text notes column on the restaurants table for the admin's
-- internal record (account manager observations, follow-ups,
-- onboarding context). Included in the per-restaurant export.
--
-- Read/write follows the existing "auth manage restaurants" policy
-- (migration-001-pathb): admins can edit it via the Restaurant
-- Stats tab. Public SELECT on the restaurants table excludes
-- nothing today, but a future hardening pass should restrict
-- restaurant_notes to admins — flagging in case it matters later.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS restaurant_notes TEXT;

COMMENT ON COLUMN restaurants.restaurant_notes IS
  'Admin-internal notes about this restaurant. Surfaced in the Restaurant Stats tab and included in the per-restaurant export.';

SELECT pg_notify('pgrst', 'reload schema');
