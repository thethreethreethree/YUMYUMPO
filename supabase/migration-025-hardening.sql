-- ============================================================
-- YUMYUMPO — Migration 025 · Launch hardening
--   1. error_logs       — client-side error capture (monitoring)
--   2. admin_audit_log  — record of admin status/payment actions
--   3. Rate limiting    — triggers throttle abusive inserts on
--      restaurant_applications (public form) and order_requests.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. ERROR LOGS — JS posts caught errors here; admin reviews them.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message     TEXT,
  source      TEXT,          -- file / module
  url         TEXT,          -- page the error happened on
  user_agent  TEXT,
  stack       TEXT,
  context     JSONB
);

CREATE INDEX IF NOT EXISTS error_logs_created_idx ON error_logs (created_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

/* Anyone (even anon) may INSERT an error report — it's write-only
   telemetry. Nobody can read except admins. */
DROP POLICY IF EXISTS "Anyone can log an error" ON error_logs;
CREATE POLICY "Anyone can log an error" ON error_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins read error logs" ON error_logs;
CREATE POLICY "Admins read error logs" ON error_logs
  FOR SELECT TO authenticated
  USING (is_admin());


-- ─────────────────────────────────────────────────────────────
-- 2. ADMIN AUDIT LOG — who approved/rejected/charged what, when.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- e.g. 'application.approved'
  entity      TEXT NOT NULL,        -- table name
  entity_id   UUID,
  detail      JSONB
);

CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log (created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

/* Only admins can read it; rows are written by SECURITY DEFINER
   triggers (which bypass RLS), so no INSERT policy is needed. */
DROP POLICY IF EXISTS "Admins read audit log" ON admin_audit_log;
CREATE POLICY "Admins read audit log" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (is_admin());


/* Trigger: log status changes on restaurant_applications. */
CREATE OR REPLACE FUNCTION public.audit_application_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO admin_audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (auth.uid(), 'application.' || NEW.status, 'restaurant_applications', NEW.id,
            jsonb_build_object('restaurant_name', NEW.restaurant_name,
                               'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_application ON restaurant_applications;
CREATE TRIGGER trg_audit_application
  AFTER UPDATE OF status ON restaurant_applications
  FOR EACH ROW EXECUTE FUNCTION public.audit_application_change();


/* Trigger: log review + payment changes on venue_announcements. */
CREATE OR REPLACE FUNCTION public.audit_announcement_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO admin_audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (auth.uid(), 'announcement.' || NEW.status, 'venue_announcements', NEW.id,
            jsonb_build_object('title', NEW.title, 'from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO admin_audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (auth.uid(), 'announcement.payment_' || NEW.payment_status, 'venue_announcements', NEW.id,
            jsonb_build_object('title', NEW.title, 'price_php', NEW.price_php));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_announcement ON venue_announcements;
CREATE TRIGGER trg_audit_announcement
  AFTER UPDATE OF status, payment_status ON venue_announcements
  FOR EACH ROW EXECUTE FUNCTION public.audit_announcement_change();


-- ─────────────────────────────────────────────────────────────
-- 3. RATE LIMITING — throttle abusive inserts.
-- ─────────────────────────────────────────────────────────────

/* restaurant_applications: the public apply form. Block a repeat
   submission from the same email within 60s (double-click / spam)
   and cap at 5 per email per rolling 24h. */
CREATE OR REPLACE FUNCTION public.rate_limit_applications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_recent INT;
  v_day    INT;
BEGIN
  SELECT COUNT(*) INTO v_recent
    FROM restaurant_applications
   WHERE lower(contact_email) = lower(NEW.contact_email)
     AND created_at > NOW() - INTERVAL '60 seconds';
  IF v_recent > 0 THEN
    RAISE EXCEPTION 'You just submitted an application — please wait a moment before trying again.';
  END IF;

  SELECT COUNT(*) INTO v_day
    FROM restaurant_applications
   WHERE lower(contact_email) = lower(NEW.contact_email)
     AND created_at > NOW() - INTERVAL '24 hours';
  IF v_day >= 5 THEN
    RAISE EXCEPTION 'Too many applications from this email today. Please contact us directly.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rate_limit_applications ON restaurant_applications;
CREATE TRIGGER trg_rate_limit_applications
  BEFORE INSERT ON restaurant_applications
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_applications();


/* order_requests: signed-in only, but still throttle — block a
   repeat within 20s and cap at 10 per customer per rolling hour. */
CREATE OR REPLACE FUNCTION public.rate_limit_orders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_recent INT;
  v_hour   INT;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_recent
    FROM order_requests
   WHERE customer_id = NEW.customer_id
     AND created_at > NOW() - INTERVAL '20 seconds';
  IF v_recent > 0 THEN
    RAISE EXCEPTION 'You just sent an order request — give it a second before sending another.';
  END IF;

  SELECT COUNT(*) INTO v_hour
    FROM order_requests
   WHERE customer_id = NEW.customer_id
     AND created_at > NOW() - INTERVAL '1 hour';
  IF v_hour >= 10 THEN
    RAISE EXCEPTION 'Too many order requests in a short time. Please try again later.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rate_limit_orders ON order_requests;
CREATE TRIGGER trg_rate_limit_orders
  BEFORE INSERT ON order_requests
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_orders();


SELECT pg_notify('pgrst', 'reload schema');
