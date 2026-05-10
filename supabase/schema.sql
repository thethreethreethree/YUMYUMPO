-- ============================================================
-- YUMYUMPO — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy text search


-- ── RESTAURANTS ─────────────────────────────────────────────
CREATE TABLE restaurants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  tagline           TEXT,
  description       TEXT,
  cuisine_type      TEXT NOT NULL,
  location          TEXT,
  address           TEXT,
  latitude          NUMERIC(10, 7),
  longitude         NUMERIC(10, 7),

  -- Ratings
  google_rating     NUMERIC(3, 1) CHECK (google_rating BETWEEN 1 AND 5),
  review_count      INTEGER DEFAULT 0,

  -- Contact
  phone             TEXT,
  website_url       TEXT,
  whatsapp_url      TEXT,
  messenger_url     TEXT,
  instagram_url     TEXT,
  facebook_url      TEXT,

  -- Media
  cover_image_url   TEXT,
  logo_image_url    TEXT,
  gallery_urls      TEXT[] DEFAULT '{}',

  -- Meta
  is_featured       BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search vector (auto-maintained by trigger)
  fts               TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(tagline, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(cuisine_type, '') || ' ' ||
      coalesce(location, '')
    )
  ) STORED
);

CREATE INDEX restaurants_slug_idx       ON restaurants(slug);
CREATE INDEX restaurants_cuisine_idx    ON restaurants(cuisine_type);
CREATE INDEX restaurants_featured_idx   ON restaurants(is_featured) WHERE is_featured = TRUE;
CREATE INDEX restaurants_active_idx     ON restaurants(is_active)   WHERE is_active   = TRUE;
CREATE INDEX restaurants_rating_idx     ON restaurants(google_rating DESC);
CREATE INDEX restaurants_fts_idx        ON restaurants USING GIN(fts);


-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── RESTAURANT TAGS ─────────────────────────────────────────
CREATE TABLE restaurant_tags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tag_name      TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, tag_name)
);

CREATE INDEX restaurant_tags_restaurant_idx ON restaurant_tags(restaurant_id);
CREATE INDEX restaurant_tags_name_idx       ON restaurant_tags(tag_name);


-- ── MENU CATEGORIES ─────────────────────────────────────────
CREATE TABLE menu_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX menu_categories_restaurant_idx ON menu_categories(restaurant_id);


-- ── MENU ITEMS ───────────────────────────────────────────────
CREATE TABLE menu_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_category_id    UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  price               TEXT,             -- stored as formatted string e.g. "₱280"
  price_numeric       NUMERIC(10, 2),   -- for sorting/filtering
  image_url           TEXT,
  tags                TEXT[] DEFAULT '{}',
  is_available        BOOLEAN DEFAULT TRUE,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX menu_items_category_idx    ON menu_items(menu_category_id);
CREATE INDEX menu_items_restaurant_idx  ON menu_items(restaurant_id);
CREATE INDEX menu_items_available_idx   ON menu_items(is_available) WHERE is_available = TRUE;


-- ── OPERATING HOURS ─────────────────────────────────────────
CREATE TABLE operating_hours (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week   TEXT NOT NULL CHECK (day_of_week IN (
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
  )),
  open_time     TIME,
  close_time    TIME,
  is_closed     BOOLEAN DEFAULT FALSE,
  UNIQUE(restaurant_id, day_of_week)
);

CREATE INDEX operating_hours_restaurant_idx ON operating_hours(restaurant_id);


-- ── ANALYTICS EVENTS ────────────────────────────────────────
CREATE TABLE analytics_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,   -- 'profile_view','card_click','whatsapp_click','website_click','search','call_click','messenger_click'
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',
  page_url      TEXT,
  user_agent    TEXT,
  ip_address    INET,
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX analytics_events_type_idx        ON analytics_events(event_type);
CREATE INDEX analytics_events_restaurant_idx  ON analytics_events(restaurant_id);
CREATE INDEX analytics_events_created_idx     ON analytics_events(created_at DESC);

-- Partitioning hint (for scale — implement when table exceeds ~5M rows):
-- PARTITION BY RANGE (created_at)


-- ── FEATURED SLOTS ──────────────────────────────────────────
CREATE TABLE featured_restaurants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  section       TEXT NOT NULL DEFAULT 'homepage', -- 'homepage','trending','tourism'
  sort_order    INTEGER DEFAULT 0,
  active_from   TIMESTAMPTZ DEFAULT NOW(),
  active_until  TIMESTAMPTZ,           -- NULL = always active
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, section)
);

CREATE INDEX featured_restaurants_section_idx ON featured_restaurants(section);


-- ── CUISINE CATEGORIES ──────────────────────────────────────
CREATE TABLE cuisine_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT UNIQUE NOT NULL,
  emoji      TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);

INSERT INTO cuisine_categories (name, emoji, sort_order) VALUES
  ('Filipino',  '🇵🇭', 1),
  ('Japanese',  '🍜',  2),
  ('Seafood',   '🦞',  3),
  ('Café',      '☕',  4),
  ('Italian',   '🍕',  5),
  ('Korean',    '🥘',  6),
  ('BBQ',       '🔥',  7),
  ('Vegan',     '🥗',  8),
  ('Chinese',   '🥟',  9),
  ('Burgers',   '🍔',  10),
  ('Mexican',   '🌮',  11),
  ('Desserts',  '🍨',  12);


-- ── SAMPLE DATA ─────────────────────────────────────────────

INSERT INTO restaurants (slug, name, tagline, description, cuisine_type, location, address, google_rating, review_count, cover_image_url, is_featured, whatsapp_url) VALUES
(
  'marias-kitchen',
  'Maria''s Kitchen',
  'Home-cooked Filipino food with heart.',
  'Maria''s Kitchen has been serving the El Nido community for over 15 years. Every dish is made from scratch using locally sourced ingredients and treasured family recipes.',
  'Filipino',
  'El Nido, Palawan',
  '123 Corong-Corong Road, El Nido, Palawan 5313',
  4.8, 1238,
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
  TRUE,
  'https://wa.me/639123456789'
),
(
  'sunset-grill',
  'Sunset Grill',
  'Fresh seafood with the best view in Coron.',
  'Perched above the water with jaw-dropping sunsets and the freshest grilled seafood in town.',
  'Seafood',
  'Coron, Palawan',
  'Waterfront Road, Coron, Palawan',
  4.9, 874,
  'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&auto=format&fit=crop&q=80',
  TRUE,
  'https://wa.me/639987654321'
),
(
  'brew-and-bite',
  'Brew & Bite',
  'Where specialty coffee meets incredible brunch.',
  'A cozy café where specialty coffee meets incredible brunch plates. Perfect for slow mornings and long conversations.',
  'Café',
  'BGC, Taguig',
  '5th Avenue, Bonifacio Global City, Taguig',
  4.7, 2104,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80',
  FALSE,
  NULL
);


-- ── ROW LEVEL SECURITY (RLS) ────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE restaurants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE operating_hours      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_restaurants ENABLE ROW LEVEL SECURITY;

-- Public READ access (anon users can read active restaurants)
CREATE POLICY "Public can read active restaurants"
  ON restaurants FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Public can read restaurant tags"
  ON restaurant_tags FOR SELECT USING (TRUE);

CREATE POLICY "Public can read menu categories"
  ON menu_categories FOR SELECT USING (TRUE);

CREATE POLICY "Public can read menu items"
  ON menu_items FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Public can read operating hours"
  ON operating_hours FOR SELECT USING (TRUE);

CREATE POLICY "Public can read featured restaurants"
  ON featured_restaurants FOR SELECT USING (TRUE);

-- Analytics: anyone can INSERT (track events), no READ for anon
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (TRUE);

-- Admin: full access requires authenticated role (set up Supabase Auth)
-- Uncomment and configure after setting up Auth:
-- CREATE POLICY "Admins can do everything"
--   ON restaurants FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');


-- ── ANALYTICS VIEWS ─────────────────────────────────────────

CREATE VIEW restaurant_analytics AS
SELECT
  r.id,
  r.name,
  r.slug,
  COUNT(CASE WHEN ae.event_type = 'profile_view'    THEN 1 END) AS profile_views,
  COUNT(CASE WHEN ae.event_type = 'card_click'      THEN 1 END) AS card_clicks,
  COUNT(CASE WHEN ae.event_type = 'whatsapp_click'  THEN 1 END) AS whatsapp_clicks,
  COUNT(CASE WHEN ae.event_type = 'website_click'   THEN 1 END) AS website_clicks,
  COUNT(CASE WHEN ae.event_type = 'call_click'      THEN 1 END) AS call_clicks,
  COUNT(ae.id) AS total_events
FROM restaurants r
LEFT JOIN analytics_events ae ON ae.restaurant_id = r.id
GROUP BY r.id, r.name, r.slug
ORDER BY total_events DESC;
