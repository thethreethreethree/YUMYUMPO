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
        /* ── Install banner — full-width yellow strip pinned to top ── */
        .yyp-install-banner {
          position: fixed;
          z-index: 9990;
          top: 0; left: 0; right: 0;
          background: linear-gradient(180deg, #FFD000 0%, #F5C800 100%);
          color: #111;
          padding: 10px 14px calc(10px + env(safe-area-inset-top, 0));
          padding-top: calc(10px + env(safe-area-inset-top, 0));
          display: flex; align-items: center; gap: 12px;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 0.875rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
          transform: translateY(-110%);
          transition: transform .45s cubic-bezier(.34, 1.4, .64, 1);
          pointer-events: none;
        }
        .yyp-install-banner.is-in {
          transform: translateY(0);
          pointer-events: auto;
        }

        .yyp-install-banner-icon {
          width: 36px; height: 36px;
          background: #111; color: #FFD000;
          border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
        }

        .yyp-install-banner-text { flex: 1; min-width: 0; line-height: 1.3; }
        .yyp-install-banner-text strong {
          display: block;
          font-weight: 900; letter-spacing: -.01em;
          font-size: .9rem;
        }
        .yyp-install-banner-text span {
          color: rgba(17, 17, 17, .65);
          font-size: .75rem; font-weight: 600;
        }

        .yyp-install-banner-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: #111; color: #FFD000;
          border: none; cursor: pointer;
          font-family: inherit; font-weight: 800;
          font-size: .8125rem; letter-spacing: -.01em;
          padding: 9px 16px; border-radius: 999px;
          flex-shrink: 0;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 4px 12px rgba(0,0,0,.18);
        }
        .yyp-install-banner-btn:hover  { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(0,0,0,.28); }
        .yyp-install-banner-btn:active { transform: translateY(0); }

        .yyp-install-banner-close {
          background: rgba(17,17,17,.08); border: none; color: #111;
          width: 30px; height: 30px;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 18px; line-height: 1;
          flex-shrink: 0;
          transition: background .15s;
        }
        .yyp-install-banner-close:hover { background: rgba(17,17,17,.18); }

        /* Hide the secondary install text on tiny screens to keep the bar slim */
        @media (max-width: 480px) {
          .yyp-install-banner-text span { display: none; }
          .yyp-install-banner-text strong { font-size: .8125rem; }
          .yyp-install-banner { padding-left: 10px; padding-right: 10px; gap: 8px; }
          .yyp-install-banner-icon { width: 32px; height: 32px; }
        }

        /* Push the page down when the banner is showing so nothing's covered */
        body.yyp-has-install-banner { padding-top: 64px; transition: padding-top .35s ease; }
        @media (max-width: 480px) {
          body.yyp-has-install-banner { padding-top: 60px; }
        }

        /* ── iOS install banner — matches Android, pinned to top ── */
        .yyp-ios-tip {
          position: fixed;
          z-index: 9989;
          top: 0; left: 0; right: 0;
          background: linear-gradient(180deg, #FFD000 0%, #F5C800 100%);
          color: #111;
          padding: 10px 14px;
          padding-top: calc(10px + env(safe-area-inset-top, 0));
          display: flex; align-items: center; gap: 12px;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: .875rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, .12), 0 0 0 1px rgba(0, 0, 0, .05);
          transform: translateY(-110%);
          transition: transform .45s cubic-bezier(.34, 1.4, .64, 1);
          pointer-events: none;
        }
        .yyp-ios-tip.is-in { transform: translateY(0); pointer-events: auto; }
        .yyp-ios-tip-icon {
          flex-shrink: 0;
          width: 36px; height: 36px;
          background: #111; color: #FFD000;
          border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          box-shadow: 0 2px 6px rgba(0, 0, 0, .2);
        }
        .yyp-ios-tip-body  { flex: 1; min-width: 0; line-height: 1.3; }
        .yyp-ios-tip-title { font-weight: 900; color: #111; letter-spacing: -.01em; font-size: .9rem; display: block; }
        .yyp-ios-tip-sub   { color: rgba(17, 17, 17, .68); font-size: .75rem; font-weight: 600; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .yyp-ios-tip-sub svg { width: 14px; height: 14px; }
        .yyp-ios-tip-close {
          background: rgba(17,17,17,.08); border: none; color: #111;
          width: 30px; height: 30px;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 18px; line-height: 1;
          flex-shrink: 0;
          transition: background .15s;
        }
        .yyp-ios-tip-close:hover { background: rgba(17,17,17,.18); }
        @media (max-width: 480px) {
          .yyp-ios-tip-sub { font-size: .7rem; }
          .yyp-ios-tip { padding-left: 10px; padding-right: 10px; gap: 8px; }
          .yyp-ios-tip-icon { width: 32px; height: 32px; }
        }
        body.yyp-has-ios-tip { padding-top: 70px; transition: padding-top .35s ease; }
        @media (max-width: 480px) {
          body.yyp-has-ios-tip { padding-top: 64px; }
        }

        /* ── App-feel polish — only tap-highlight; nothing that could
              affect scrolling on any device ── */
        button, .btn, .yyp-install-btn, .reaction-btn,
        .yyp-bn-tab, .yyp-toast-action {
          -webkit-tap-highlight-color: transparent;
        }

        /* When running as installed PWA, hide the install banner + tip */
        @media (display-mode: standalone) {
          .yyp-install-banner, .yyp-ios-tip { display: none !important; }
          body.yyp-has-install-banner,
          body.yyp-has-ios-tip { padding-top: 0 !important; }
        }
      `;
      document.head.appendChild(style);
    }

    installBtn = document.createElement('div');
    installBtn.className = 'yyp-install-banner';
    installBtn.setAttribute('role', 'region');
    installBtn.setAttribute('aria-label', 'Install YUMYUMPO app');
    installBtn.innerHTML = `
      <div class="yyp-install-banner-icon">🍽️</div>
      <div class="yyp-install-banner-text">
        <strong>Install the YUMYUMPO app</strong>
        <span>Full-screen, faster, on your home screen</span>
      </div>
      <button class="yyp-install-banner-btn" type="button" data-action="install">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Install
      </button>
      <button class="yyp-install-banner-close" type="button" aria-label="Dismiss" data-action="dismiss">×</button>
    `;
    installBtn.querySelector('[data-action="install"]').addEventListener('click', triggerInstall);
    installBtn.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
      hideInstallButton();
      try { sessionStorage.setItem('yyp_install_dismissed', '1'); } catch {}
    });
    document.body.appendChild(installBtn);
    return installBtn;
  }

  function showInstallButton() {
    /* Respect a same-session dismiss so we don't nag */
    try { if (sessionStorage.getItem('yyp_install_dismissed') === '1') return; } catch {}
    const btn = ensureInstallButton();
    requestAnimationFrame(() => {
      btn.classList.add('is-in');
      document.body.classList.add('yyp-has-install-banner');
    });
  }

  function hideInstallButton() {
    if (!installBtn) return;
    installBtn.classList.remove('is-in');
    document.body.classList.remove('yyp-has-install-banner');
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
      tip.setAttribute('role', 'region');
      tip.setAttribute('aria-label', 'Install YUMYUMPO on iPhone');
      /* Inline SVG for the iOS Share icon so the instructions are visual */
      tip.innerHTML = `
        <div class="yyp-ios-tip-icon">🍽️</div>
        <div class="yyp-ios-tip-body">
          <strong class="yyp-ios-tip-title">Install the YUMYUMPO app</strong>
          <span class="yyp-ios-tip-sub">
            Tap
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><path d="M7 7l5-5 5 5"/><rect x="4" y="13" width="16" height="8" rx="2"/></svg>
            <strong>Share</strong> → <strong>Add to Home Screen</strong>
          </span>
        </div>
        <button class="yyp-ios-tip-close" aria-label="Dismiss">×</button>
      `;
      document.body.appendChild(tip);
      requestAnimationFrame(() => {
        tip.classList.add('is-in');
        document.body.classList.add('yyp-has-ios-tip');
      });

      tip.querySelector('.yyp-ios-tip-close').addEventListener('click', () => {
        tip.classList.remove('is-in');
        document.body.classList.remove('yyp-has-ios-tip');
        setTimeout(() => tip.remove(), 400);
        try { localStorage.setItem(LS_IOS_DISMISSED, '1'); } catch {}
      });
      /* Don't auto-dismiss — user has to actively dismiss the banner */
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShowIosTip);
  } else {
    maybeShowIosTip();
  }

})();
