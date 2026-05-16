-- ============================================================
-- YUMYUMPO — Migration verification
-- Run this whole script in the Supabase SQL editor. It does NOT
-- change anything — it just reports which expected database
-- objects exist, so you can confirm migrations 001–025 are all
-- applied in production. Any row marked ❌ MISSING means a
-- migration was skipped — find + run it.
-- ============================================================

WITH checks AS (
  -- ── Core tables ──────────────────────────────────────────
  SELECT 'table · profiles'                AS item, to_regclass('public.profiles')               IS NOT NULL AS ok
  UNION ALL SELECT 'table · restaurants',            to_regclass('public.restaurants')            IS NOT NULL
  UNION ALL SELECT 'table · restaurant_applications',to_regclass('public.restaurant_applications') IS NOT NULL
  UNION ALL SELECT 'table · venue_announcements',    to_regclass('public.venue_announcements')    IS NOT NULL
  UNION ALL SELECT 'table · venue_follows',          to_regclass('public.venue_follows')          IS NOT NULL
  UNION ALL SELECT 'table · venue_reactions',        to_regclass('public.venue_reactions')        IS NOT NULL
  UNION ALL SELECT 'table · venue_history',          to_regclass('public.venue_history')          IS NOT NULL
  UNION ALL SELECT 'table · order_requests',         to_regclass('public.order_requests')         IS NOT NULL
  UNION ALL SELECT 'table · error_logs (m025)',      to_regclass('public.error_logs')             IS NOT NULL
  UNION ALL SELECT 'table · admin_audit_log (m025)', to_regclass('public.admin_audit_log')        IS NOT NULL

  -- ── Key columns added by later migrations ───────────────
  UNION ALL SELECT 'column · profiles.nationality (m024)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='nationality')
  UNION ALL SELECT 'column · restaurants.owner_user_id (m006)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='owner_user_id')
  UNION ALL SELECT 'column · restaurants.has_yumyumpo_site',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='has_yumyumpo_site')
  UNION ALL SELECT 'column · restaurants.accepting_orders (m018)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='restaurants' AND column_name='accepting_orders')
  UNION ALL SELECT 'column · restaurant_applications.onboard_token (m021)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_applications' AND column_name='onboard_token')
  UNION ALL SELECT 'column · restaurant_applications.restaurant_id (m021)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='restaurant_applications' AND column_name='restaurant_id')
  UNION ALL SELECT 'column · venue_announcements.status (m023)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='venue_announcements' AND column_name='status')
  UNION ALL SELECT 'column · venue_announcements.payment_status (m023)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='venue_announcements' AND column_name='payment_status')
  UNION ALL SELECT 'column · venue_announcements.price_php (m023)',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='venue_announcements' AND column_name='price_php')

  -- ── RPCs / functions ────────────────────────────────────
  UNION ALL SELECT 'function · is_admin',                  EXISTS(SELECT 1 FROM pg_proc WHERE proname='is_admin')
  UNION ALL SELECT 'function · get_my_restaurant',         EXISTS(SELECT 1 FROM pg_proc WHERE proname='get_my_restaurant')
  UNION ALL SELECT 'function · restaurant_buzz_tiers',     EXISTS(SELECT 1 FROM pg_proc WHERE proname='restaurant_buzz_tiers')
  UNION ALL SELECT 'function · submit_order_request (m018)', EXISTS(SELECT 1 FROM pg_proc WHERE proname='submit_order_request')
  UNION ALL SELECT 'function · update_order_status (m018)',  EXISTS(SELECT 1 FROM pg_proc WHERE proname='update_order_status')
  UNION ALL SELECT 'function · mark_order_paid (m020)',      EXISTS(SELECT 1 FROM pg_proc WHERE proname='mark_order_paid')
  UNION ALL SELECT 'function · get_order_by_token (m020)',   EXISTS(SELECT 1 FROM pg_proc WHERE proname='get_order_by_token')
  UNION ALL SELECT 'function · approve_application (m021/022)', EXISTS(SELECT 1 FROM pg_proc WHERE proname='approve_application')
  UNION ALL SELECT 'function · get_application_by_token (m021)', EXISTS(SELECT 1 FROM pg_proc WHERE proname='get_application_by_token')
  UNION ALL SELECT 'function · get_my_application_status (m021)', EXISTS(SELECT 1 FROM pg_proc WHERE proname='get_my_application_status')
  UNION ALL SELECT 'function · review_announcement (m023)',  EXISTS(SELECT 1 FROM pg_proc WHERE proname='review_announcement')
  UNION ALL SELECT 'function · record_announcement_payment (m023)', EXISTS(SELECT 1 FROM pg_proc WHERE proname='record_announcement_payment')

  -- ── Triggers (m023 publish sync, m025 audit + rate limit) ─
  UNION ALL SELECT 'trigger · sync_announcement_published (m023)',
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_announcement_published')
  UNION ALL SELECT 'trigger · audit_application (m025)',
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_audit_application')
  UNION ALL SELECT 'trigger · rate_limit_applications (m025)',
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_rate_limit_applications')
  UNION ALL SELECT 'trigger · rate_limit_orders (m025)',
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_rate_limit_orders')

  -- ── Storage bucket ──────────────────────────────────────
  UNION ALL SELECT 'bucket · avatars (m024)',
    EXISTS(SELECT 1 FROM storage.buckets WHERE id='avatars')
)
SELECT
  CASE WHEN ok THEN '✅ OK' ELSE '❌ MISSING' END AS status,
  item
FROM checks
ORDER BY ok ASC, item;
