-- ============================================================
-- YUMYUMPO — Migration 032 · Admin can edit any restaurant's menu
-- save_restaurant_menu() previously allowed only the restaurant's
-- owner. Admins manage restaurants from the admin dashboard, so
-- they must be able to save menus too (same as save_restaurant).
-- ============================================================

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
  /* The restaurant's owner OR a platform admin may save its menu. */
  IF NOT (
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE id = p_restaurant_id AND owner_user_id = auth.uid()
    )
    OR is_admin()
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit this menu';
  END IF;

  /* Replace strategy: wipe then re-insert from the payload, all in
     one transaction. Items first (FK), then categories. */
  DELETE FROM menu_items      WHERE restaurant_id = p_restaurant_id;
  DELETE FROM menu_categories WHERE restaurant_id = p_restaurant_id;

  FOR v_cat IN SELECT * FROM jsonb_array_elements(COALESCE(p_categories, '[]'::jsonb))
  LOOP
    /* Skip categories with no name. */
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

SELECT pg_notify('pgrst', 'reload schema');
