-- ============================================================
-- YUMYUMPO — Migration 023 · Owner-requested announcements
-- Restaurant owners can request announcements; admin approves +
-- collects payment. Scaffolds payment columns for later online
-- gateway integration (Stripe/GCash). For v1, payment is manual
-- (offline GCash/bank transfer, admin marks paid).
--
-- Flow:
--   1. Owner submits → status='pending', payment_status='unpaid'
--   2. Admin reviews → status='approved' (or 'rejected')
--   3. Admin records payment → payment_status='paid'
--   4. Trigger flips is_published=TRUE once approved+paid (or waived)
-- ============================================================

ALTER TABLE venue_announcements
  ADD COLUMN IF NOT EXISTS status          TEXT    NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS requested_by    UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes     TEXT,
  ADD COLUMN IF NOT EXISTS price_php       INTEGER NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS payment_status  TEXT    NOT NULL DEFAULT 'waived'
    CHECK (payment_status IN ('unpaid','paid','waived')),
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method  TEXT;

/* Backfill: existing admin-posted rows are already approved+waived
   by virtue of the column defaults. Nothing to do for historical data. */

CREATE INDEX IF NOT EXISTS venue_announcements_status_idx
  ON venue_announcements (status, payment_status, created_at DESC);


/* ----------------------------------------------------------
   Trigger: keep is_published in sync with status+payment.
   An announcement is publicly visible only when admin has
   approved it AND payment has been received (or waived).
---------------------------------------------------------- */
CREATE OR REPLACE FUNCTION public.sync_announcement_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'approved' AND NEW.payment_status IN ('paid','waived'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_announcement_published ON venue_announcements;
CREATE TRIGGER trg_sync_announcement_published
  BEFORE INSERT OR UPDATE OF status, payment_status ON venue_announcements
  FOR EACH ROW EXECUTE FUNCTION public.sync_announcement_published();


/* ----------------------------------------------------------
   RLS: owners can manage announcements for their own restaurant.
   Admin policies from migration 003 already cover admin path.
---------------------------------------------------------- */

/* Owner can SELECT all rows for their own restaurant (any status). */
DROP POLICY IF EXISTS "Owners read own announcements" ON venue_announcements;
CREATE POLICY "Owners read own announcements" ON venue_announcements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = venue_announcements.restaurant_id
        AND r.owner_user_id = auth.uid()
    )
  );

/* Owner can INSERT only for their own restaurant, only as pending+unpaid.
   The CHECK keeps owners from bypassing approval/payment by setting
   status='approved' or payment_status='waived' themselves. */
DROP POLICY IF EXISTS "Owners insert own announcements" ON venue_announcements;
CREATE POLICY "Owners insert own announcements" ON venue_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = venue_announcements.restaurant_id
        AND r.owner_user_id = auth.uid()
    )
    AND status = 'pending'
    AND payment_status = 'unpaid'
  );

/* Owner can DELETE their own announcements only while still pending
   (so they can withdraw a request before admin reviews it). */
DROP POLICY IF EXISTS "Owners delete own pending announcements" ON venue_announcements;
CREATE POLICY "Owners delete own pending announcements" ON venue_announcements
  FOR DELETE TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = venue_announcements.restaurant_id
        AND r.owner_user_id = auth.uid()
    )
  );


/* ----------------------------------------------------------
   Admin RPCs for review + payment workflow.
---------------------------------------------------------- */

CREATE OR REPLACE FUNCTION public.review_announcement(
  p_id          UUID,
  p_decision    TEXT,     -- 'approved' or 'rejected'
  p_notes       TEXT DEFAULT NULL,
  p_price_php   INTEGER DEFAULT NULL
)
RETURNS venue_announcements
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row venue_announcements%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected';
  END IF;

  UPDATE venue_announcements
     SET status      = p_decision,
         admin_notes = COALESCE(p_notes, admin_notes),
         price_php   = COALESCE(p_price_php, price_php),
         reviewed_by = auth.uid(),
         reviewed_at = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_announcement(UUID, TEXT, TEXT, INTEGER) TO authenticated;


CREATE OR REPLACE FUNCTION public.record_announcement_payment(
  p_id      UUID,
  p_status  TEXT,           -- 'paid' or 'waived' or 'unpaid'
  p_method  TEXT DEFAULT NULL
)
RETURNS venue_announcements
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_row venue_announcements%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('unpaid','paid','waived') THEN
    RAISE EXCEPTION 'payment_status must be unpaid, paid, or waived';
  END IF;

  UPDATE venue_announcements
     SET payment_status = p_status,
         payment_method = COALESCE(p_method, payment_method),
         paid_at        = CASE WHEN p_status = 'paid' THEN NOW() ELSE paid_at END
   WHERE id = p_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_announcement_payment(UUID, TEXT, TEXT) TO authenticated;


SELECT pg_notify('pgrst', 'reload schema');
