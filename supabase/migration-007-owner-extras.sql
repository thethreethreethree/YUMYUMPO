-- ============================================================
-- YUMYUMPO — Migration 007 · Owner editing for hours + menu
-- Run AFTER migration-006-owner.sql
-- ────────────────────────────────────────────────────────────
-- Lets a restaurant owner manage their operating_hours,
-- menu_categories, and menu_items rows.
-- ============================================================

-- Helper: does this restaurant belong to the current user?
CREATE OR REPLACE FUNCTION owns_restaurant(p_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurants
     WHERE id = p_restaurant_id AND owner_user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION owns_restaurant(UUID) TO authenticated;


-- ── OPERATING HOURS ────────────────────────────────────────
DROP POLICY IF EXISTS "owner manage operating_hours" ON operating_hours;
CREATE POLICY "owner manage operating_hours" ON operating_hours
  FOR ALL TO authenticated
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));


-- ── MENU CATEGORIES ────────────────────────────────────────
DROP POLICY IF EXISTS "owner manage menu_categories" ON menu_categories;
CREATE POLICY "owner manage menu_categories" ON menu_categories
  FOR ALL TO authenticated
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));


-- ── MENU ITEMS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "owner manage menu_items" ON menu_items;
CREATE POLICY "owner manage menu_items" ON menu_items
  FOR ALL TO authenticated
  USING (owns_restaurant(restaurant_id))
  WITH CHECK (owns_restaurant(restaurant_id));


-- ── Reload PostgREST ───────────────────────────────────────
SELECT pg_notify('pgrst', 'reload schema');
