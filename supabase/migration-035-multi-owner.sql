-- ============================================================
-- YUMYUMPO — Migration 035 · Multiple owners per restaurant
-- ────────────────────────────────────────────────────────────
-- The legacy restaurants.owner_user_id stays in place as the
-- "primary owner" (so existing single-owner code keeps working).
-- This migration adds a join table for additional co-owners and
-- rewrites every owner gate to honour both.
--
-- Permission rule from here on:
--   "is the caller the primary owner OR listed in restaurant_owners
--    OR an admin?" — wrapped in the is_restaurant_owner() helper.
-- ============================================================


-- ─── 1. Join table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_owners (
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'owner'
                CHECK (role IN ('owner', 'manager')),
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS restaurant_owners_user_idx
  ON restaurant_owners(user_id);

ALTER TABLE restaurant_owners ENABLE ROW LEVEL SECURITY;

-- Each user can see their own membership rows; admins see all.
DROP POLICY IF EXISTS "owners read own membership" ON restaurant_owners;
CREATE POLICY "owners read own membership" ON restaurant_owners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Only admins write membership rows (use admin_add_restaurant_owner /
-- admin_remove_restaurant_owner below for self-documenting calls).
DROP POLICY IF EXISTS "admins manage membership" ON restaurant_owners;
CREATE POLICY "admins manage membership" ON restaurant_owners
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ─── 2. Helper: is_restaurant_owner(restaurant_id) ─────────────
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM restaurants
             WHERE id = p_restaurant_id AND owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM restaurant_owners
                WHERE restaurant_id = p_restaurant_id AND user_id = auth.uid())
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_restaurant_owner(UUID) TO authenticated;


-- ─── 3. get_my_restaurant — primary OR co-owned ────────────────
-- Returns one restaurant so existing single-restaurant UI keeps
-- working. Primary ownership wins over co-ownership.
CREATE OR REPLACE FUNCTION public.get_my_restaurant()
RETURNS SETOF restaurants
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT r.* FROM restaurants r
   WHERE r.owner_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM restaurant_owners
                  WHERE restaurant_id = r.id AND user_id = auth.uid())
   ORDER BY (r.owner_user_id = auth.uid()) DESC, r.created_at
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_restaurant() TO authenticated;


-- ─── 4. get_my_restaurants — all restaurants the user can manage
CREATE OR REPLACE FUNCTION public.get_my_restaurants()
RETURNS SETOF restaurants
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT r.* FROM restaurants r
   WHERE r.owner_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM restaurant_owners
                  WHERE restaurant_id = r.id AND user_id = auth.uid())
   ORDER BY r.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_restaurants() TO authenticated;


-- ─── 5. save_restaurant_menu — co-owners can save ──────────────
CREATE OR REPLACE FUNCTION public.save_restaurant_menu(
  p_restaurant_id UUID,
  p_categories    JSONB
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_cat      JSONB;
  v_item     JSONB;
  v_cat_id   UUID;
  v_cat_idx  INT := 0;
  v_item_idx INT;
BEGIN
  IF NOT (is_restaurant_owner(p_restaurant_id) OR is_admin()) THEN
    RAISE EXCEPTION 'Not authorized to edit this menu';
  END IF;

  DELETE FROM menu_items      WHERE restaurant_id = p_restaurant_id;
  DELETE FROM menu_categories WHERE restaurant_id = p_restaurant_id;

  FOR v_cat IN SELECT * FROM jsonb_array_elements(COALESCE(p_categories, '[]'::jsonb))
  LOOP
    CONTINUE WHEN COALESCE(NULLIF(trim(v_cat->>'name'), ''), '') = '';

    INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (p_restaurant_id, trim(v_cat->>'name'), v_cat_idx)
    RETURNING id INTO v_cat_id;

    v_cat_idx  := v_cat_idx + 1;
    v_item_idx := 0;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_cat->'items', '[]'::jsonb))
    LOOP
      CONTINUE WHEN COALESCE(NULLIF(trim(v_item->>'name'), ''), '') = '';

      INSERT INTO menu_items (
        menu_category_id, restaurant_id,
        name, description, price, price_note,
        image_url, gallery_urls, tags, is_available, sort_order
      ) VALUES (
        v_cat_id, p_restaurant_id,
        trim(v_item->>'name'),
        NULLIF(trim(COALESCE(v_item->>'description','')), ''),
        NULLIF(trim(COALESCE(v_item->>'price','')), ''),
        NULLIF(trim(COALESCE(v_item->>'price_note','')), ''),
        NULLIF(trim(COALESCE(v_item->>'image_url','')), ''),
        CASE WHEN v_item ? 'gallery_urls'
             THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'gallery_urls'))
             ELSE '{}'::TEXT[] END,
        CASE WHEN v_item ? 'tags'
             THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'tags'))
             ELSE '{}'::TEXT[] END,
        COALESCE((v_item->>'is_available')::BOOLEAN, TRUE),
        v_item_idx
      );
      v_item_idx := v_item_idx + 1;
    END LOOP;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_restaurant_menu(UUID, JSONB) TO authenticated;


-- ─── 6. update_order_status — co-owners can manage orders ──────
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
  v_restaurant_id UUID;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
    FROM order_requests WHERE id = p_order_id;
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF NOT (is_restaurant_owner(v_restaurant_id) OR is_admin()) THEN
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


-- ─── 7. RLS — order_requests reads + updates for co-owners ─────
DROP POLICY IF EXISTS "owner read restaurant orders" ON order_requests;
CREATE POLICY "owner read restaurant orders" ON order_requests
  FOR SELECT TO authenticated
  USING (is_restaurant_owner(restaurant_id) OR is_admin());

DROP POLICY IF EXISTS "owner update restaurant orders" ON order_requests;
CREATE POLICY "owner update restaurant orders" ON order_requests
  FOR UPDATE TO authenticated
  USING (is_restaurant_owner(restaurant_id) OR is_admin());


-- ─── 8. Admin helpers to manage co-owners ──────────────────────
-- Add a co-owner by email. Returns the user_id linked.
CREATE OR REPLACE FUNCTION public.admin_add_restaurant_owner(
  p_restaurant_id UUID,
  p_email         TEXT,
  p_role          TEXT DEFAULT 'owner'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT id INTO v_user_id
    FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for %', p_email;
  END IF;

  INSERT INTO restaurant_owners (restaurant_id, user_id, role, added_by)
  VALUES (p_restaurant_id, v_user_id, COALESCE(p_role, 'owner'), auth.uid())
  ON CONFLICT (restaurant_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_restaurant_owner(UUID, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_remove_restaurant_owner(
  p_restaurant_id UUID,
  p_email         TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;
  DELETE FROM restaurant_owners
   WHERE restaurant_id = p_restaurant_id AND user_id = v_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_remove_restaurant_owner(UUID, TEXT) TO authenticated;


-- ─── 9. Backfill: legacy primary owners get a co-owner row too
-- (Idempotent — safe to re-run.) Keeps owner_user_id as the
-- canonical primary, while the join table becomes the membership
-- source of truth going forward.
INSERT INTO restaurant_owners (restaurant_id, user_id, role)
SELECT id, owner_user_id, 'owner'
  FROM restaurants
 WHERE owner_user_id IS NOT NULL
ON CONFLICT (restaurant_id, user_id) DO NOTHING;


SELECT pg_notify('pgrst', 'reload schema');
