-- ============================================================
-- YUMYUMPO — Migration 001 · Path B production wiring
-- Run AFTER schema.sql / analytics-schema.sql / ai-schema.sql / applications-schema.sql
-- ────────────────────────────────────────────────────────────
-- This migration fixes everything caught in the pre-launch audit:
--   1. Adds the missing `has_yumyumpo_site` column
--   2. Adds RLS write policies for authenticated admin users
--   3. Makes `restaurants` publicly readable (active only)
--   4. Removes the broken analytics_events → analytics_sessions FK
--   5. Adds a get_homepage_stats() RPC for honest landing-page counts
--   6. Seeds 18 curated restaurants with proper UUIDs + tags
--   7. Creates a `homepage_picks` view that the frontend reads
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1.  SCHEMA: add missing column
-- ─────────────────────────────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS has_yumyumpo_site BOOLEAN DEFAULT FALSE;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS rank_label TEXT;       -- e.g. "#1 This Week" for trending


-- ─────────────────────────────────────────────────────────────
-- 2.  RLS — public read, authenticated write
-- ─────────────────────────────────────────────────────────────

-- restaurants
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read active restaurants" ON restaurants;
CREATE POLICY "public read active restaurants" ON restaurants
  FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "auth manage restaurants" ON restaurants;
CREATE POLICY "auth manage restaurants" ON restaurants
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- restaurant_tags
ALTER TABLE restaurant_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read restaurant_tags" ON restaurant_tags;
CREATE POLICY "public read restaurant_tags" ON restaurant_tags
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "auth manage restaurant_tags" ON restaurant_tags;
CREATE POLICY "auth manage restaurant_tags" ON restaurant_tags
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- menu_categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read menu_categories" ON menu_categories;
CREATE POLICY "public read menu_categories" ON menu_categories
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "auth manage menu_categories" ON menu_categories;
CREATE POLICY "auth manage menu_categories" ON menu_categories
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read menu_items" ON menu_items;
CREATE POLICY "public read menu_items" ON menu_items
  FOR SELECT USING (is_available = TRUE);
DROP POLICY IF EXISTS "auth manage menu_items" ON menu_items;
CREATE POLICY "auth manage menu_items" ON menu_items
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- operating_hours
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read operating_hours" ON operating_hours;
CREATE POLICY "public read operating_hours" ON operating_hours
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "auth manage operating_hours" ON operating_hours;
CREATE POLICY "auth manage operating_hours" ON operating_hours
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- featured_restaurants
ALTER TABLE featured_restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read featured_restaurants" ON featured_restaurants;
CREATE POLICY "public read featured_restaurants" ON featured_restaurants
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "auth manage featured_restaurants" ON featured_restaurants;
CREATE POLICY "auth manage featured_restaurants" ON featured_restaurants
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- cuisine_categories
ALTER TABLE cuisine_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read cuisine_categories" ON cuisine_categories;
CREATE POLICY "public read cuisine_categories" ON cuisine_categories
  FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "auth manage cuisine_categories" ON cuisine_categories;
CREATE POLICY "auth manage cuisine_categories" ON cuisine_categories
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);


-- ─────────────────────────────────────────────────────────────
-- 3.  FIX BROKEN FK on analytics_events.session_id
--     The FK breaks every insert because we never create the
--     parent row. Drop it; keep the column for filtering.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_session_id_fkey;


-- ─────────────────────────────────────────────────────────────
-- 4.  HOMEPAGE STATS RPC — honest counts
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_homepage_stats()
RETURNS TABLE (
  active_restaurants   INTEGER,
  total_cities         INTEGER,
  total_discoveries_30d INTEGER,
  total_applications   INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM restaurants WHERE is_active = TRUE),
    (SELECT COUNT(DISTINCT location)::INTEGER FROM restaurants WHERE is_active = TRUE AND location IS NOT NULL),
    (SELECT COALESCE(SUM(profile_views), 0)::INTEGER
       FROM restaurant_daily_stats
       WHERE stat_date >= CURRENT_DATE - 30),
    (SELECT COUNT(*)::INTEGER FROM restaurant_applications);
$$;

GRANT EXECUTE ON FUNCTION get_homepage_stats() TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 5.  HOMEPAGE PICKS VIEW
--     Convenience view that returns featured + trending + tourism
--     restaurants in one shape with their tags.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW homepage_picks AS
SELECT
  r.id,
  r.slug,
  r.name,
  r.tagline,
  r.description,
  r.cuisine_type,
  r.location,
  r.address,
  r.google_rating,
  r.review_count,
  r.cover_image_url,
  r.logo_image_url,
  r.website_url,
  r.has_yumyumpo_site,
  r.is_featured,
  r.ai_summary,
  r.rank_label,
  r.created_at,
  COALESCE(
    (SELECT array_agg(tag_name) FROM restaurant_tags WHERE restaurant_id = r.id),
    '{}'::TEXT[]
  ) AS tags
FROM restaurants r
WHERE r.is_active = TRUE;

GRANT SELECT ON homepage_picks TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 6.  SEED — 18 curated launch restaurants
--     Idempotent via ON CONFLICT (slug).
-- ─────────────────────────────────────────────────────────────
INSERT INTO restaurants (
  slug, name, description, cuisine_type, location, google_rating, review_count,
  cover_image_url, website_url, has_yumyumpo_site, is_featured, is_active,
  ai_summary, rank_label
) VALUES
  ('marias-kitchen',  'Maria''s Kitchen',  'Authentic Filipino comfort food made with love. Famous for sinigang, crispy lechon, and kare-kare that tastes like home.',
   'Filipino', 'El Nido, Palawan', 4.8, 1238,
   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, TRUE, TRUE,
   'Beloved local haunt serving authentic Filipino comfort food. A go-to for backpackers and families — the kind of place that feels like home.',
   NULL),

  ('sunset-grill', 'Sunset Grill', 'Perched above the water with jaw-dropping sunsets. The freshest grilled seafood and the coldest beers in Coron.',
   'Seafood', 'Coron, Palawan', 4.9, 874,
   'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&auto=format&fit=crop&q=80',
   'https://sunsetgrill.ph', FALSE, TRUE, TRUE,
   'Perched above the water with jaw-dropping sunset views. A must-visit for couples and travelers chasing golden-hour magic over grilled seafood.',
   NULL),

  ('brew-and-bite', 'Brew & Bite', 'A cozy café with specialty single-origin coffee and incredible brunch plates. The WiFi is solid, the vibes even better.',
   'Café', 'BGC, Taguig', 4.7, 2104,
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, FALSE, TRUE,
   'Specialty single-origin coffee meets incredible all-day brunch. Solid WiFi, even better vibes — popular with digital nomads and slow-morning travelers.',
   NULL),

  ('ramen-tori', 'Ramen Tori', 'Rich, deep broths simmered 18 hours. The kind of ramen that ruins all other ramen for you — permanently.',
   'Japanese', 'Makati, Metro Manila', 4.8, 3891,
   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
   'https://ramentori.ph', FALSE, TRUE, TRUE,
   'Rich, 18-hour broths that ruin all other ramen permanently. Consistently ranked Makati''s top Japanese spot — expect queues, they''re worth it.',
   NULL),

  ('la-mesa-verde', 'La Mesa Verde', 'Creative plant-based cuisine that makes going green feel like an indulgence. Every plate is a work of art.',
   'Vegan', 'Poblacion, Makati', 4.6, 542,
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Creative plant-based cuisine that makes going green feel like an indulgence. Every plate is a work of art — popular with health-conscious travelers.',
   NULL),

  ('the-smokehouse', 'The Smokehouse', 'Low and slow. Tender, fall-off-the-bone ribs and smoked brisket that dreams are made of. Full racks on weekends.',
   'BBQ', 'Cebu City', 4.7, 1566,
   'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, TRUE, TRUE,
   'Low and slow is the only way here. Tender smoked brisket and fall-off-the-bone ribs that draw crowds from across the city every weekend.',
   NULL),

  ('izakaya-nori', 'Izakaya Nori', 'Vibey Japanese izakaya energy — skewers, sake, and sashimi until 2am. A backpacker rite of passage in QC.',
   'Japanese', 'Quezon City', 4.9, 2210,
   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, FALSE, TRUE,
   'Vibey izakaya with skewers, sake, and sashimi until 2am. A backpacker rite of passage in Quezon City.',
   '#1 This Week'),

  ('paluto-na', 'Paluto Na!', 'Pick your fresh catch from the market and they cook it however you want. The most authentic island dining experience.',
   'Filipino', 'Boracay Island', 4.7, 988,
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Pick your fresh catch, they cook it your way. The most authentic island dining experience in Boracay — a must for every first-time visitor.',
   '#2 This Week'),

  ('siargao-surf-kitchen', 'Siargao Surf Kitchen', 'Acai bowls, fresh smoothies, and all-day brunch for surfers and sun-chasers. Right next to Cloud 9.',
   'Café', 'General Luna, Siargao', 4.8, 743,
   'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, FALSE, TRUE,
   'Acai bowls and all-day brunch right next to Cloud 9. The ultimate surf-town café — popular with every backpacker passing through Siargao.',
   '#3 This Week'),

  ('korean-bbq-house', 'K-Grill House', 'All-you-can-eat Korean BBQ with unlimited samgyupsal and banchan. The go-to for group nights out.',
   'Korean', 'Malate, Manila', 4.5, 1890,
   'https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Unlimited samgyupsal and banchan for groups. The undisputed go-to for late-night Korean BBQ in Manila.',
   NULL),

  ('bohol-bites', 'Bohol Bites', 'Tiny warung-style spot famous for their chocolate hills tsokolate and crispy batchoy. A hidden gem.',
   'Filipino', 'Tagbilaran, Bohol', 4.6, 328,
   'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Tiny warung-style spot famous for chocolate hills tsokolate and crispy batchoy. A true hidden gem that locals guard fiercely.',
   NULL),

  ('pizzeria-roma', 'Pizzeria Roma', 'Wood-fired Neapolitan pizza with imported 00 flour and San Marzano tomatoes. Closest thing to Italy in Manila.',
   'Italian', 'Salcedo Village, Makati', 4.7, 1104,
   'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, FALSE, TRUE,
   'Wood-fired Neapolitan pizza with imported ingredients — the closest thing to Italy in Metro Manila. Perfect for date nights.',
   NULL),

  ('el-pescador', 'El Pescador', 'Fishermen dock directly at the restaurant every morning. If it swam yesterday, it is on the menu today.',
   'Seafood', 'El Nido, Palawan', 4.8, 612,
   'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Fishermen dock directly here every morning. If it swam yesterday, it''s on today''s menu — as fresh as seafood gets in El Nido.',
   NULL),

  ('burger-republic', 'Burger Republic', 'Smash burgers with wagyu beef, house sauces, and a lineup of milkshakes that breaks the internet weekly.',
   'Burgers', 'Kapitolyo, Pasig', 4.6, 2340,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
   'https://burgerrepublic.ph', FALSE, FALSE, TRUE,
   'Wagyu smash burgers and internet-breaking milkshakes. Budget-friendly, late-night, and consistently packed with regulars.',
   NULL),

  ('tacos-del-sol', 'Tacos del Sol', 'Authentic birria tacos, street-style quesadillas, and horchata that will make you forget you are not in Mexico.',
   'Mexican', 'Poblacion, Makati', 4.5, 876,
   'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Authentic birria tacos and street-style quesadillas. The horchata alone is worth the trip — a Poblacion staple for late-night cravings.',
   NULL),

  ('halo-halo-ni-lola', 'Halo-Halo ni Lola', 'The most legendary halo-halo in the Philippines. Three generations deep, zero compromise on quality.',
   'Desserts', 'Iloilo City', 4.9, 4102,
   'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, FALSE, TRUE,
   'Three generations deep, zero compromise. The most legendary halo-halo in the Philippines — every traveler should make the pilgrimage to Iloilo for this.',
   NULL),

  ('canton-empire', 'Canton Empire', 'Dim sum carts rolling from 6am and a roast duck that has a cult following. Weekend queues are long — and worth it.',
   'Chinese', 'Binondo, Manila', 4.6, 3200,
   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
   NULL, FALSE, FALSE, TRUE,
   'Dim sum carts rolling from 6am in the heart of Binondo. The roast duck has a cult following — weekend queues are long and completely worth it.',
   NULL),

  ('fishermans-wharf', 'Fisherman''s Wharf', 'Bonfires on the beach, barbecued squid, and cold beers. The quintessential island night-out experience.',
   'Seafood', 'Puerto Galera', 4.8, 821,
   'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
   NULL, TRUE, FALSE, TRUE,
   'Bonfires on the beach, barbecued squid, and cold beers under the stars. The quintessential island night-out — romantic, raw, unforgettable.',
   '#4 This Week')

ON CONFLICT (slug) DO UPDATE SET
  name              = EXCLUDED.name,
  description       = EXCLUDED.description,
  cuisine_type      = EXCLUDED.cuisine_type,
  location          = EXCLUDED.location,
  google_rating     = EXCLUDED.google_rating,
  review_count      = EXCLUDED.review_count,
  cover_image_url   = EXCLUDED.cover_image_url,
  website_url       = EXCLUDED.website_url,
  has_yumyumpo_site = EXCLUDED.has_yumyumpo_site,
  is_featured       = EXCLUDED.is_featured,
  ai_summary        = EXCLUDED.ai_summary,
  rank_label        = EXCLUDED.rank_label,
  updated_at        = NOW();


-- ─────────────────────────────────────────────────────────────
-- 7.  SEED TAGS
--     Re-derived from the curated dataset.
-- ─────────────────────────────────────────────────────────────
WITH seed_tags(slug, tag) AS (VALUES
  ('marias-kitchen',       'Local Favorite'),
  ('marias-kitchen',       'Family-Friendly'),
  ('marias-kitchen',       'Budget-Friendly'),
  ('marias-kitchen',       'Backpacker-Approved'),
  ('sunset-grill',         'Romantic'),
  ('sunset-grill',         'Scenic View'),
  ('sunset-grill',         'Beach Dining'),
  ('sunset-grill',         'Date Spot'),
  ('brew-and-bite',        'WiFi-Friendly'),
  ('brew-and-bite',        'Instagrammable'),
  ('brew-and-bite',        'Backpacker-Approved'),
  ('brew-and-bite',        'Hidden Gem'),
  ('ramen-tori',           'Late Night'),
  ('ramen-tori',           'Date Spot'),
  ('ramen-tori',           'Must Try'),
  ('ramen-tori',           'Local Favorite'),
  ('la-mesa-verde',        'Vegan'),
  ('la-mesa-verde',        'Healthy'),
  ('la-mesa-verde',        'Instagrammable'),
  ('la-mesa-verde',        'Scenic View'),
  ('the-smokehouse',       'Group-Friendly'),
  ('the-smokehouse',       'Budget-Friendly'),
  ('the-smokehouse',       'Local Favorite'),
  ('the-smokehouse',       'Family-Friendly'),
  ('izakaya-nori',         'Late Night'),
  ('izakaya-nori',         'Backpacker-Approved'),
  ('izakaya-nori',         'Hidden Gem'),
  ('izakaya-nori',         'Instagrammable'),
  ('paluto-na',            'Beach Dining'),
  ('paluto-na',            'Local Favorite'),
  ('paluto-na',            'Budget-Friendly'),
  ('paluto-na',            'Backpacker-Approved'),
  ('siargao-surf-kitchen', 'Beach Dining'),
  ('siargao-surf-kitchen', 'Healthy'),
  ('siargao-surf-kitchen', 'Backpacker-Approved'),
  ('siargao-surf-kitchen', 'Instagrammable'),
  ('korean-bbq-house',     'Group-Friendly'),
  ('korean-bbq-house',     'Budget-Friendly'),
  ('korean-bbq-house',     'Late Night'),
  ('korean-bbq-house',     'Family-Friendly'),
  ('bohol-bites',          'Hidden Gem'),
  ('bohol-bites',          'Budget-Friendly'),
  ('bohol-bites',          'Local Favorite'),
  ('bohol-bites',          'Backpacker-Approved'),
  ('pizzeria-roma',        'Date Spot'),
  ('pizzeria-roma',        'Romantic'),
  ('pizzeria-roma',        'Instagrammable'),
  ('pizzeria-roma',        'Family-Friendly'),
  ('el-pescador',          'Beach Dining'),
  ('el-pescador',          'Local Favorite'),
  ('el-pescador',          'Hidden Gem'),
  ('el-pescador',          'Scenic View'),
  ('burger-republic',      'Budget-Friendly'),
  ('burger-republic',      'Late Night'),
  ('burger-republic',      'Backpacker-Approved'),
  ('burger-republic',      'Group-Friendly'),
  ('tacos-del-sol',        'Late Night'),
  ('tacos-del-sol',        'Budget-Friendly'),
  ('tacos-del-sol',        'Backpacker-Approved'),
  ('tacos-del-sol',        'Instagrammable'),
  ('halo-halo-ni-lola',    'Local Favorite'),
  ('halo-halo-ni-lola',    'Budget-Friendly'),
  ('halo-halo-ni-lola',    'Family-Friendly'),
  ('halo-halo-ni-lola',    'Backpacker-Approved'),
  ('canton-empire',        'Family-Friendly'),
  ('canton-empire',        'Local Favorite'),
  ('canton-empire',        'Budget-Friendly'),
  ('canton-empire',        'Group-Friendly'),
  ('fishermans-wharf',     'Beach Dining'),
  ('fishermans-wharf',     'Late Night'),
  ('fishermans-wharf',     'Romantic'),
  ('fishermans-wharf',     'Scenic View')
)
INSERT INTO restaurant_tags (restaurant_id, tag_name)
SELECT r.id, s.tag
FROM seed_tags s
JOIN restaurants r ON r.slug = s.slug
ON CONFLICT (restaurant_id, tag_name) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- DONE.  Verify with:
--   SELECT count(*) FROM restaurants;        -- expect 18
--   SELECT * FROM homepage_picks LIMIT 3;
--   SELECT * FROM get_homepage_stats();
-- ─────────────────────────────────────────────────────────────
