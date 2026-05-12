/* ============================================================
   YUMYUMPO — PWA layer
   ────────────────────────────────────────────────────────────
   • Registers the service worker
   • Listens for `beforeinstallprompt` and renders a floating
     "Install App" button when the platform offers install
   • Shows a one-time iOS "Add to Home Screen" tip
   • Adds small app-feel CSS tweaks (tap-highlight, double-tap zoom)

   Fails silently if the browser doesn't support these APIs.
   Safe on GitHub Pages — uses relative URLs only.
   ============================================================ */

'use strict';

(function () {
  if (window.__yyp_pwa_loaded) return;
  window.__yyp_pwa_loaded = true;

  const LS_IOS_DISMISSED = 'yyp_ios_install_dismissed';

  /* ── 1. Register the service worker ──────────────────── */
  if ('serviceWorker' in navigator) {
    /* Resolve sw.js relative to the SITE ROOT, not the current page.
       Works on Vercel (/sw.js) and GitHub Pages (/REPO/sw.js) alike. */
    window.addEventListener('load', () => {
      /* The script tag for this file lives at .../assets/js/pwa.js,
         so two levels up is the site root. */
      const myScript = document.currentScript ||
        [...document.scripts].find(s => s.src.includes('/pwa.js'));
      const swUrl = myScript
        ? myScript.src.replace(/\/assets\/js\/pwa\.js.*$/, '/sw.js')
        : './sw.js';

      navigator.serviceWorker.register(swUrl, { scope: swUrl.replace(/sw\.js$/, '') })
        .catch(() => { /* silent — fine on dev/file:// */ });
    });
  }


  /* ── 2. Floating install button (Android Chrome / Edge) ─── */
  let deferredPrompt = null;
  let installBtn     = null;

  function ensureInstallButton() {
    if (installBtn) return installBtn;

    /* Inject styles once */
    if (!document.getElementById('yyp-pwa-styles')) {
      const style = document.createElement('style');
      style.id = 'yyp-pwa-styles';
      style.textContent = `
        /* ── Install button — top-right, just under the nav ── */
        .yyp-install-btn {
          position: fixed;
          z-index: 9990;
          top: calc(env(safe-area-inset-top, 0) + 76px);
          right: 14px;
          display: inline-flex; align-items: center; gap: 8px;
          background: #FFD000; color: #111;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-weight: 800; font-size: 0.8125rem;
          letter-spacing: -0.01em;
          padding: 9px 16px 9px 12px;
          border: none; border-radius: 999px;
          box-shadow:
            0 8px 24px rgba(255, 208, 0, 0.45),
            0 0 0 1px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          opacity: 0; transform: translateY(-20px) scale(.94);
          transition: all .4s cubic-bezier(.34, 1.4, .64, 1);
          pointer-events: none;
        }
        .yyp-install-btn.is-in {
          opacity: 1; transform: translateY(0) scale(1);
          pointer-events: auto;
          animation: yyp-install-pulse 2.4s ease-in-out 1s 2;
        }
        @keyframes yyp-install-pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(255,208,0,.45), 0 0 0 1px rgba(0,0,0,.05); }
          50%      { box-shadow: 0 8px 24px rgba(255,208,0,.55), 0 0 0 6px rgba(255,208,0,.18); }
        }
        .yyp-install-btn:hover  { transform: translateY(2px) scale(1.03); }
        .yyp-install-btn:active { transform: translateY(0) scale(.97); }
        .yyp-install-btn svg    { flex-shrink: 0; }

        @media (min-width: 768px) {
          .yyp-install-btn { top: calc(env(safe-area-inset-top, 0) + 92px); right: 24px; }
        }

        /* ── iOS install tip (slide-up sheet) ── */
        .yyp-ios-tip {
          position: fixed;
          z-index: 9989;
          left: 14px; right: 14px;
          bottom: calc(env(safe-area-inset-bottom, 0) + 90px);
          background: rgba(20, 20, 20, .96);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          color: #fff;
          border-radius: 20px;
          padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: .8125rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, .35);
          opacity: 0; transform: translateY(20px);
          transition: all .4s cubic-bezier(.34, 1.4, .64, 1);
          pointer-events: none;
        }
        .yyp-ios-tip.is-in { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .yyp-ios-tip-icon {
          flex-shrink: 0;
          width: 36px; height: 36px;
          background: #FFD000; color: #111;
          border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
        }
        .yyp-ios-tip-body  { flex: 1; min-width: 0; }
        .yyp-ios-tip-title { font-weight: 800; color: #FFD000; letter-spacing: -.01em; }
        .yyp-ios-tip-sub   { color: rgba(255,255,255,.7); font-size: .75rem; margin-top: 1px; }
        .yyp-ios-tip-close {
          background: none; border: none; color: rgba(255,255,255,.5);
          font-size: 18px; cursor: pointer; padding: 4px 6px;
        }
        .yyp-ios-tip-close:hover { color: #fff; }

        /* ── App-feel improvements (subtle, won't hurt browser UX) ── */
        button, .btn, .yyp-install-btn, .reaction-btn,
        .yyp-bn-tab, .yyp-toast-action {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        html { -webkit-text-size-adjust: 100%; }
        html, body { overscroll-behavior-y: contain; }

        /* When running as installed PWA, hide the install button + tip */
        @media (display-mode: standalone) {
          .yyp-install-btn, .yyp-ios-tip { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }

    installBtn = document.createElement('button');
    installBtn.className = 'yyp-install-btn';
    installBtn.setAttribute('aria-label', 'Install YUMYUMPO app');
    installBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Install App</span>
    `;
    installBtn.addEventListener('click', triggerInstall);
    document.body.appendChild(installBtn);
    return installBtn;
  }

  function showInstallButton() {
    const btn = ensureInstallButton();
    requestAnimationFrame(() => btn.classList.add('is-in'));
  }

  function hideInstallButton() {
    if (installBtn) installBtn.classList.remove('is-in');
  }

  async function triggerInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') hideInstallButton();
    } catch { /* user dismissed */ }
    deferredPrompt = null;
  }

  /* The actual install hook (Chrome/Edge/Samsung Internet) */
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    hideInstallButton();
    deferredPrompt = null;
    try { localStorage.setItem(LS_IOS_DISMISSED, '1'); } catch {}
  });


  /* ── 3. iOS install tip (Safari) ──────────────────────── */
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isInStandaloneMode() {
    return window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
  }

  function maybeShowIosTip() {
    if (!isIOS() || isInStandaloneMode()) return;
    try {
      if (localStorage.getItem(LS_IOS_DISMISSED) === '1') return;
    } catch {}

    /* Wait a moment so the tip doesn't compete with first paint */
    setTimeout(() => {
      const tip = document.createElement('div');
      tip.className = 'yyp-ios-tip';
      tip.innerHTML = `
        <div class="yyp-ios-tip-icon">🍽️</div>
        <div class="yyp-ios-tip-body">
          <p class="yyp-ios-tip-title">Install YUMYUMPO</p>
          <p class="yyp-ios-tip-sub">Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></p>
        </div>
        <button class="yyp-ios-tip-close" aria-label="Dismiss">×</button>
      `;
      document.body.appendChild(tip);
      requestAnimationFrame(() => tip.classList.add('is-in'));

      tip.querySelector('.yyp-ios-tip-close').addEventListener('click', () => {
        tip.classList.remove('is-in');
        setTimeout(() => tip.remove(), 400);
        try { localStorage.setItem(LS_IOS_DISMISSED, '1'); } catch {}
      });

      /* Auto-dismiss after 15s — don't be annoying */
      setTimeout(() => {
        if (!document.body.contains(tip)) return;
        tip.classList.remove('is-in');
        setTimeout(() => tip.remove(), 400);
      }, 15000);
    }, 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShowIosTip);
  } else {
    maybeShowIosTip();
  }

})();
