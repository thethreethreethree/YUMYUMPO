-- ============================================================
-- YUMYUMPO — Migration 020 · Order Request hardening
-- Three security/functional fixes from the audit:
--   1. Customer UPDATE policy was too permissive (could change
--      status/items/quoted_total). Replace with a narrow
--      mark_order_paid() RPC. Customer can no longer UPDATE
--      directly.
--   2. Guest tracking links didn't work because there was no
--      anon SELECT policy. Add get_order_by_token() RPC that
--      returns the row by token, bypassing RLS safely.
--   3. submit_order_request distinguishes "not found" from
--      "not accepting orders" for better UX.
-- ============================================================

-- 1) Remove the broad customer-UPDATE policy
DROP POLICY IF EXISTS "customer mark paid" ON order_requests;


-- 2) Narrow RPC: customer marks their own order paid
CREATE OR REPLACE FUNCTION public.mark_order_paid(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner UUID;
  v_status TEXT;
BEGIN
  SELECT customer_id, status INTO v_owner, v_status
    FROM order_requests WHERE id = p_order_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not your order';
  END IF;
  IF v_status NOT IN ('quoted','accepted','completed') THEN
    RAISE EXCEPTION 'Order must be quoted/accepted before it can be marked paid';
  END IF;
  UPDATE order_requests
     SET status = 'paid', paid_at = NOW()
   WHERE id = p_order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(UUID) TO authenticated;


-- 3) Public RPC that returns one order by tracking_token. Anon-readable
-- so a shareable link works without a session, but only when the caller
-- presents the unguessable token (18 random bytes / hex).
CREATE OR REPLACE FUNCTION public.get_order_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  status TEXT,
  items JSONB,
  delivery_method TEXT,
  delivery_address TEXT,
  preferred_time TEXT,
  allergens TEXT[],
  notes TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  quoted_total NUMERIC,
  owner_message TEXT,
  created_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  quoted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  tracking_token TEXT,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  restaurant_cover TEXT,
  restaurant_whatsapp TEXT,
  restaurant_phone TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    o.id, o.status, o.items, o.delivery_method, o.delivery_address,
    o.preferred_time, o.allergens, o.notes,
    o.customer_name, o.customer_phone, o.customer_email,
    o.quoted_total, o.owner_message,
    o.created_at, o.acknowledged_at, o.quoted_at, o.accepted_at,
    o.denied_at, o.completed_at, o.paid_at,
    o.tracking_token, o.restaurant_id,
    r.name, r.slug, r.cover_image_url, r.whatsapp_url, r.phone
  FROM order_requests o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.tracking_token = p_token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT) TO anon, authenticated;


-- 4) Update submit_order_request to distinguish "not found" vs. "not accepting"
CREATE OR REPLACE FUNCTION public.submit_order_request(payload JSONB)
RETURNS TABLE (id UUID, tracking_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_restaurant_id UUID := (payload->>'restaurant_id')::UUID;
  v_user UUID := auth.uid();
  v_premium BOOLEAN;
  v_accepting BOOLEAN;
  v_active BOOLEAN;
  v_id UUID;
  v_token TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to place an order request';
  END IF;
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id required';
  END IF;

  SELECT has_yumyumpo_site, COALESCE(accepting_orders, TRUE), is_active
    INTO v_premium, v_accepting, v_active
    FROM restaurants WHERE id = v_restaurant_id;

  IF v_premium IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;
  IF NOT v_active THEN
    RAISE EXCEPTION 'This restaurant is not currently active.';
  END IF;
  IF NOT v_premium THEN
    RAISE EXCEPTION 'Order requests are only available for Premium listings.';
  END IF;
  IF NOT v_accepting THEN
    RAISE EXCEPTION 'This restaurant is not accepting order requests right now.';
  END IF;

  INSERT INTO order_requests (
    restaurant_id, customer_id,
    customer_name, customer_phone, customer_email,
    delivery_method, delivery_address, preferred_time,
    allergens, notes, items
  ) VALUES (
    v_restaurant_id, v_user,
    COALESCE(NULLIF(payload->>'customer_name',''), 'Customer'),
    NULLIF(payload->>'customer_phone',''),
    NULLIF(payload->>'customer_email',''),
    COALESCE(NULLIF(payload->>'delivery_method',''), 'pickup'),
    NULLIF(payload->>'delivery_address',''),
    NULLIF(payload->>'preferred_time',''),
    CASE WHEN payload ? 'allergens'
         THEN ARRAY(SELECT jsonb_array_elements_text(payload->'allergens'))
         ELSE '{}'::TEXT[] END,
    NULLIF(payload->>'notes',''),
    COALESCE(payload->'items', '[]'::jsonb)
  )
  RETURNING order_requests.id, order_requests.tracking_token INTO v_id, v_token;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

SELECT pg_notify('pgrst', 'reload schema');
