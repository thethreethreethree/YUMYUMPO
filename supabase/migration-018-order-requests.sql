-- ============================================================
-- YUMYUMPO — Migration 018 · Order Requests
-- A request-not-an-order system. Customer asks → restaurant
-- accepts/denies/quotes → customer pays off-platform.
--
-- Order activity also feeds the buzz scoring (migration 019).
-- ============================================================

-- 1. Per-restaurant order-availability toggle
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS accepting_orders BOOLEAN DEFAULT TRUE;

-- 2. order_requests table
CREATE TABLE IF NOT EXISTS order_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  /* Opaque token the customer can use to read their own order
     without being signed in on that exact device. */
  tracking_token    TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),

  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  /* Customer-supplied details */
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT,
  customer_email    TEXT,
  delivery_method   TEXT CHECK (delivery_method IN ('pickup','delivery','dinein')) DEFAULT 'pickup',
  delivery_address  TEXT,
  preferred_time    TEXT,                -- e.g. "ASAP" / "today 7pm" / ISO timestamp
  allergens         TEXT[] DEFAULT '{}', -- ["peanuts","gluten",...]
  notes             TEXT,                -- free-text additional notes

  /* Order body: each item = {menu_item_id?, name, qty, price?} */
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,

  /* Workflow */
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','acknowledged','quoted','accepted','denied','completed','paid')),
  quoted_total      NUMERIC(10,2),       -- restaurant-supplied price
  owner_message     TEXT,                -- "will get back to you shortly" / quote details / denial reason

  /* Timestamps for analytics */
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at   TIMESTAMPTZ,
  quoted_at         TIMESTAMPTZ,
  accepted_at       TIMESTAMPTZ,
  denied_at         TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS order_requests_restaurant_idx ON order_requests(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_requests_customer_idx   ON order_requests(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_requests_status_idx     ON order_requests(status) WHERE status IN ('pending','acknowledged','quoted','accepted');
CREATE INDEX IF NOT EXISTS order_requests_token_idx      ON order_requests(tracking_token);


-- 3. RLS — granular access
ALTER TABLE order_requests ENABLE ROW LEVEL SECURITY;

-- Customer (signed in) can read their own orders
DROP POLICY IF EXISTS "customer read own orders" ON order_requests;
CREATE POLICY "customer read own orders" ON order_requests
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- Owner reads orders for their restaurant
DROP POLICY IF EXISTS "owner read restaurant orders" ON order_requests;
CREATE POLICY "owner read restaurant orders" ON order_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM restaurants r
     WHERE r.id = order_requests.restaurant_id
       AND (r.owner_user_id = auth.uid() OR is_admin())
  ));

-- Anyone signed-in can submit an order (validated by RPC, see below)
DROP POLICY IF EXISTS "auth submit orders" ON order_requests;
CREATE POLICY "auth submit orders" ON order_requests
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Owner updates orders for their restaurant
DROP POLICY IF EXISTS "owner update restaurant orders" ON order_requests;
CREATE POLICY "owner update restaurant orders" ON order_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM restaurants r
     WHERE r.id = order_requests.restaurant_id
       AND (r.owner_user_id = auth.uid() OR is_admin())
  ));

-- Customer can mark their own order paid
DROP POLICY IF EXISTS "customer mark paid" ON order_requests;
CREATE POLICY "customer mark paid" ON order_requests
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());


-- 4. RPC: submit an order request (one transaction)
CREATE OR REPLACE FUNCTION public.submit_order_request(payload JSONB)
RETURNS TABLE (id UUID, tracking_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_restaurant_id UUID := (payload->>'restaurant_id')::UUID;
  v_user UUID := auth.uid();
  v_can BOOLEAN;
  v_id UUID;
  v_token TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to place an order request';
  END IF;
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id required';
  END IF;
  /* Premium gate + accepting-orders gate. */
  SELECT (has_yumyumpo_site IS TRUE AND COALESCE(accepting_orders, TRUE) IS TRUE AND is_active IS TRUE)
    INTO v_can
    FROM restaurants WHERE id = v_restaurant_id;
  IF NOT v_can THEN
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
GRANT EXECUTE ON FUNCTION public.submit_order_request(JSONB) TO authenticated;


-- 5. RPC: owner updates order status / quote / message
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id    UUID,
  p_new_status  TEXT,
  p_quoted      NUMERIC DEFAULT NULL,
  p_message     TEXT    DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_can BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM order_requests o
       JOIN restaurants r ON r.id = o.restaurant_id
      WHERE o.id = p_order_id
        AND (r.owner_user_id = auth.uid() OR is_admin())
  ) INTO v_can;
  IF NOT v_can THEN
    RAISE EXCEPTION 'Not allowed to update this order';
  END IF;

  IF p_new_status NOT IN ('pending','acknowledged','quoted','accepted','denied','completed','paid') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE order_requests SET
    status          = p_new_status,
    quoted_total    = COALESCE(p_quoted, quoted_total),
    owner_message   = COALESCE(p_message, owner_message),
    acknowledged_at = CASE WHEN p_new_status = 'acknowledged' AND acknowledged_at IS NULL THEN NOW() ELSE acknowledged_at END,
    quoted_at       = CASE WHEN p_new_status = 'quoted'       AND quoted_at       IS NULL THEN NOW() ELSE quoted_at       END,
    accepted_at     = CASE WHEN p_new_status = 'accepted'     AND accepted_at     IS NULL THEN NOW() ELSE accepted_at     END,
    denied_at       = CASE WHEN p_new_status = 'denied'       AND denied_at       IS NULL THEN NOW() ELSE denied_at       END,
    completed_at    = CASE WHEN p_new_status = 'completed'    AND completed_at    IS NULL THEN NOW() ELSE completed_at    END,
    paid_at         = CASE WHEN p_new_status = 'paid'         AND paid_at         IS NULL THEN NOW() ELSE paid_at         END
  WHERE id = p_order_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, NUMERIC, TEXT) TO authenticated;


-- 6. Per-restaurant analytics view (owner dashboard)
CREATE OR REPLACE VIEW restaurant_order_analytics AS
SELECT
  r.id                                AS restaurant_id,
  r.slug,
  COUNT(o.id)                         AS total_requests,
  COUNT(o.id) FILTER (WHERE o.status IN ('accepted','completed','paid')) AS accepted,
  COUNT(o.id) FILTER (WHERE o.status = 'denied')                          AS denied,
  COUNT(o.id) FILTER (WHERE o.status = 'paid')                            AS paid,
  /* Conversion rate, average response time in minutes, average order value. */
  ROUND(100.0 * COUNT(o.id) FILTER (WHERE o.status IN ('accepted','completed','paid'))
              / NULLIF(COUNT(o.id), 0), 1)                                AS accept_pct,
  ROUND(AVG(EXTRACT(EPOCH FROM (o.acknowledged_at - o.created_at))/60.0)
        FILTER (WHERE o.acknowledged_at IS NOT NULL), 1)                  AS avg_response_min,
  ROUND(AVG(o.quoted_total) FILTER (WHERE o.quoted_total IS NOT NULL), 2) AS avg_order_value,
  MAX(o.created_at)                                                       AS last_request_at
FROM restaurants r
LEFT JOIN order_requests o ON o.restaurant_id = r.id
GROUP BY r.id, r.slug;

GRANT SELECT ON restaurant_order_analytics TO authenticated;


SELECT pg_notify('pgrst', 'reload schema');
