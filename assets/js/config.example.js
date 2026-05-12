/* ============================================================
   YUMYUMPO — Runtime Configuration
   ────────────────────────────────────────────────────────────
   1. Copy this file to `assets/js/config.js`
   2. Replace every YOUR_* placeholder with your real value
   3. NEVER commit `config.js` — it is git-ignored

   The Supabase anon key is safe to expose publicly (Row Level
   Security protects your data). Treat it as you would any
   client-side API key.
   ============================================================ */

window.YUMYUMPO_CONFIG = {

  /* ── Supabase project ────────────────────────────────────
     Settings → API in your Supabase dashboard.
  ───────────────────────────────────────────────────────── */
  SUPABASE_URL:      'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_PUBLIC_KEY',

  /* ── AI endpoint (Fred) ──────────────────────────────────
     Full URL of your deployed Supabase Edge Function.
     Default pattern:
       https://<project>.supabase.co/functions/v1/ai-search
  ───────────────────────────────────────────────────────── */
  AI_ENDPOINT: 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-search',

  /* ── Runtime mode ────────────────────────────────────────
     'production' — strict auth, no demo bypass, no debug logs
     'development' — allows demo Supabase fallback to static data
  ───────────────────────────────────────────────────────── */
  MODE: 'production',

  /* ── App ─────────────────────────────────────────────────
     Used for absolute URLs in OG tags + edge function CORS.
  ───────────────────────────────────────────────────────── */
  APP_URL: 'https://yumyumpo.com',
};
