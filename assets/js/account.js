/* ============================================================
   YUMYUMPO — Account state + actions
   ────────────────────────────────────────────────────────────
   The runtime layer that ties the user account system together.

   Responsibilities:
     • Hold the current session + profile in window.YYP.account
     • Inject an avatar / sign-in button into every page's nav
     • Provide save/unsave/isSaved + listSaved
     • Track venue views into venue_history (debounced)
     • Track searches into user_searches (Fred's memory)
     • Sync legacy localStorage saves on first sign-in
     • Expose a custom `yyp:account-ready` event so dependent
       UI can wait for first profile load.
   ============================================================ */

'use strict';

(function () {
  if (window.YYP?.account) return; // singleton

  /* Lazy-inject account.css if not already present on the page.
     Path is resolved relative to this script's location. */
  (function ensureStylesheet() {
    if (document.querySelector('link[href*="account.css"]')) return;
    const myScript = document.currentScript || [...document.scripts].find(s => s.src.includes('/account.js'));
    if (!myScript) return;
    const cssHref = myScript.src.replace(/[^/]+$/, '').replace(/\/js\/$/, '/css/') + 'account.css';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  })();

  /* ── state ──────────────────────────────────────────────── */
  const state = {
    session:        null,
    profile:        null,
    savedSlugs:     new Set(),
    savedLoaded:    false,
    historyByRest:  new Map(),    // restaurant_id → last viewed timestamp (dedup)
  };

  /* ── helpers ────────────────────────────────────────────── */
  const client = () => window.YYP?.client;

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── session bootstrap ──────────────────────────────────── */
  async function loadSession() {
    const c = client();
    if (!c) return null;
    const { data: { session } } = await c.auth.getSession();
    state.session = session || null;
    if (session) await loadProfile();
    return session;
  }

  async function loadProfile() {
    const c = client();
    if (!c || !state.session) { state.profile = null; return null; }

    const { data, error } = await c.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
    if (error) { console.warn('[account] loadProfile:', error.message); return null; }
    state.profile = data || null;
    emit('yyp:account-ready', { session: state.session, profile: state.profile });
    return state.profile;
  }


  /* ── saved places ───────────────────────────────────────── */
  async function loadSaved() {
    const c = client();
    if (!c || !state.session) { state.savedLoaded = true; return []; }

    const { data, error } = await c
      .from('saved_places')
      .select('restaurant_id, list_name, created_at, restaurants(id, slug, name, cuisine_type, location, google_rating, review_count, cover_image_url, has_yumyumpo_site, website_url, ai_summary)')
      .eq('user_id', state.session.user.id)
      .order('created_at', { ascending: false });

    state.savedLoaded = true;
    if (error) { console.warn('[account] loadSaved:', error.message); return []; }

    state.savedSlugs = new Set((data || []).map(r => r.restaurants?.slug).filter(Boolean));
    return data || [];
  }

  function isSaved(slug) { return state.savedSlugs.has(slug); }

  async function saveVenue(slug, listName = 'Favorites') {
    const c = client();
    if (!c) return false;

    /* Guest? Save to localStorage and trigger auth modal */
    if (!state.session) {
      stashGuestSave(slug);
      const session = await window.YYP.requireAuth({
        intent: 'Sign in to save this place to your favorites'
      });
      if (!session) return false;
      /* requireAuth doesn't refresh state directly; wait for our listener */
      await loadSession();
      await syncGuestSaves();
    }

    /* Resolve slug → restaurant UUID */
    const { data: r } = await c.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!r) return false;

    const { error } = await c.from('saved_places').insert([{
      user_id:       state.session.user.id,
      restaurant_id: r.id,
      list_name:     listName,
    }]);
    if (error && error.code !== '23505') { /* 23505 = unique violation, already saved */
      console.warn('[account] saveVenue:', error.message);
      return false;
    }
    state.savedSlugs.add(slug);
    emit('yyp:saved-changed', { slug, saved: true });
    return true;
  }

  async function unsaveVenue(slug, listName = 'Favorites') {
    const c = client();
    if (!c || !state.session) return false;

    const { data: r } = await c.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!r) return false;

    const { error } = await c.from('saved_places')
      .delete()
      .eq('user_id', state.session.user.id)
      .eq('restaurant_id', r.id)
      .eq('list_name', listName);

    if (error) { console.warn('[account] unsaveVenue:', error.message); return false; }
    state.savedSlugs.delete(slug);
    emit('yyp:saved-changed', { slug, saved: false });
    return true;
  }

  async function toggleSaved(slug) {
    if (isSaved(slug)) return unsaveVenue(slug).then(() => false);
    return saveVenue(slug).then(ok => ok);
  }

  /* Guest save buffer — merges to Supabase on first sign-in */
  const LS_GUEST_KEY = 'yyp_guest_saves';

  function stashGuestSave(slug) {
    try {
      const arr = JSON.parse(localStorage.getItem(LS_GUEST_KEY) || '[]');
      if (!arr.includes(slug)) arr.push(slug);
      localStorage.setItem(LS_GUEST_KEY, JSON.stringify(arr));
    } catch {}
  }

  async function syncGuestSaves() {
    if (!state.session) return;
    let pending = [];
    try { pending = JSON.parse(localStorage.getItem(LS_GUEST_KEY) || '[]'); } catch {}
    if (!pending.length) return;

    const c = client();
    const { data: rows } = await c.from('restaurants').select('id, slug').in('slug', pending);
    if (!rows?.length) { localStorage.removeItem(LS_GUEST_KEY); return; }

    const inserts = rows.map(r => ({
      user_id:       state.session.user.id,
      restaurant_id: r.id,
      list_name:     'Favorites',
    }));
    await c.from('saved_places').upsert(inserts, { onConflict: 'user_id,restaurant_id,list_name' });
    localStorage.removeItem(LS_GUEST_KEY);
    rows.forEach(r => state.savedSlugs.add(r.slug));
  }


  /* ── history tracking (debounced per restaurant) ────────── */
  const HISTORY_DEBOUNCE_MS = 60 * 60 * 1000; // 1 hour
  async function recordView(slug) {
    if (!state.session) return;
    const c = client();
    if (!c) return;

    const { data: r } = await c.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!r) return;

    const last = state.historyByRest.get(r.id) || 0;
    if (Date.now() - last < HISTORY_DEBOUNCE_MS) return;
    state.historyByRest.set(r.id, Date.now());

    await c.from('venue_history').insert([{
      user_id:       state.session.user.id,
      restaurant_id: r.id,
    }]);
  }

  async function listHistory(limit = 50) {
    if (!state.session) return [];
    const c = client();
    const { data, error } = await c
      .from('venue_history')
      .select('viewed_at, restaurants(id, slug, name, cuisine_type, location, cover_image_url, google_rating)')
      .eq('user_id', state.session.user.id)
      .order('viewed_at', { ascending: false })
      .limit(limit);
    if (error) { console.warn('[account] listHistory:', error.message); return []; }
    return data || [];
  }


  /* ── search memory (Fred + discover) ────────────────────── */
  async function recordSearch(query, source = 'fred') {
    if (!state.session || !query?.trim()) return;
    const c = client();
    await c.from('user_searches').insert([{
      user_id: state.session.user.id,
      query:   query.trim(),
      source,
    }]);
  }


  /* ── avatar upload ───────────────────────────────────────
     Uploads to the `avatars` storage bucket at `<user_id>/avatar.<ext>`
     so the RLS policy restricting writes to your own folder works.
     Returns the new public URL, or null on failure. */
  async function uploadAvatar(file) {
    if (!state.session) return null;
    const c = client();
    if (!c) return null;

    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      throw new Error('Please pick a JPG, PNG, WEBP, or GIF image.');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Image must be smaller than 2 MB.');
    }

    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    /* One canonical path per user — overwrite each upload. */
    const path = `${state.session.user.id}/avatar.${ext}`;

    const { error: upErr } = await c.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (upErr) {
      console.warn('[account] avatar upload:', upErr.message);
      throw new Error(upErr.message || 'Upload failed.');
    }

    /* Get the public URL + cache-bust so the new image shows immediately */
    const { data: { publicUrl } } = c.storage.from('avatars').getPublicUrl(path);
    const busted = `${publicUrl}?t=${Date.now()}`;

    await updateProfile({ avatar_url: busted });
    return busted;
  }


  /* ── profile updates ────────────────────────────────────── */
  async function updateProfile(patch) {
    if (!state.session) return false;
    const c = client();
    const safe = { ...patch };
    delete safe.id; delete safe.role; delete safe.created_at;
    const { data, error } = await c.from('profiles').update(safe).eq('id', state.session.user.id).select().maybeSingle();
    if (error) { console.warn('[account] updateProfile:', error.message); return false; }
    state.profile = data;
    emit('yyp:profile-updated', { profile: state.profile });
    return true;
  }


  /* ── sign out ───────────────────────────────────────────── */
  async function signOut() {
    const c = client();
    if (c) await c.auth.signOut();
    state.session = null;
    state.profile = null;
    state.savedSlugs.clear();
    emit('yyp:account-signed-out');
    /* Redirect home if currently on a protected page */
    if (location.pathname.includes('/account/')) {
      window.location.href = location.pathname.replace(/.*\/account\//, '/').split('/account/')[0] || '/';
    }
  }


  /* ── nav UI injection ───────────────────────────────────── */
  function buildAvatarMarkup(profile) {
    const name = profile?.display_name || profile?.username || 'You';
    const initial = (name[0] || '?').toUpperCase();
    const avatar  = profile?.avatar_url
      ? `<img src="${esc(profile.avatar_url)}" alt="${esc(name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(initial)}',style:'font-weight:800'}))" />`
      : `<span style="font-weight:800;font-size:.875rem">${esc(initial)}</span>`;
    return `
      <div class="yyp-avatar-wrap" data-yyp-avatar>
        <button class="yyp-avatar-btn" type="button" aria-label="Account menu" aria-haspopup="true">
          <span class="yyp-avatar">${avatar}</span>
        </button>
        <div class="yyp-avatar-menu">
          <div class="yyp-avatar-menu-head">
            <p class="yyp-avatar-menu-name">${esc(name)}</p>
            ${profile?.username ? `<p class="yyp-avatar-menu-handle">@${esc(profile.username)}</p>` : ''}
          </div>
          <a href="${rootHref()}account/index.html" class="yyp-avatar-menu-item">👤 My Profile</a>
          <a href="${rootHref()}account/saved.html"  class="yyp-avatar-menu-item">❤️ Saved Places</a>
          <a href="${rootHref()}account/history.html" class="yyp-avatar-menu-item">🕓 Discovery History</a>
          ${state.profile?.role === 'admin' ? `<a href="${rootHref()}admin/index.html" class="yyp-avatar-menu-item">⚙️ Admin Dashboard</a>` : ''}
          <button class="yyp-avatar-menu-item yyp-avatar-menu-signout" type="button" data-signout>↪ Sign Out</button>
        </div>
      </div>
    `;
  }

  function buildSignInMarkup() {
    return `
      <button class="yyp-signin-btn" type="button" data-yyp-signin>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
        Sign In
      </button>
    `;
  }

  /* Compute base href for cross-page nav (handles admin/* pages) */
  function rootHref() {
    return location.pathname.includes('/admin/') || location.pathname.includes('/account/') ? '../' : '';
  }

  function injectNavUI() {
    const navs = document.querySelectorAll('nav');
    navs.forEach(nav => {
      /* Skip if we've already injected here */
      if (nav.querySelector('[data-yyp-nav-slot]')) {
        renderNavSlot(nav);
        return;
      }
      /* Find the rightmost cluster of nav buttons */
      const ctaCluster = nav.querySelector('.flex.items-center.gap-3:last-of-type, .flex.items-center.gap-2:last-of-type');
      if (!ctaCluster) return;

      const slot = document.createElement('span');
      slot.dataset.yypNavSlot = '';
      slot.style.display = 'inline-flex';
      slot.style.alignItems = 'center';
      ctaCluster.insertBefore(slot, ctaCluster.firstChild);
      renderNavSlot(nav);
    });
  }

  function renderNavSlot(nav) {
    const slot = nav.querySelector('[data-yyp-nav-slot]');
    if (!slot) return;
    slot.innerHTML = state.session && state.profile
      ? buildAvatarMarkup(state.profile)
      : buildSignInMarkup();

    const signinBtn = slot.querySelector('[data-yyp-signin]');
    if (signinBtn) signinBtn.addEventListener('click', () => window.YYP.openAuthModal());

    const avatarWrap = slot.querySelector('[data-yyp-avatar]');
    if (avatarWrap) {
      const btn = avatarWrap.querySelector('.yyp-avatar-btn');
      const menu = avatarWrap.querySelector('.yyp-avatar-menu');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        avatarWrap.classList.toggle('is-open');
      });
      avatarWrap.querySelector('[data-signout]')?.addEventListener('click', signOut);
      document.addEventListener('click', () => avatarWrap.classList.remove('is-open'));
    }
  }


  /* ── auth state listener ──────────────────────────────── */
  document.addEventListener('yyp:auth', async (e) => {
    const { event, session } = e.detail || {};
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      state.session = session;
      await loadProfile();
      await syncGuestSaves();
      await loadSaved();
      injectNavUI();
    } else if (event === 'SIGNED_OUT') {
      state.session = null;
      state.profile = null;
      state.savedSlugs.clear();
      injectNavUI();
    }
  });


  /* ── init ───────────────────────────────────────────────── */
  async function init() {
    await loadSession();
    if (state.session) await loadSaved();
    injectNavUI();
    emit('yyp:account-ready', { session: state.session, profile: state.profile });
  }

  if (window.YYP?.ready) init();
  else document.addEventListener('yyp:ready', init, { once: true });

  /* Re-inject nav after small delay in case the nav was rendered late */
  document.addEventListener('DOMContentLoaded', () => setTimeout(injectNavUI, 100));


  /* ── public API ────────────────────────────────────────── */
  window.YYP = window.YYP || {};
  window.YYP.account = {
    get session()  { return state.session; },
    get profile()  { return state.profile; },
    get isSignedIn() { return !!state.session; },

    loadSession,
    loadProfile,
    loadSaved,
    listHistory,
    isSaved,
    saveVenue,
    unsaveVenue,
    toggleSaved,
    recordView,
    recordSearch,
    updateProfile,
    uploadAvatar,
    signOut,
    injectNavUI,
  };

})();
