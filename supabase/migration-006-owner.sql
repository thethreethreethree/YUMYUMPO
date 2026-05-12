-- ============================================================
-- YUMYUMPO — Migration 006 · Restaurant Owner Claim + Edit
-- Run AFTER migration-005-buzz.sql
-- ────────────────────────────────────────────────────────────
-- Lets a restaurant owner sign in and edit their own listing.
--   1. owner_user_id + owner_email columns on restaurants
--   2. RLS policy: owner can SELECT/UPDATE their own restaurant
--   3. Auto-claim on signup: when a profile is created with an
--      email that matches restaurants.owner_email, we link them.
--   4. Storage bucket `restaurant-photos` + owner-scoped policies.
-- ============================================================


-- ── 1. SCHEMA ──────────────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_email   TEXT;

CREATE INDEX IF NOT EXISTS restaurants_owner_user_idx  ON restaurants(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS restaurants_owner_email_idx ON restaurants(lower(owner_email)) WHERE owner_email IS NOT NULL;


-- ── 2. RLS — owner can read + update their own restaurant ──
DROP POLICY IF EXISTS "owner read own restaurant"   ON restaurants;
CREATE POLICY "owner read own restaurant" ON restaurants
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "owner update own restaurant" ON restaurants;
CREATE POLICY "owner update own restaurant" ON restaurants
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());


-- ── 3. AUTO-CLAIM ON SIGNUP ────────────────────────────────
-- Whenever a profile is inserted/updated with an email, attach
-- it to any matching restaurant that's been pre-assigned by an
-- admin via owner_email.
CREATE OR REPLACE FUNCTION claim_pending_restaurants()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE restaurants
     SET owner_user_id = NEW.id,
         updated_at    = NOW()
   WHERE owner_user_id IS NULL
     AND lower(owner_email) = lower(NEW.email);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_claim_restaurants_on_profile_insert ON profiles;
CREATE TRIGGER trg_claim_restaurants_on_profile_insert
  AFTER INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW EXECUTE FUNCTION claim_pending_restaurants();


-- ── 4. HELPER — fetch my owned restaurant (for owner dashboard)
CREATE OR REPLACE FUNCTION get_my_restaurant()
RETURNS SETOF restaurants
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM restaurants WHERE owner_user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_my_restaurant() TO authenticated;


-- ── 5. STORAGE BUCKET — owner photo uploads ────────────────
-- (Idempotent — safe to re-run.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-photos', 'restaurant-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read photos
DROP POLICY IF EXISTS "public read restaurant photos" ON storage.objects;
CREATE POLICY "public read restaurant photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'restaurant-photos');

-- Owners can upload to folder named with their restaurant slug
-- Object path format: <restaurant-slug>/<filename>
DROP POLICY IF EXISTS "owner upload own restaurant photos" ON storage.objects;
CREATE POLICY "owner upload own restaurant photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-photos'
    AND EXISTS (
      SELECT 1 FROM restaurants r
       WHERE r.owner_user_id = auth.uid()
         AND r.slug = split_part(storage.objects.name, '/', 1)
    )
  );

DROP POLICY IF EXISTS "owner delete own restaurant photos" ON storage.objects;
CREATE POLICY "owner delete own restaurant photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'restaurant-photos'
    AND EXISTS (
      SELECT 1 FROM restaurants r
       WHERE r.owner_user_id = auth.uid()
         AND r.slug = split_part(storage.objects.name, '/', 1)
    )
  );

-- Admins can manage everything in the bucket
DROP POLICY IF EXISTS "admin manage restaurant photos" ON storage.objects;
CREATE POLICY "admin manage restaurant photos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'restaurant-photos' AND is_admin())
  WITH CHECK (bucket_id = 'restaurant-photos' AND is_admin());
