-- ============================================================
-- YUMYUMPO — Migration 016 · Admin boost flag
-- Lets YUMYUMPO/admins force a restaurant to premium prominence
-- on the Vibe Map regardless of its computed score. Used for
-- editorial picks, paid placements, or new launches that haven't
-- accrued reviews yet.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS boost BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS restaurants_boost_idx
  ON restaurants(boost) WHERE boost = TRUE;

SELECT pg_notify('pgrst', 'reload schema');
