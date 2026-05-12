-- ============================================================
-- YUMYUMPO — AI Search Schema
-- Run after schema.sql and analytics-schema.sql
-- ============================================================

-- Enable pg_trgm for fast LIKE/similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgvector for semantic similarity (optional, requires pgvector extension)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ────────────────────────────────────────────────────────────
-- SEARCH QUERIES — log every AI search for analytics
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_search_queries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      TEXT,
  raw_query       TEXT NOT NULL,
  parsed_cuisines TEXT[],
  parsed_moods    TEXT[],
  parsed_location TEXT,
  parsed_budget   TEXT,
  parsed_intent   TEXT,
  result_count    INTEGER DEFAULT 0,
  top_restaurant  TEXT,                         -- slug of #1 result
  enhanced        BOOLEAN DEFAULT FALSE,        -- Claude API was used
  response_ms     INTEGER,                      -- latency
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_search_queries_session_idx ON ai_search_queries (session_id);
CREATE INDEX IF NOT EXISTS ai_search_queries_created_idx ON ai_search_queries (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_search_queries_query_trgm  ON ai_search_queries USING gin (raw_query gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- RESTAURANT AI TAGS — semantic tags for vector search
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_ai_tags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  tag           TEXT NOT NULL,
  category      TEXT CHECK (category IN ('vibe','cuisine','feature','diet','location','meal','occasion')),
  weight        NUMERIC(3,2) DEFAULT 1.0,       -- importance weight 0–1
  source        TEXT DEFAULT 'manual',           -- 'manual' | 'ai-generated' | 'user-submitted'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, tag)
);

CREATE INDEX IF NOT EXISTS restaurant_ai_tags_restaurant_idx ON restaurant_ai_tags (restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_ai_tags_tag_idx        ON restaurant_ai_tags USING gin (tag gin_trgm_ops);
CREATE INDEX IF NOT EXISTS restaurant_ai_tags_category_idx   ON restaurant_ai_tags (category);

-- ────────────────────────────────────────────────────────────
-- MOOD COLLECTIONS — curated mood→restaurant mappings
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mood_collections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  emoji       TEXT,
  description TEXT,
  tags        TEXT[],                            -- tags that define this mood
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO mood_collections (slug, name, emoji, description, tags, sort_order) VALUES
  ('romantic',       'Date Night',         '💑', 'Perfect spots for couples and special occasions',   ARRAY['romantic','intimate','candlelit','fine-dining'], 1),
  ('backpacker',     'Backpacker Picks',   '🎒', 'Wallet-friendly spots travelers actually love',     ARRAY['budget-friendly','backpacker','local-favorite'], 2),
  ('instagrammable', 'Gram-Worthy',        '📸', 'Beautiful spaces that look great on the feed',      ARRAY['instagrammable','aesthetic','rooftop','view'],   3),
  ('beach-vibes',    'Beach & Surf',       '🌊', 'Oceanfront and island dining experiences',          ARRAY['beachfront','island','ocean-view','sunset'],     4),
  ('hidden-gems',    'Hidden Gems',        '💎', 'Local secrets the tourists havent found yet',       ARRAY['hidden-gem','local-secret','authentic'],         5),
  ('late-night',     'Late Night Cravings','🌙', 'Places still serving when hunger strikes at midnight', ARRAY['late-night','24-hours','after-hours'],        6),
  ('family',         'Family Friendly',    '👨‍👩‍👧', 'Welcoming spots the whole family will enjoy',     ARRAY['family-friendly','kids','wholesome'],            7),
  ('coffee-crawl',   'Coffee & Brunch',    '☕', 'Specialty coffee and all-day breakfast spots',      ARRAY['café','coffee','brunch','specialty-coffee'],    8),
  ('splurge',        'Treat Yourself',     '✨', 'Upscale dining for when you deserve the best',      ARRAY['fine-dining','upscale','premium','tasting-menu'],9)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- CUISINE INTELLIGENCE — keyword→cuisine mappings for AI
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuisine_keywords (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuisine     TEXT NOT NULL,
  keyword     TEXT NOT NULL,
  weight      NUMERIC(3,2) DEFAULT 1.0,
  UNIQUE (cuisine, keyword)
);

CREATE INDEX IF NOT EXISTS cuisine_keywords_kw_trgm ON cuisine_keywords USING gin (keyword gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- FULL-TEXT SEARCH FUNCTION
-- Returns restaurants ranked by text similarity to query
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_restaurants_fts(query_text TEXT, result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  slug          TEXT,
  cuisine       TEXT,
  location      TEXT,
  rating        NUMERIC,
  cover_image   TEXT,
  description   TEXT,
  rank          REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.slug,
    r.cuisine_type AS cuisine,
    r.location,
    r.google_rating AS rating,
    r.cover_image_url AS cover_image,
    r.description,
    ts_rank(
      to_tsvector('english', COALESCE(r.name,'') || ' ' || COALESCE(r.description,'') || ' ' || COALESCE(r.cuisine_type,'') || ' ' || COALESCE(r.location,'')),
      plainto_tsquery('english', query_text)
    ) AS rank
  FROM restaurants r
  WHERE r.is_active = TRUE
    AND to_tsvector('english', COALESCE(r.name,'') || ' ' || COALESCE(r.description,'') || ' ' || COALESCE(r.cuisine_type,'') || ' ' || COALESCE(r.location,''))
        @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ────────────────────────────────────────────────────────────
-- SIMILAR RESTAURANTS FUNCTION
-- Returns restaurants similar to a given restaurant
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_similar_restaurants(target_slug TEXT, result_limit INTEGER DEFAULT 4)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  slug        TEXT,
  cuisine     TEXT,
  location    TEXT,
  rating      NUMERIC,
  cover_image TEXT,
  similarity  REAL
) AS $$
DECLARE
  target_cuisine TEXT;
  target_location TEXT;
BEGIN
  SELECT cuisine_type, location INTO target_cuisine, target_location
  FROM restaurants WHERE slug = target_slug;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.slug,
    r.cuisine_type AS cuisine,
    r.location,
    r.google_rating AS rating,
    r.cover_image_url AS cover_image,
    (
      CASE WHEN r.cuisine_type = target_cuisine THEN 0.6 ELSE 0.0 END +
      CASE WHEN r.location     = target_location THEN 0.4 ELSE 0.0 END
    )::REAL AS similarity
  FROM restaurants r
  WHERE r.slug != target_slug
    AND r.is_active = TRUE
    AND (r.cuisine_type = target_cuisine OR r.location = target_location)
  ORDER BY similarity DESC, r.google_rating DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ────────────────────────────────────────────────────────────
-- POPULAR SEARCH TERMS VIEW
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW popular_ai_searches AS
SELECT
  raw_query,
  COUNT(*) AS search_count,
  AVG(result_count)::NUMERIC(4,1) AS avg_results,
  MAX(created_at) AS last_searched
FROM ai_search_queries
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY raw_query
ORDER BY search_count DESC;

-- ────────────────────────────────────────────────────────────
-- RLS — search_queries are insert-only from anon
-- ────────────────────────────────────────────────────────────
ALTER TABLE ai_search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_ai_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_collections ENABLE ROW LEVEL SECURITY;

-- anyone can insert a search query
CREATE POLICY "anon insert search queries" ON ai_search_queries
  FOR INSERT TO anon WITH CHECK (TRUE);

-- anyone can read mood collections
CREATE POLICY "public read moods" ON mood_collections
  FOR SELECT USING (active = TRUE);

-- anyone can read ai tags
CREATE POLICY "public read ai tags" ON restaurant_ai_tags
  FOR SELECT USING (TRUE);

-- admin full access
CREATE POLICY "admin all ai_search_queries"    ON ai_search_queries    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin all restaurant_ai_tags"   ON restaurant_ai_tags   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin all mood_collections"     ON mood_collections     FOR ALL USING (auth.role() = 'authenticated');
