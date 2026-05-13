-- ============================================================
-- YUMYUMPO — Migration 012 · Admin uploads to restaurant-photos
-- The owner-scoped policy from migration-006 only lets the actual
-- owner upload. Admins (johnsy etc.) need write access too.
-- ============================================================

DROP POLICY IF EXISTS "owner upload own restaurant photos" ON storage.objects;
CREATE POLICY "owner upload own restaurant photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-photos'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM restaurants r
         WHERE r.owner_user_id = auth.uid()
           AND r.slug = split_part(storage.objects.name, '/', 1)
      )
    )
  );

DROP POLICY IF EXISTS "owner delete own restaurant photos" ON storage.objects;
CREATE POLICY "owner delete own restaurant photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'restaurant-photos'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM restaurants r
         WHERE r.owner_user_id = auth.uid()
           AND r.slug = split_part(storage.objects.name, '/', 1)
      )
    )
  );

SELECT pg_notify('pgrst', 'reload schema');
