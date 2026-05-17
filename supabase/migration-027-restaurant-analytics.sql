-- ============================================================
-- YUMYUMPO — Migration 027 · Per-restaurant analytics bundle
-- One admin-only RPC that returns a complete analytics snapshot
-- for a single restaurant: order requests, engagement, traffic,
-- buzz, and content — everything the admin panel needs in one
-- round trip.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_restaurant_analytics(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result    JSONB;
  v_orders    JSONB;
  v_buzz      RECORD;
  v_recent    JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  /* ── Order requests — counts by status + derived metrics ── */
  SELECT jsonb_build_object(
    'total',         COUNT(*),
    'pending',       COUNT(*) FILTER (WHERE status = 'pending'),
    'acknowledged',  COUNT(*) FILTER (WHERE status = 'acknowledged'),
    'quoted',        COUNT(*) FILTER (WHERE status = 'quoted'),
    'accepted',      COUNT(*) FILTER (WHERE status = 'accepted'),
    'denied',        COUNT(*) FILTER (WHERE status = 'denied'),
    'completed',     COUNT(*) FILTER (WHERE status = 'completed'),
    'paid',          COUNT(*) FILTER (WHERE status = 'paid'),
    'open',          COUNT(*) FILTER (WHERE status IN ('pending','acknowledged','quoted')),
    'accept_pct',    ROUND(
                       100.0 * COUNT(*) FILTER (WHERE status IN ('accepted','completed','paid'))
                       / NULLIF(COUNT(*) FILTER (WHERE status <> 'pending'), 0), 1),
    'avg_response_min', ROUND(AVG(
                       EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 60.0
                     ) FILTER (WHERE acknowledged_at IS NOT NULL)::numeric, 1),
    'avg_order_value',  ROUND(AVG(quoted_total) FILTER (WHERE quoted_total IS NOT NULL)::numeric, 2),
    'total_revenue',    COALESCE(SUM(quoted_total) FILTER (WHERE status = 'paid'), 0),
    'last_request_at',  MAX(created_at),
    'orders_7d',     COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
    'orders_30d',    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')
  )
  INTO v_orders
  FROM order_requests
  WHERE restaurant_id = p_restaurant_id;

  /* ── Last 10 order requests for the activity list ── */
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT jsonb_build_object(
      'status',        status,
      'customer_name', customer_name,
      'quoted_total',  quoted_total,
      'created_at',    created_at
    ) AS row
    FROM order_requests
    WHERE restaurant_id = p_restaurant_id
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  /* ── Buzz score + tier ── */
  SELECT buzz_score, buzz_tier INTO v_buzz
  FROM restaurant_buzz_tiers()
  WHERE restaurant_id = p_restaurant_id;

  /* ── Assemble the full bundle ── */
  v_result := jsonb_build_object(
    'orders',       v_orders,
    'recent_orders', v_recent,

    'engagement', jsonb_build_object(
      'follows',         (SELECT COUNT(*) FROM venue_follows   WHERE restaurant_id = p_restaurant_id),
      'saves',           (SELECT COUNT(*) FROM saved_places    WHERE restaurant_id = p_restaurant_id),
      'history_views',   (SELECT COUNT(*) FROM venue_history   WHERE restaurant_id = p_restaurant_id),
      'reactions_love',  (SELECT COUNT(*) FROM venue_reactions WHERE restaurant_id = p_restaurant_id AND reaction = 'love'),
      'reactions_want',  (SELECT COUNT(*) FROM venue_reactions WHERE restaurant_id = p_restaurant_id AND reaction = 'want-to-go'),
      'reactions_been',  (SELECT COUNT(*) FROM venue_reactions WHERE restaurant_id = p_restaurant_id AND reaction = 'been-there')
    ),

    'traffic', jsonb_build_object(
      'profile_views_30d', (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'profile_view'  AND created_at > NOW() - INTERVAL '30 days'),
      'profile_views_7d',  (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'profile_view'  AND created_at > NOW() - INTERVAL '7 days'),
      'card_clicks_30d',   (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'card_click'    AND created_at > NOW() - INTERVAL '30 days'),
      'menu_views_30d',    (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'menu_view'     AND created_at > NOW() - INTERVAL '30 days'),
      'whatsapp_30d',      (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'whatsapp_click' AND created_at > NOW() - INTERVAL '30 days'),
      'website_30d',       (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND event_type = 'website_click'  AND created_at > NOW() - INTERVAL '30 days'),
      'total_events_30d',  (SELECT COUNT(*) FROM analytics_events WHERE restaurant_id = p_restaurant_id AND created_at > NOW() - INTERVAL '30 days')
    ),

    'buzz', jsonb_build_object(
      'score', COALESCE(v_buzz.buzz_score, 0),
      'tier',  v_buzz.buzz_tier
    ),

    'content', jsonb_build_object(
      'announcements_total',     (SELECT COUNT(*) FROM venue_announcements WHERE restaurant_id = p_restaurant_id),
      'announcements_published', (SELECT COUNT(*) FROM venue_announcements WHERE restaurant_id = p_restaurant_id AND is_published = TRUE),
      'announcements_pending',   (SELECT COUNT(*) FROM venue_announcements WHERE restaurant_id = p_restaurant_id AND status = 'pending')
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_restaurant_analytics(UUID) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
