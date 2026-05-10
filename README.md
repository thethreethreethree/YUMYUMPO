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

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Settings → API** and copy your `Project URL` and `anon public` key

### 3. Connect the Frontend

Open `assets/js/supabase-client.js` and update:

```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Run Locally

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

## AI Search Integration (Future)

Architecture is ready. To activate:

1. Create a **Supabase Edge Function** (secure proxy)
2. Call Claude API from the Edge Function with the user's query
3. Return semantic recommendations from the database
4. Wire the frontend search bar to the Edge Function

**Never expose `ANTHROPIC_API_KEY` on the frontend.**

---

## Analytics Events Tracked

`card_click` · `profile_view` · `whatsapp_click` · `website_click` · `messenger_click` · `call_click` · `search` · `cuisine_filter`

---

## License

MIT — free to use, modify, and distribute.
