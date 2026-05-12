# YUMYUMPO — Launch Checklist

This is the **definitive deployment guide**. Follow top to bottom.

---

## ✅ Already done

- [x] All four SQL files run in Supabase (`schema`, `analytics-schema`, `ai-schema`, `applications-schema`)
- [x] **Migration 001** run (`migration-001-pathb.sql`) — adds `has_yumyumpo_site`, RLS write policies, seeds 18 real restaurants
- [x] Admin user created in Supabase Authentication
- [x] `assets/js/config.js` populated with real Supabase URL + anon key
- [x] All pages tested locally and serving correctly

---

## 🔨 What YOU still need to do before deploying

### Step 1 — Create the storage bucket (2 min)

The admin photo uploader writes to a Supabase Storage bucket called **`restaurant-images`**. It doesn't exist yet — first upload will 404 without it.

1. Open **Supabase dashboard → Storage**
2. Click **New bucket** → name it **`restaurant-images`** → **toggle "Public bucket" ON** → Create
3. Click into the new bucket → **Policies** tab → **New policy → For full customization**
4. Add **two policies**:

**Read policy (anyone can view):**
- Name: `public read`
- Allowed operation: `SELECT`
- Target roles: `anon, authenticated`
- USING expression: `true`

**Write policy (admin only):**
- Name: `auth upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- USING expression: `true`
- WITH CHECK expression: `true`

You can also paste this in **SQL Editor** instead of clicking through the UI:

```sql
-- Allow anyone to read images
CREATE POLICY "public read restaurant-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-images');

-- Allow authenticated admin to upload
CREATE POLICY "auth upload restaurant-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'restaurant-images');

-- Allow authenticated admin to delete / replace
CREATE POLICY "auth manage restaurant-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'restaurant-images');
```

---

### Step 2 — Deploy Fred's Claude edge function (10 min, optional)

Fred works without this — he uses local intelligence. But if you want Claude-enhanced responses:

1. Install Supabase CLI: <https://supabase.com/docs/guides/cli>
2. Get your **Anthropic API key** from <https://console.anthropic.com>
3. In PowerShell from the project folder:

```powershell
supabase login
supabase link --project-ref ptpiwoyerjfgsyeyzrpl
supabase functions deploy ai-search --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_REAL_KEY
```

The `--no-verify-jwt` flag is **critical** — without it, every Fred query gets a 401. (We could send the anon key from the browser instead, but `--no-verify-jwt` is simpler and equally safe because the function itself is rate-limited and tied to your project.)

To test it worked:

```powershell
curl -X POST https://ptpiwoyerjfgsyeyzrpl.supabase.co/functions/v1/ai-search `
  -H "Content-Type: application/json" `
  -d '{"query":"best ramen","restaurants":[]}'
```

You should get JSON back with `opening` / `closing` / `followUp` fields.

---

### Step 3 — Decide where to deploy

**Option A: GitHub Pages (free, simple)**
- Free
- Public repo only (or paid plan)
- Custom domain works
- Limitations: `vercel.json` redirects won't apply

**Option B: Vercel (recommended)**
- Free for personal use
- Works with private repos
- Honors `vercel.json` redirects (`/signup`, `/apply`, `/login` clean URLs)
- Better OG image / preview support

---

### Step 4A — Deploy to Vercel

1. Push your code to GitHub:

```powershell
cd c:\Users\johns\OneDrive\Documents\GitHub\YUMYUMPO
git add .
git commit -m "Production-ready: Supabase wiring, applications form, full backend"
git push
```

> **Note**: `assets/js/config.js` is `.gitignore`d. You have two choices:
> - **(simplest)** Remove `assets/js/config.js` from `.gitignore` and commit it. The Supabase **anon key is safe to expose publicly** — RLS protects your data. This is the documented approach for client-side Supabase apps.
> - **(stricter)** Use Vercel's "Edit Files" UI after first deploy to add `config.js` manually.

2. Go to <https://vercel.com> → sign up with GitHub → **Import Project** → pick your repo → click **Deploy**
3. Wait 1-2 minutes → you'll get a URL like `https://yumyumpo-xyz.vercel.app`
4. (Optional) Add a custom domain under **Settings → Domains**

---

### Step 4B — Deploy to GitHub Pages

1. Same `git push` as above (and un-ignore `config.js` if you choose)
2. Repo → **Settings → Pages**
3. Source: **Deploy from a branch** · Branch: `main` · Folder: `/ (root)` · Save
4. Wait 1-2 min → live at `https://YOUR_USERNAME.github.io/YUMYUMPO/`

---

## 🧪 Post-deploy smoke test

Once live, test these flows in order. Each should work flawlessly:

1. **Homepage** loads — stats strip shows real numbers (18 restaurants, ~14 cities)
2. **Click any restaurant card** → opens its profile page with the correct content
3. **Discover page** — 18 restaurants visible, filters work, search works
4. **Ask Fred** — type "best ramen in Makati" → cards render
5. **Apply form** — fill out, submit, success state appears
6. **Admin sign-in** at `/admin/login.html` with your Supabase credentials
7. **Admin dashboard** — Applications tab shows your test submission
8. **Edit a restaurant** in admin → save → refresh homepage → change persists
9. **Mobile** — open homepage on a phone, hamburger menu works, all links reachable
10. **404** — visit a fake URL like `/restaurant.html?slug=does-not-exist` → graceful empty state

---

## 🛡️ Security checks

- [ ] Verify `config.js` is the **only** place your Supabase credentials live
- [ ] Never commit your **service-role** key (only the `anon` key is safe to expose)
- [ ] Never commit your **Anthropic API key** (only used in the edge function via `supabase secrets set`)
- [ ] Test that an anonymous browser session **cannot** edit/delete restaurants (RLS should block it)
- [ ] Test that a logged-out user trying to hit `/admin/index.html` or `/analytics.html` gets redirected to `/admin/login.html`

---

## 🐛 Known limitations / "coming next"

These are intentionally **not** blockers for v1 launch — they're the natural next batch of features once you have real traffic:

| Item | Status | When to fix |
|---|---|---|
| Real-time view counters on admin cards | Shows "—" placeholder | Once analytics has a week of real data |
| Operating hours per restaurant | Not seeded; section hides on profiles | When you have time to add via admin |
| Menu items per restaurant | Empty; menu section hides | Same |
| Tag taxonomy as master table | In-memory only in admin | Schema migration needed if you want a global tag manager |
| Tailwind production build | Using CDN (warning in console) | Before high-traffic launch |
| Email confirmations to applicants | Manual via Supabase Auth | Wire to Supabase Edge Function (or Resend/Postmark) later |

---

## 🆘 If something breaks

1. **Check the browser console** (F12 → Console) — most issues show up there
2. **Check Supabase logs**: Dashboard → Logs → All recent requests
3. **Verify your `config.js`** has the real URL + anon key (no `YOUR_PROJECT_ID` placeholders)
4. **Check RLS**: Dashboard → Authentication → Policies — every table should have policies visible

---

You're shipping a real platform. Be proud of it. 🚀
