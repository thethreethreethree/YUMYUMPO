/* ============================================================
   YUMYUMPO — Auth Modal
   ────────────────────────────────────────────────────────────
   Drop-in sign-in modal usable from any page. Provides:
     • Google OAuth (primary)
     • Email + password sign-in / sign-up
     • "Continue as guest" path

   Public API (attached to window.YYP):
     window.YYP.requireAuth({intent})   → returns a Promise that resolves
                                          to the session if user signs in,
                                          or null if they continue as guest.

     window.YYP.openAuthModal({intent}) → opens the modal directly.

   The modal lazy-creates its own DOM on first open so we don't
   pollute every page's HTML.
   ============================================================ */

'use strict';

(function () {
  if (window.YYP?.authModal) return; // singleton

  /* ── inject styles once ─────────────────────────────────── */
  const STYLE_ID = 'yyp-auth-modal-styles';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .yyp-auth-backdrop {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(8, 8, 8, 0.7);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        opacity: 0; pointer-events: none;
        transition: opacity .25s ease;
      }
      .yyp-auth-backdrop.is-open { opacity: 1; pointer-events: auto; }

      .yyp-auth-card {
        background: #111;
        border-radius: 28px;
        width: 100%; max-width: 440px;
        overflow: hidden;
        position: relative;
        transform: translateY(20px) scale(.97);
        transition: transform .35s cubic-bezier(.34,1.4,.64,1);
        box-shadow: 0 30px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.05);
        max-height: 92vh; overflow-y: auto;
      }
      .yyp-auth-backdrop.is-open .yyp-auth-card { transform: translateY(0) scale(1); }

      /* hero ribbon at top */
      .yyp-auth-hero {
        background:
          radial-gradient(circle at 30% 30%, rgba(255,208,0,.35) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(255,208,0,.15) 0%, transparent 50%),
          #1A1A1A;
        padding: 36px 28px 24px;
        position: relative;
        text-align: center;
      }
      .yyp-auth-hero::after {
        content: ''; position: absolute; inset: 0;
        background-image: radial-gradient(circle at 1.2px 1.2px, rgba(255,255,255,.08) 1px, transparent 0);
        background-size: 28px 28px; opacity: .5; pointer-events: none;
      }
      .yyp-auth-logo {
        width: 64px; height: 64px;
        background: #FFD000;
        border-radius: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 2rem;
        box-shadow: 0 0 0 8px rgba(255,208,0,.15), 0 12px 32px rgba(255,208,0,.35);
        margin-bottom: 14px; position: relative; z-index: 1;
      }
      .yyp-auth-title {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 800; font-size: 1.5rem; color: #fff;
        letter-spacing: -.02em; line-height: 1.2;
        margin-bottom: 6px; position: relative; z-index: 1;
      }
      .yyp-auth-sub {
        font-size: .875rem; color: rgba(255,255,255,.6);
        line-height: 1.55; max-width: 340px; margin: 0 auto;
        position: relative; z-index: 1;
      }

      .yyp-auth-body { padding: 22px 28px 28px; background: #111; }

      .yyp-auth-close {
        position: absolute; top: 14px; right: 14px;
        width: 32px; height: 32px;
        background: rgba(255,255,255,.08);
        backdrop-filter: blur(6px);
        border-radius: 50%; border: none;
        display: flex; align-items: center; justify-content: center;
        color: rgba(255,255,255,.7); cursor: pointer;
        transition: all .15s; font-size: 18px; line-height: 1;
        z-index: 2;
      }
      .yyp-auth-close:hover { background: rgba(255,255,255,.18); color: #fff; }

      .yyp-auth-btn {
        width: 100%;
        display: inline-flex; align-items: center; justify-content: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: 14px;
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: .9375rem;
        border: none; cursor: pointer;
        transition: all .18s ease;
        letter-spacing: -.01em;
      }
      .yyp-auth-btn-google {
        background: #fff; color: #111;
      }
      .yyp-auth-btn-google:hover { background: #f3f3f3; transform: translateY(-1px); }

      .yyp-auth-btn-primary {
        background: #FFD000; color: #111;
        box-shadow: 0 6px 20px rgba(255,208,0,.3);
      }
      .yyp-auth-btn-primary:hover { background: #E6BB00; transform: translateY(-1px); }
      .yyp-auth-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

      .yyp-auth-btn-ghost {
        background: transparent; color: rgba(255,255,255,.6);
        font-weight: 600; font-size: .875rem;
      }
      .yyp-auth-btn-ghost:hover { color: #fff; }

      .yyp-auth-divider {
        display: flex; align-items: center; gap: 12px;
        color: rgba(255,255,255,.3);
        font-size: .68rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: .1em;
        margin: 18px 0;
      }
      .yyp-auth-divider::before, .yyp-auth-divider::after {
        content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.1);
      }

      .yyp-auth-input {
        width: 100%;
        background: #1C1C1C;
        border: 1.5px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 12px 16px;
        font-size: .9375rem; color: #fff;
        outline: none; transition: border-color .2s;
        font-family: 'Inter', sans-serif;
      }
      .yyp-auth-input:focus { border-color: #FFD000; background: #222; }
      .yyp-auth-input::placeholder { color: rgba(255,255,255,.3); }

      .yyp-auth-error {
        background: rgba(239, 68, 68, .12);
        border: 1px solid rgba(239, 68, 68, .25);
        color: #FCA5A5;
        font-size: .8125rem; font-weight: 600;
        padding: 10px 14px; border-radius: 10px;
      }

      .yyp-auth-toggle {
        text-align: center; margin-top: 16px;
        font-size: .8125rem; color: rgba(255,255,255,.5);
      }
      .yyp-auth-toggle button {
        background: none; border: none; color: #FFD000;
        font-weight: 700; cursor: pointer;
        text-decoration: underline; text-underline-offset: 3px;
        font-family: inherit; font-size: inherit;
      }
      .yyp-auth-toggle button:hover { color: #fff; }

      .yyp-auth-intent {
        display: flex; align-items: center; gap: 10px;
        background: rgba(255,208,0,.08);
        border: 1px solid rgba(255,208,0,.2);
        border-radius: 12px; padding: 10px 14px;
        font-size: .8125rem; color: #FFD000;
        margin-bottom: 18px;
      }

      .yyp-auth-spinner {
        width: 16px; height: 16px;
        border: 2px solid rgba(17,17,17,.3);
        border-top-color: #111;
        border-radius: 50%;
        animation: yyp-spin .7s linear infinite;
      }
      @keyframes yyp-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }


  /* ── render the modal DOM once ──────────────────────────── */
  let modalEl = null;
  let resolveCurrent = null;

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'yyp-auth-backdrop';
    modalEl.innerHTML = `
      <div class="yyp-auth-card" role="dialog" aria-modal="true" aria-labelledby="yyp-auth-title">
        <button class="yyp-auth-close" aria-label="Close" data-action="close">×</button>

        <div class="yyp-auth-hero">
          <div class="yyp-auth-logo">🍽️</div>
          <h2 class="yyp-auth-title" id="yyp-auth-title">Welcome to YUMYUMPO</h2>
          <p class="yyp-auth-sub">Save your favorite places, personalize your discovery experience, and connect with the local scene.</p>
        </div>

        <div class="yyp-auth-body">
          <div id="yyp-auth-intent" class="yyp-auth-intent" style="display:none">
            <span>✨</span>
            <span id="yyp-auth-intent-text"></span>
          </div>

          <div id="yyp-auth-error" class="yyp-auth-error" style="display:none"></div>

          <!-- Google OAuth -->
          <button class="yyp-auth-btn yyp-auth-btn-google" data-action="google" style="margin-bottom:12px">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div class="yyp-auth-divider">or</div>

          <!-- Email + password form -->
          <form id="yyp-auth-form" class="space-y-3" novalidate>
            <input id="yyp-auth-email"    class="yyp-auth-input" type="email"    placeholder="Email" autocomplete="email" required style="margin-bottom:10px" />
            <input id="yyp-auth-password" class="yyp-auth-input" type="password" placeholder="Password" autocomplete="current-password" required minlength="6" style="margin-bottom:14px" />
            <button class="yyp-auth-btn yyp-auth-btn-primary" type="submit" id="yyp-auth-submit">
              <span id="yyp-auth-submit-label">Sign In</span>
            </button>
          </form>

          <p class="yyp-auth-toggle">
            <span id="yyp-auth-toggle-text">Don't have an account?</span>
            <button type="button" data-action="toggle-mode" id="yyp-auth-toggle-btn">Sign up</button>
          </p>

          <button class="yyp-auth-btn yyp-auth-btn-ghost" type="button" data-action="guest" style="margin-top:8px">
            Continue as guest →
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    /* wire up handlers */
    modalEl.addEventListener('click', e => {
      if (e.target === modalEl) close(null);
    });
    modalEl.querySelector('[data-action="close"]').addEventListener('click', () => close(null));
    modalEl.querySelector('[data-action="guest"]').addEventListener('click', () => close(null));
    modalEl.querySelector('[data-action="google"]').addEventListener('click', signInWithGoogle);
    modalEl.querySelector('[data-action="toggle-mode"]').addEventListener('click', toggleMode);
    modalEl.querySelector('#yyp-auth-form').addEventListener('submit', handleEmailSubmit);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalEl?.classList.contains('is-open')) close(null);
    });

    return modalEl;
  }


  /* ── state ──────────────────────────────────────────────── */
  let mode = 'signin'; // 'signin' | 'signup'

  function setMode(newMode) {
    mode = newMode;
    const submitLabel = document.getElementById('yyp-auth-submit-label');
    const toggleText  = document.getElementById('yyp-auth-toggle-text');
    const toggleBtn   = document.getElementById('yyp-auth-toggle-btn');
    const passwordIn  = document.getElementById('yyp-auth-password');

    if (mode === 'signup') {
      submitLabel.textContent = 'Create Account';
      toggleText.textContent  = 'Already have an account?';
      toggleBtn.textContent   = 'Sign in';
      passwordIn.autocomplete = 'new-password';
    } else {
      submitLabel.textContent = 'Sign In';
      toggleText.textContent  = "Don't have an account?";
      toggleBtn.textContent   = 'Sign up';
      passwordIn.autocomplete = 'current-password';
    }
    clearError();
  }

  function toggleMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  }

  function showError(msg) {
    const el = document.getElementById('yyp-auth-error');
    el.textContent = msg;
    el.style.background = 'rgba(239, 68, 68, .12)';
    el.style.borderColor = 'rgba(239, 68, 68, .25)';
    el.style.color = '#FCA5A5';
    el.style.display = '';
  }
  function showSuccess(msg) {
    const el = document.getElementById('yyp-auth-error');
    el.textContent = msg;
    el.style.background = 'rgba(34, 197, 94, .12)';
    el.style.borderColor = 'rgba(34, 197, 94, .3)';
    el.style.color = '#86EFAC';
    el.style.display = '';
  }
  function clearError() {
    const el = document.getElementById('yyp-auth-error');
    if (el) el.style.display = 'none';
  }

  function setLoading(loading) {
    const btn = document.getElementById('yyp-auth-submit');
    const label = document.getElementById('yyp-auth-submit-label');
    btn.disabled = loading;
    label.innerHTML = loading
      ? '<span class="yyp-auth-spinner" style="vertical-align:-2px;margin-right:6px"></span>Please wait…'
      : (mode === 'signup' ? 'Create Account' : 'Sign In');
  }


  /* ── handlers ────────────────────────────────────────── */
  async function handleEmailSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    clearError();
    console.log('[auth-modal] submit', { mode });
    const email    = document.getElementById('yyp-auth-email').value.trim();
    const password = document.getElementById('yyp-auth-password').value;

    if (!email || !password) {
      showError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    const client = window.YYP?.client;
    if (!client) { showError('Connection unavailable. Try again in a moment.'); return; }

    setLoading(true);
    try {
      const fn = mode === 'signup' ? 'signUp' : 'signInWithPassword';
      const { data, error } = await client.auth[fn]({ email, password });
      console.log('[auth-modal]', fn, 'result', { hasSession: !!data?.session, error });

      if (error) {
        showError(error.message || 'Something went wrong.');
        setLoading(false);
        return;
      }
      /* Sign-up may need email confirmation depending on Supabase settings.
         Render this as a success notice (green), not a red error — it's the
         happy path, just async. */
      if (mode === 'signup' && !data.session) {
        showSuccess('Account created! Check your email to confirm — then come back and sign in.');
        setMode('signin');
        setLoading(false);
        return;
      }
      close(data.session);
    } catch (err) {
      console.error('[auth-modal] exception', err);
      showError('Unexpected error: ' + (err?.message || err));
      setLoading(false);
    }
    return false;
  }

  async function signInWithGoogle() {
    const client = window.YYP?.client;
    if (!client) { showError('Connection unavailable.'); return; }
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
      if (error) showError(error.message);
    } catch (err) {
      showError('Could not start Google sign-in.');
    }
  }


  /* ── open / close ────────────────────────────────────── */
  function open(opts = {}) {
    ensureModal();
    clearError();
    setMode(opts.mode === 'signup' ? 'signup' : 'signin');

    /* signupOnly: hide the sign-in toggle + guest exit. Used by the claim
       flow where the only valid action is creating the matching account. */
    const togglePara = document.querySelector('.yyp-auth-toggle');
    const guestBtn   = modalEl.querySelector('[data-action="guest"]');
    if (opts.signupOnly) {
      togglePara && (togglePara.style.display = 'none');
      guestBtn   && (guestBtn.style.display   = 'none');
    } else {
      togglePara && (togglePara.style.display = '');
      guestBtn   && (guestBtn.style.display   = '');
    }

    /* Pre-fill + (optionally) lock the email so claim-flow users sign
       up with the exact address their application was approved under. */
    const emailIn = document.getElementById('yyp-auth-email');
    if (opts.email) {
      emailIn.value = opts.email;
      emailIn.readOnly = !!opts.lockEmail;
    } else {
      emailIn.value = '';
      emailIn.readOnly = false;
    }

    const intentEl = document.getElementById('yyp-auth-intent');
    if (opts.intent) {
      document.getElementById('yyp-auth-intent-text').textContent = opts.intent;
      intentEl.style.display = '';
    } else {
      intentEl.style.display = 'none';
    }
    requestAnimationFrame(() => modalEl.classList.add('is-open'));
    setTimeout(() => {
      const focusEl = opts.email
        ? document.getElementById('yyp-auth-password')
        : emailIn;
      focusEl?.focus();
    }, 350);

    return new Promise(resolve => { resolveCurrent = resolve; });
  }

  function close(session) {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    if (resolveCurrent) { resolveCurrent(session); resolveCurrent = null; }
  }


  /* ── public API ───────────────────────────────────────── */
  window.YYP = window.YYP || {};
  window.YYP.openAuthModal = open;

  /* requireAuth({intent}) — if signed in, resolves immediately to the session;
     else opens the modal and resolves to session or null. */
  window.YYP.requireAuth = async function (opts = {}) {
    const client = window.YYP?.client;
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session) return session;
    }
    return open(opts);
  };

  window.YYP.authModal = { open, close };

  /* React to Supabase auth state changes globally */
  function bindAuthListener() {
    const client = window.YYP?.client;
    if (!client) return;
    client.auth.onAuthStateChange((event, session) => {
      document.dispatchEvent(new CustomEvent('yyp:auth', {
        detail: { event, session }
      }));
    });
  }
  if (window.YYP?.ready) bindAuthListener();
  else document.addEventListener('yyp:ready', bindAuthListener, { once: true });

})();
