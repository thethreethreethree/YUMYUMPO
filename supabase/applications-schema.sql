-- ============================================================
-- YUMYUMPO — Restaurant Applications Schema
-- Run after schema.sql / analytics-schema.sql / ai-schema.sql
-- Stores incoming applications from /admin/apply.html
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurant_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Restaurant
  restaurant_name   TEXT NOT NULL,
  cuisine_type      TEXT,
  location          TEXT,           -- city / neighborhood
  about             TEXT,           -- short pitch (max ~500 chars)

  -- Owner / contact
  owner_name        TEXT,
  contact_email     TEXT NOT NULL,
  contact_phone     TEXT,

  -- Current digital footprint
  existing_website  TEXT,           -- their current site if any
  needs_website     BOOLEAN DEFAULT FALSE,   -- TRUE = they want YUMYUMPO to build one

  -- Workflow
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','reviewing','approved','rejected','onboarded')),
  admin_notes       TEXT,           -- internal review notes
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,

  -- Metadata
  source            TEXT,           -- e.g. 'homepage', 'card-funnel', 'restaurant-profile'
  referrer_url      TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applications_status_idx  ON restaurant_applications(status);
CREATE INDEX IF NOT EXISTS applications_created_idx ON restaurant_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS applications_email_idx   ON restaurant_applications(contact_email);


-- ── RLS — anonymous insert, authenticated read/manage ───────
ALTER TABLE restaurant_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit an application
CREATE POLICY "anon insert applications"
  ON restaurant_applications FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

-- Only authenticated admins can read / update
CREATE POLICY "auth read applications"
  ON restaurant_applications FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "auth update applications"
  ON restaurant_applications FOR UPDATE TO authenticated
  USING (TRUE);


-- ── Helper view for the admin dashboard ─────────────────────
CREATE OR REPLACE VIEW pending_applications AS
SELECT
  id,
  restaurant_name,
  cuisine_type,
  location,
  owner_name,
  contact_email,
  needs_website,
  existing_website,
  status,
  created_at
FROM restaurant_applications
WHERE status IN ('pending', 'reviewing')
ORDER BY created_at DESC;
