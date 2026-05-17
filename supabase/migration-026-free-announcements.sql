-- ============================================================
-- YUMYUMPO — Migration 026 · Free announcements (no fee)
-- YUMYUMPO is launching free of charge — no commercial
-- transactions. An announcement now goes live as soon as an
-- admin approves it; payment is no longer a gate.
--
-- The payment columns (price_php, payment_status, paid_at,
-- payment_method) are LEFT IN PLACE, dormant, so the paid
-- Premium tier can be reintroduced later without a schema change.
-- ============================================================

/* Publish purely on admin approval — drop the payment condition. */
CREATE OR REPLACE FUNCTION public.sync_announcement_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'approved');
  RETURN NEW;
END;
$$;

/* The trigger fired on UPDATE OF status, payment_status — keep it,
   payment_status changes are now harmless no-ops. */

/* Backfill: any announcement already approved but stuck behind the
   old payment gate should now be live. */
UPDATE venue_announcements
   SET is_published = TRUE,
       payment_status = 'waived'
 WHERE status = 'approved'
   AND is_published = FALSE;

SELECT pg_notify('pgrst', 'reload schema');
