-- ============================================================
-- YUMYUMPO — Migration 024 · Profile nationality + avatars bucket
--   1. Adds a mandatory `nationality` column to profiles.
--   2. Creates the `avatars` storage bucket (public-read) plus
--      RLS so a user can only write to their own folder. The app
--      already uploads avatars to this bucket — until now the
--      bucket/policies didn't exist, so uploads were failing.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT;

/* ── Avatars storage bucket ──────────────────────────────────
   Public-read so <img src> works without signed URLs. */
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

/* Anyone can view avatar images. */
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

/* A user can upload/replace/delete only files inside their own
   folder — path convention is `<user_id>/avatar.<ext>`, so the
   first path segment must equal their auth uid. */
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

SELECT pg_notify('pgrst', 'reload schema');
