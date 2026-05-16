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

  /* Return the names of all custom lists this user has ever used. */
  async function listCustomLists() {
    if (!state.session) return ['Favorites'];
    const c = client();
    const { data, error } = await c.from('saved_places')
      .select('list_name')
      .eq('user_id', state.session.user.id);
    if (error) return ['Favorites'];
    const set = new Set(['Favorites']);
    (data || []).forEach(r => { if (r.list_name) set.add(r.list_name); });
    return [...set];
  }

  /* Move a saved place between lists. */
  async function moveSavedToList(slug, fromList, toList) {
    if (!state.session) return false;
    const c = client();
    const { data: r } = await c.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!r) return false;

    /* Insert into new list first (avoids the unique constraint on the existing row) */
    const { error: insErr } = await c.from('saved_places').insert([{
      user_id: state.session.user.id, restaurant_id: r.id, list_name: toList,
    }]);
    /* 23505 = already exists in that list */
    if (insErr && insErr.code !== '23505') return false;

    /* Delete from old list */
    if (fromList && fromList !== toList) {
      await c.from('saved_places').delete()
        .eq('user_id', state.session.user.id)
        .eq('restaurant_id', r.id)
        .eq('list_name', fromList);
    }
    emit('yyp:saved-changed', { slug, saved: true });
    return true;
  }

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


  /* ── venue follows ──────────────────────────────────────
     Subscribe/unsubscribe to a restaurant's announcement feed. */
  let followedIds = new Set();
  let followedSlugs = new Set();
  let followsLoaded = false;

  async function loadFollows() {
    if (!state.session) { followsLoaded = true; return; }
    const c = client();
    const { data, error } = await c.from('venue_follows')
      .select('restaurant_id, restaurants(slug)')
      .eq('user_id', state.session.user.id);
    followsLoaded = true;
    if (error) return;
    followedIds   = new Set((data || []).map(r => r.restaurant_id));
    followedSlugs = new Set((data || []).map(r => r.restaurants?.slug).filter(Boolean));
  }

  function isFollowing(slug) { return followedSlugs.has(slug); }

  async function followVenue(slug) {
    if (!state.session) {
      const session = await window.YYP.requireAuth({
        intent: 'Sign in to follow this venue and get their updates',
      });
      if (!session) return false;
      await loadSession(); await loadFollows();
    }
    const c = client();
    const { data: r } = await c.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!r) return false;
    const { error } = await c.from('venue_follows').insert([{
      user_id: state.session.user.id, restaurant_id: r.id,
    }]);
    if (error && error.code !== '23505') return false;
    followedIds.add(r.id); followedSlugs.add(slug);
    emit('yyp:follows-changed', { slug, following: true });
    return true;
  }

  async function unfollowVenue(slug) {
    if (!state.session) return false;
    const c = client();
    const { data: r } = await c.from('restaurants').select('id').eq('slug', slug).maybeSingle();
    if (!r) return false;
    await c.from('venue_follows').delete()
      .eq('user_id', state.session.user.id)
      .eq('restaurant_id', r.id);
    followedIds.delete(r.id); followedSlugs.delete(slug);
    emit('yyp:follows-changed', { slug, following: false });
    return true;
  }

  async function toggleFollow(slug) {
    if (isFollowing(slug)) return unfollowVenue(slug).then(() => false);
    return followVenue(slug);
  }

  async function getFeed(limit = 50) {
    if (!state.session) return [];
    const c = client();
    const { data, error } = await c.rpc('get_my_feed', { p_limit: limit });
    if (error) { console.warn('[account] getFeed:', error.message); return []; }
    return data || [];
  }


  /* ── reactions ─────────────────────────────────────────────
     Three reaction types: 'love' | 'want-to-go' | 'been-there' */
  async function getReactions(slug) {
    const c = client();
    if (!c) return null;
    const { data, error } = await c.rpc('get_reactions', { p_slug: slug });
    if (error) { console.warn('[account] getReactions:', error.message); return null; }
    return data;
  }

  async function setReaction(slug, reaction) {
    if (!state.session) {
      const session = await window.YYP.requireAuth({
        intent: 'Sign in to leave a reaction on this place'
      });
      if (!session) return null;
    }
    const c = client();
    const { data, error } = await c.rpc('set_reaction', { p_slug: slug, p_reaction: reaction });
    if (error) { console.warn('[account] setReaction:', error.message); return null; }
    return data;
  }


  /* ── social discovery ──────────────────────────────────── */
  async function getPeopleAlsoSaved(slug, limit = 4) {
    const c = client();
    if (!c) return [];
    const { data, error } = await c.rpc('people_also_saved', { target_slug: slug, p_limit: limit });
    if (error) { console.warn('[account] peopleAlsoSaved:', error.message); return []; }
    return data || [];
  }

  async function getTrendingThisWeek(limit = 8) {
    const c = client();
    if (!c) return [];
    const { data, error } = await c.rpc('trending_this_week', { p_limit: limit });
    if (error) { console.warn('[account] trending:', error.message); return []; }
    return data || [];
  }

  async function getActivityByLocation(hours = 24) {
    const c = client();
    if (!c) return [];
    const { data, error } = await c.rpc('activity_by_location', { p_hours: hours });
    if (error) { console.warn('[account] activity:', error.message); return []; }
    return data || [];
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
          <a href="${rootHref()}account/feed.html"    class="yyp-avatar-menu-item">📣 Following</a>
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

      /* Preferred: an existing rightmost cluster of nav buttons. */
      let host = nav.querySelector('.flex.items-center.gap-3:last-of-type, .flex.items-center.gap-2:last-of-type');

      /* Fallback: no cluster on this page's nav — build one and pin it
         to the top-right of the nav's main flex row so the avatar is
         consistent on EVERY page regardless of nav markup. */
      if (!host) {
        const row = nav.querySelector('.flex.items-center.justify-between')
                 || nav.querySelector('.flex.items-center')
                 || nav.querySelector(':scope > div')
                 || nav;
        host = document.createElement('div');
        host.className = 'flex items-center gap-3';
        host.style.marginLeft = 'auto';
        row.appendChild(host);
      }

      const slot = document.createElement('span');
      slot.dataset.yypNavSlot = '';
      slot.style.display = 'inline-flex';
      slot.style.alignItems = 'center';
      host.insertBefore(slot, host.firstChild);
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
      await loadFollows();
      injectNavUI();
    } else if (event === 'SIGNED_OUT') {
      state.session = null;
      state.profile = null;
      state.savedSlugs.clear();
      followedIds.clear(); followedSlugs.clear();
      injectNavUI();
    }
  });


  /* ── init ───────────────────────────────────────────────── */
  async function init() {
    await loadSession();
    if (state.session) {
      await loadSaved();
      await loadFollows();
    }
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
    listCustomLists,
    moveSavedToList,
    isFollowing,
    followVenue,
    unfollowVenue,
    toggleFollow,
    getFeed,
    getReactions,
    setReaction,
    getPeopleAlsoSaved,
    getTrendingThisWeek,
    getActivityByLocation,
  };


  /* ════════════════════════════════════════════════════════
     GLOBAL TOAST + LIST PICKER
     window.YYP.toast(message, options)
        options: { actionLabel, onAction, duration }
     window.YYP.openListPicker(slug, currentList) → opens a sheet
        that lets the user move/copy this venue between lists.
  ════════════════════════════════════════════════════════ */
  function ensureToastStyles() {
    if (document.getElementById('yyp-toast-styles')) return;
    const css = document.createElement('style');
    css.id = 'yyp-toast-styles';
    css.textContent = `
      .yyp-toast-stack {
        position: fixed;
        bottom: calc(env(safe-area-inset-bottom, 0) + 96px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 9998;
        display: flex; flex-direction: column-reverse; gap: 8px;
        pointer-events: none;
      }
      @media (min-width: 768px) {
        .yyp-toast-stack { bottom: 24px; }
      }
      .yyp-toast {
        display: inline-flex; align-items: center; gap: 12px;
        background: #111; color: #fff;
        border-radius: 999px;
        padding: 10px 8px 10px 18px;
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 600; font-size: .85rem;
        box-shadow: 0 12px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06);
        pointer-events: auto;
        opacity: 0; transform: translateY(20px);
        transition: all .35s cubic-bezier(.34,1.4,.64,1);
        max-width: calc(100vw - 32px);
      }
      .yyp-toast.is-in  { opacity: 1; transform: translateY(0); }
      .yyp-toast button.yyp-toast-action {
        background: #FFD000; color: #111;
        border: none;
        border-radius: 999px;
        padding: 6px 14px;
        font-family: inherit; font-weight: 800; font-size: .8rem;
        cursor: pointer;
        white-space: nowrap;
      }
      .yyp-toast button.yyp-toast-close {
        background: none; border: none; color: rgba(255,255,255,.5);
        cursor: pointer; padding: 4px 6px; font-size: 18px; line-height: 1;
      }
      .yyp-toast button.yyp-toast-close:hover { color: #fff; }
      .yyp-toast .yyp-toast-icon { color: #FFD000; flex-shrink: 0; }

      /* ── List picker sheet ───────────────────────────── */
      .yyp-picker-backdrop {
        position: fixed; inset: 0; z-index: 9997;
        background: rgba(0,0,0,.5); backdrop-filter: blur(4px);
        display: flex; align-items: flex-end; justify-content: center;
        padding: 16px;
        opacity: 0; pointer-events: none;
        transition: opacity .25s;
      }
      .yyp-picker-backdrop.is-open { opacity: 1; pointer-events: auto; }
      @media (min-width: 640px) {
        .yyp-picker-backdrop { align-items: center; }
      }
      .yyp-picker {
        background: #fff;
        border-radius: 28px 28px 0 0;
        width: 100%; max-width: 460px;
        padding: 24px;
        max-height: 80vh; overflow-y: auto;
        transform: translateY(40px);
        transition: transform .35s cubic-bezier(.34,1.4,.64,1);
      }
      @media (min-width: 640px) { .yyp-picker { border-radius: 28px; } }
      .yyp-picker-backdrop.is-open .yyp-picker { transform: translateY(0); }

      .yyp-picker-grip {
        width: 36px; height: 4px; border-radius: 2px;
        background: #E8E8E8; margin: 0 auto 16px;
      }
      .yyp-picker-title {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 800; font-size: 1.125rem;
        color: #111; letter-spacing: -.01em; margin-bottom: 6px;
      }
      .yyp-picker-sub {
        color: #6B6B6B; font-size: .85rem; margin-bottom: 18px;
      }
      .yyp-picker-list {
        display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;
      }
      .yyp-picker-item {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 14px;
        background: #F9F9F9;
        border: 1.5px solid transparent;
        border-radius: 14px;
        cursor: pointer;
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: .9rem; color: #111;
        text-align: left;
        transition: all .15s;
      }
      .yyp-picker-item:hover { background: #FFFDF0; border-color: rgba(255,208,0,.4); }
      .yyp-picker-item.is-on {
        background: #FFD000; border-color: #FFD000;
      }
      .yyp-picker-item .yyp-picker-check {
        margin-left: auto;
        width: 18px; height: 18px;
        border-radius: 50%;
        border: 2px solid #E8E8E8;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        background: #fff;
      }
      .yyp-picker-item.is-on .yyp-picker-check {
        background: #111; border-color: #111;
        color: #FFD000;
      }
      .yyp-picker-new {
        display: flex; gap: 8px;
        margin-top: 4px;
      }
      .yyp-picker-new input {
        flex: 1;
        background: #F9F9F9;
        border: 1.5px solid #E8E8E8;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: .875rem; color: #111;
        outline: none;
        font-family: 'Inter', sans-serif;
      }
      .yyp-picker-new input:focus { border-color: #FFD000; }
      .yyp-picker-new button {
        background: #111; color: #FFD000;
        border: none; border-radius: 12px;
        padding: 0 18px;
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 800; font-size: .8rem;
        cursor: pointer;
      }
      .yyp-picker-new button:disabled { opacity: .4; cursor: not-allowed; }
    `;
    document.head.appendChild(css);
  }

  function getToastStack() {
    let stack = document.getElementById('yyp-toast-stack');
    if (!stack) {
      ensureToastStyles();
      stack = document.createElement('div');
      stack.id = 'yyp-toast-stack';
      stack.className = 'yyp-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  window.YYP.toast = function (msg, opts = {}) {
    const stack = getToastStack();
    const el = document.createElement('div');
    el.className = 'yyp-toast';
    el.innerHTML = `
      <span class="yyp-toast-icon">${opts.icon || '✓'}</span>
      <span class="yyp-toast-msg">${esc(msg)}</span>
      ${opts.actionLabel ? `<button class="yyp-toast-action" type="button">${esc(opts.actionLabel)}</button>` : ''}
      <button class="yyp-toast-close" type="button" aria-label="Close">×</button>
    `;
    stack.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));

    const remove = () => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 400);
    };

    el.querySelector('.yyp-toast-close').addEventListener('click', remove);
    if (opts.actionLabel) {
      el.querySelector('.yyp-toast-action').addEventListener('click', () => {
        opts.onAction?.();
        remove();
      });
    }
    setTimeout(remove, opts.duration || 4000);
  };


  /* ── List picker sheet ─────────────────────────────────── */
  window.YYP.openListPicker = async function (slug, currentList = 'Favorites') {
    ensureToastStyles();
    if (!state.session) {
      const session = await window.YYP.requireAuth({ intent: 'Sign in to organize saved places' });
      if (!session) return;
    }

    const lists = await listCustomLists();
    const backdrop = document.createElement('div');
    backdrop.className = 'yyp-picker-backdrop';
    backdrop.innerHTML = `
      <div class="yyp-picker" role="dialog" aria-modal="true">
        <div class="yyp-picker-grip"></div>
        <h3 class="yyp-picker-title">Save to list</h3>
        <p class="yyp-picker-sub">Pick a list or create a new one.</p>
        <div class="yyp-picker-list">
          ${lists.map(l => `
            <button class="yyp-picker-item ${l === currentList ? 'is-on' : ''}" data-list="${esc(l)}">
              <span>${l === 'Favorites' ? '❤️' : '⭐'}</span>
              <span>${esc(l)}</span>
              <span class="yyp-picker-check">${l === currentList ? '✓' : ''}</span>
            </button>
          `).join('')}
        </div>
        <div class="yyp-picker-new">
          <input type="text" maxlength="40" placeholder="New list name…" />
          <button type="button" disabled>Create</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    const close = () => {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 280);
    };

    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    backdrop.querySelectorAll('.yyp-picker-item').forEach(b => {
      b.addEventListener('click', async () => {
        const newList = b.dataset.list;
        if (newList === currentList) { close(); return; }
        await moveSavedToList(slug, currentList, newList);
        window.YYP.toast(`Moved to "${newList}"`);
        close();
      });
    });

    const input    = backdrop.querySelector('.yyp-picker-new input');
    const createBtn = backdrop.querySelector('.yyp-picker-new button');
    input.addEventListener('input', () => { createBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !createBtn.disabled) createBtn.click(); });
    createBtn.addEventListener('click', async () => {
      const name = input.value.trim();
      if (!name) return;
      await moveSavedToList(slug, currentList, name);
      window.YYP.toast(`Saved to "${name}"`);
      close();
    });
  };

})();
