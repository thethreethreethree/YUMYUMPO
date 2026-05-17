-- ============================================================
-- YUMYUMPO — Migration 031 · Promotion overlap cap
-- The homepage has 3 promo slots, so no more than 3 APPROVED
-- promotions may run in any overlapping time window — across all
-- restaurants. A request whose window would be the 4th is hard-
-- blocked, both when an owner submits and when an admin approves.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_promo_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_overlaps INT;
  v_s TIMESTAMPTZ;
  v_e TIMESTAMPTZ;
BEGIN
  /* Only rows competing for a live slot matter: a new pending
     request, or a row being approved. Anything else is exempt. */
  IF NEW.status NOT IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  /* On UPDATE, skip the check unless status or the window changed. */
  IF TG_OP = 'UPDATE'
     AND NEW.status   IS NOT DISTINCT FROM OLD.status
     AND NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at
     AND NEW.ends_at   IS NOT DISTINCT FROM OLD.ends_at THEN
    RETURN NEW;
  END IF;

  v_s := COALESCE(NEW.starts_at, NOW());
  v_e := COALESCE(NEW.ends_at, v_s + INTERVAL '100 years');

  /* Count OTHER already-approved promos whose window overlaps. */
  SELECT COUNT(*) INTO v_overlaps
  FROM venue_announcements a
  WHERE a.id <> NEW.id
    AND a.status = 'approved'
    AND COALESCE(a.starts_at, NOW()) < v_e
    AND COALESCE(a.ends_at, COALESCE(a.starts_at, NOW()) + INTERVAL '100 years') > v_s;

  IF v_overlaps >= 3 THEN
    RAISE EXCEPTION 'PROMO_SLOT_FULL: Three promotions already run during this time window. Please choose a different date or time.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_promo_cap ON venue_announcements;
CREATE TRIGGER trg_enforce_promo_cap
  BEFORE INSERT OR UPDATE OF status, starts_at, ends_at ON venue_announcements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_promo_cap();


/* Helper the owner form calls before submitting, so it can warn /
   block in the UI without waiting for the insert to fail. Returns
   the number of approved promos overlapping the given window. */
CREATE OR REPLACE FUNCTION public.count_overlapping_promos(
  p_starts TIMESTAMPTZ,
  p_ends   TIMESTAMPTZ
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM venue_announcements a
  WHERE a.status = 'approved'
    AND COALESCE(a.starts_at, NOW()) < COALESCE(p_ends, p_starts + INTERVAL '100 years')
    AND COALESCE(a.ends_at, COALESCE(a.starts_at, NOW()) + INTERVAL '100 years') > p_starts;
$$;

GRANT EXECUTE ON FUNCTION public.count_overlapping_promos(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
