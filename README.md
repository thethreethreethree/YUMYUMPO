# YUMYUMPO
### AI-Powered Restaurant Discovery + Hosting Ecosystem

> Discover restaurants worth remembering.

YUMYUMPO is a modern, tourism-focused restaurant discovery platform. It is **not a food delivery app** — it is a visibility, discovery, and hosting platform for restaurants.

---

## What It Does

| Feature | Description |
|---|---|
| **AI Discovery** | Conversational search — "Best sunset dinner near me" |
| **Restaurant Profiles** | Beautiful, immersive mini-websites for every restaurant |
| **Hosted Mini-Websites** | Restaurants without websites get a professional hosted page |
| **Analytics Dashboard** | Track profile views, WhatsApp clicks, website redirects |
| **Admin Dashboard** | Manage listings, featured spots, and platform content |
| **Tourism Focused** | Curated sections for travelers exploring new cities |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 + Tailwind CSS + Vanilla JavaScript |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Hosting | Vercel (primary) / GitHub Pages (static fallback) |
| AI | Claude API (architecture ready — connect via Edge Function) |
| Maps | Google Maps Embed API |
| Images | Supabase Storage |

---

## Project Structure

```
YUMYUMPO/
├── index.html              # Homepage
├── restaurant.html         # Restaurant profile page (dynamic via ?slug=)
├── vercel.json             # Vercel deployment config + rewrites
├── .env.example            # Environment variable template
│
├── admin/
│   └── index.html          # Admin dashboard
│
├── assets/
│   ├── css/
│   │   └── styles.css      # Custom styles (layered on Tailwind)
│   ├── js/
│   │   ├── supabase-client.js  # Supabase SDK init + data helpers
│   │   ├── main.js             # Homepage logic + card rendering
│   │   ├── restaurant.js       # Restaurant profile page logic
│   │   └── admin.js            # Admin dashboard logic
│   └── images/             # Local static images (if any)
│
└── supabase/
    └── schema.sql          # Full PostgreSQL schema + seed data + RLS
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/yumyumpo.git
cd yumyumpo
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New Query** and run these files **in order**:
   - `supabase/schema.sql` (core tables + RLS + seed data)
   - `supabase/analytics-schema.sql` (sessions, daily stats, search log)
   - `supabase/ai-schema.sql` (Fred's mood collections + AI tags)
3. Open **Authentication → Users** and create your admin user.
4. Copy your `Project URL` and `anon public` key from **Settings → API**.

### 3. Configure the Frontend

```bash
cp assets/js/config.example.js assets/js/config.js
```

Open `assets/js/config.js` and fill in:

```js
SUPABASE_URL:      'https://YOUR_PROJECT_ID.supabase.co',
SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_PUBLIC_KEY',
AI_ENDPOINT:       'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-search',
MODE:              'production',
```

> `config.js` is git-ignored. Never commit it. The Supabase anon key is safe to ship (RLS protects your data); other keys must stay server-side.

### 4. Deploy the Fred Edge Function (for AI search)

```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy ai-search
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
# Optional: lock CORS to your domain
supabase secrets set ALLOWED_ORIGIN=https://yumyumpo.com
```

Without this step Fred still works using local intelligence — Claude is purely an enhancement layer.

### 5. Run Locally

```bash
# Python
python -m http.server 3000

# Node.js
npx serve .
```

Then open `http://localhost:3000`

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) → Import Project.

---

## Deploy to GitHub Pages

Push to `main` branch → Settings → Pages → Source: `main` → Save.

---

## Adding Your First Restaurant

1. Open `/admin`
2. Click **Add Restaurant**
3. Fill in the details + paste image URLs from Supabase Storage
4. Click **Save Restaurant**

---

## Meet Fred

**Fred** is YUMYUMPO's Food & Restaurant Experience Discovery AI (`ai-search.html`). Architecture lives in `assets/js/ai-search.js`:

- 5-layer local engine: query parser → recommendation scorer → response generator → conversation memory → Claude proxy
- Fred works fully offline. Claude is an optional enhancement layer that gets routed through the Supabase Edge Function — your `ANTHROPIC_API_KEY` is never exposed to the browser.

---

## Analytics Events Tracked

`card_click` · `profile_view` · `website_click` (external) · `website_click:profile` (YUMYUMPO-hosted) · `search` · `fred_search` · `cuisine_filter` · `scroll_depth` · `time_on_page`

---

## License

MIT — free to use, modify, and distribute.
