-- ============================================================
-- YUMYUMPO — Migration 002 · User Accounts + Social Discovery
-- Run AFTER migration-001-pathb.sql
-- ────────────────────────────────────────────────────────────
-- Adds the user account layer:
--   1. `profiles` table (1:1 with auth.users, with role-based admin gate)
--   2. `saved_places` — user's saved venues, optionally bucketed into custom lists
--   3. `venue_history` — auto-tracked discovery timeline
--   4. `user_searches` — Fred's memory for personalisation
--   5. `venue_reactions` — lightweight "like" signal for social proof
--   6. RLS policies — users see/edit only their own data
--   7. Auth trigger — profile auto-created on signup
--   8. CRITICAL: tightens existing admin RLS to require role='admin'
--      (without this, every public signup becomes an admin)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1.  PROFILES — extends auth.users with hospitality identity
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  display_name  TEXT,
  bio           TEXT,
  city          TEXT,
  avatar_url    TEXT,
  taste_tags    TEXT[] DEFAULT '{}',
  role          TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_role_idx     ON profiles(role) WHERE role = 'admin';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION profiles_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS profiles_updated_at_trg ON profiles;
CREATE TRIGGER profiles_updated_at_trg
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2.  SAVED PLACES — bookmarks, optionally organised into lists
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_places (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  list_name     TEXT DEFAULT 'Favorites',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, restaurant_id, list_name)
);

CREATE INDEX IF NOT EXISTS saved_places_user_idx       ON saved_places(user_id);
CREATE INDEX IF NOT EXISTS saved_places_restaurant_idx ON saved_places(restaurant_id);
CREATE INDEX IF NOT EXISTS saved_places_list_idx       ON saved_places(user_id, list_name);


-- ─────────────────────────────────────────────────────────────
-- 3.  VENUE HISTORY — discovery timeline
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  viewed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS venue_history_user_idx        ON venue_history(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS venue_history_restaurant_idx  ON venue_history(restaurant_id);


-- ─────────────────────────────────────────────────────────────
-- 4.  USER SEARCHES — Fred's memory for personalisation
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_searches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  source      TEXT,    -- 'fred' | 'discover' | 'hero'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_searches_user_idx ON user_searches(user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 5.  VENUE REACTIONS — lightweight "like" signal for social proof
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venue_reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  reaction      TEXT NOT NULL CHECK (reaction IN ('love','want-to-go','been-there')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, restaurant_id, reaction)
);

CREATE INDEX IF NOT EXISTS venue_reactions_restaurant_idx ON venue_reactions(restaurant_id);


-- ─────────────────────────────────────────────────────────────
-- 6.  AUTO-CREATE PROFILE ON SIGNUP
--     Reads Google OAuth metadata if present.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 7.  BACKFILL PROFILES FOR EXISTING USERS
--     (your admin account that was created earlier)
-- ─────────────────────────────────────────────────────────────
INSERT INTO profiles (id, display_name, avatar_url)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 8.  ADMIN GATE HELPER
--     Returns true if the calling user is an admin.
--     Used by all admin-write RLS policies.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 9.  RLS — profiles
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read profiles" ON profiles;
CREATE POLICY "public read profiles" ON profiles
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "own update profile" ON profiles;
CREATE POLICY "own update profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (role = 'user' OR is_admin()));
  -- A regular user cannot promote themselves to admin.

DROP POLICY IF EXISTS "admin manage profiles" ON profiles;
CREATE POLICY "admin manage profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());


-- ─────────────────────────────────────────────────────────────
-- 10. RLS — saved_places, venue_history, user_searches, venue_reactions
--     Each user only sees / writes their own rows.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE saved_places   ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_searches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own read saved" ON saved_places;
CREATE POLICY "own read saved" ON saved_places
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own write saved" ON saved_places;
CREATE POLICY "own write saved" ON saved_places
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own read history" ON venue_history;
CREATE POLICY "own read history" ON venue_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own insert history" ON venue_history;
CREATE POLICY "own insert history" ON venue_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own read searches" ON user_searches;
CREATE POLICY "own read searches" ON user_searches
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own insert searches" ON user_searches;
CREATE POLICY "own insert searches" ON user_searches
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Reactions are readable by everyone (for social proof counts) but only writable by owner
DROP POLICY IF EXISTS "public read reactions" ON venue_reactions;
CREATE POLICY "public read reactions" ON venue_reactions
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "own write reactions" ON venue_reactions;
CREATE POLICY "own write reactions" ON venue_reactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 11. CRITICAL — tighten existing admin RLS policies to require role='admin'
--     Migration 001 used `FOR ALL TO authenticated` which would grant
--     every public signup full edit rights. We replace those policies.
-- ─────────────────────────────────────────────────────────────

-- restaurants
DROP POLICY IF EXISTS "auth manage restaurants" ON restaurants;
CREATE POLICY "auth manage restaurants" ON restaurants
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- restaurant_tags
DROP POLICY IF EXISTS "auth manage restaurant_tags" ON restaurant_tags;
CREATE POLICY "auth manage restaurant_tags" ON restaurant_tags
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- menu_categories / menu_items / operating_hours / featured_restaurants / cuisine_categories
DROP POLICY IF EXISTS "auth manage menu_categories" ON menu_categories;
CREATE POLICY "auth manage menu_categories" ON menu_categories
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth manage menu_items" ON menu_items;
CREATE POLICY "auth manage menu_items" ON menu_items
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth manage operating_hours" ON operating_hours;
CREATE POLICY "auth manage operating_hours" ON operating_hours
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth manage featured_restaurants" ON featured_restaurants;
CREATE POLICY "auth manage featured_restaurants" ON featured_restaurants
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth manage cuisine_categories" ON cuisine_categories;
CREATE POLICY "auth manage cuisine_categories" ON cuisine_categories
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- restaurant_applications: only admins read/update
DROP POLICY IF EXISTS "auth read applications" ON restaurant_applications;
CREATE POLICY "auth read applications" ON restaurant_applications
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "auth update applications" ON restaurant_applications;
CREATE POLICY "auth update applications" ON restaurant_applications
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- AI tags + mood collections + analytics — same hardening
DROP POLICY IF EXISTS "admin all ai_search_queries" ON ai_search_queries;
CREATE POLICY "admin all ai_search_queries" ON ai_search_queries
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all restaurant_ai_tags" ON restaurant_ai_tags;
CREATE POLICY "admin all restaurant_ai_tags" ON restaurant_ai_tags
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin all mood_collections" ON mood_collections;
CREATE POLICY "admin all mood_collections" ON mood_collections
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- ─────────────────────────────────────────────────────────────
-- 12. SOCIAL PROOF VIEW — `venue_social_stats`
--     Aggregates saves + reactions per restaurant for "popular" indicators.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW venue_social_stats AS
SELECT
  r.id        AS restaurant_id,
  r.slug,
  COALESCE(s.save_count,     0)::INTEGER AS save_count,
  COALESCE(rx.love_count,    0)::INTEGER AS love_count,
  COALESCE(rx.wantgo_count,  0)::INTEGER AS want_to_go_count,
  COALESCE(rx.been_count,    0)::INTEGER AS been_there_count
FROM restaurants r
LEFT JOIN (
  SELECT restaurant_id, COUNT(*) AS save_count
  FROM saved_places GROUP BY restaurant_id
) s ON s.restaurant_id = r.id
LEFT JOIN (
  SELECT
    restaurant_id,
    COUNT(*) FILTER (WHERE reaction = 'love')        AS love_count,
    COUNT(*) FILTER (WHERE reaction = 'want-to-go')  AS wantgo_count,
    COUNT(*) FILTER (WHERE reaction = 'been-there')  AS been_count
  FROM venue_reactions GROUP BY restaurant_id
) rx ON rx.restaurant_id = r.id
WHERE r.is_active = TRUE;

GRANT SELECT ON venue_social_stats TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 13. CHECK YOUR PROFILE — verify your existing admin user
-- ─────────────────────────────────────────────────────────────
-- After running this migration, the user you already created in
-- Supabase Auth has a profile but is NOT yet an admin.
--
-- Run this in a SEPARATE query (substitute your email):
--
--   UPDATE profiles
--   SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');
--
-- Then verify:
--
--   SELECT u.email, p.role
--   FROM profiles p JOIN auth.users u ON u.id = p.id
--   WHERE p.role = 'admin';
-- ─────────────────────────────────────────────────────────────
