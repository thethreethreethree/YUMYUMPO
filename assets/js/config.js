/* ============================================================
   YUMYUMPO — Runtime Configuration
   ────────────────────────────────────────────────────────────
   This file IS committed to git on purpose. The Supabase anon
   public key is designed to be exposed in client code — RLS
   policies are the actual security boundary.

   NEVER put the following in this file:
     • The Supabase service role key
     • The Anthropic API key (it lives in Supabase Edge Function
       secrets only)
   ============================================================ */

window.YUMYUMPO_CONFIG = {

  /* ── Supabase project ────────────────────────────────────
     Settings → API in your Supabase dashboard.
  ───────────────────────────────────────────────────────── */
  SUPABASE_URL:      'https://ptpiwoyerjfgsyeyzrpl.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cGl3b3llcmpmZ3N5ZXl6cnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzYyNzAsImV4cCI6MjA5NDAxMjI3MH0.DyTMyhdHeZ1GNiPTh8U-tGyAGG9ZtgE53yCjM-eMJBY',

  /* ── AI endpoint (Fred) ──────────────────────────────────
     Full URL of your deployed Supabase Edge Function.
     Default pattern:
       https://<project>.supabase.co/functions/v1/ai-search
  ───────────────────────────────────────────────────────── */
  AI_ENDPOINT: 'https://ptpiwoyerjfgsyeyzrpl.supabase.co/functions/v1/ai-search',

  /* Menu-scan edge function — reads a menu photo and returns
     structured categories + items (Claude vision). */
  MENU_SCAN_ENDPOINT: 'https://ptpiwoyerjfgsyeyzrpl.supabase.co/functions/v1/menu-scan',

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
