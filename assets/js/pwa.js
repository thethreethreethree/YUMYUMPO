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
        /* ── Install Now floating button — overlay, no layout shift ── */
        .yyp-install-banner {
          position: fixed;
          z-index: 9990;
          /* Sit centered at top, just under the nav. Width fits content. */
          top: calc(env(safe-area-inset-top, 0) + 76px);
          left: 50%;
          transform: translateX(-50%) translateY(-10px) scale(.96);
          display: inline-flex; align-items: center; gap: 10px;
          background: #FFD000; color: #111;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: .8125rem; font-weight: 800;
          padding: 9px 8px 9px 14px;
          border-radius: 999px;
          box-shadow:
            0 10px 28px rgba(255, 208, 0, .50),
            0 4px 12px rgba(0, 0, 0, .12),
            0 0 0 1px rgba(0, 0, 0, .04);
          opacity: 0;
          transition: opacity .35s ease, transform .45s cubic-bezier(.34, 1.4, .64, 1);
          pointer-events: none;
          white-space: nowrap;
          max-width: calc(100vw - 24px);
        }
        .yyp-install-banner.is-in {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
          pointer-events: auto;
          animation: yyp-install-glow 2.6s ease-in-out 1.2s 2;
        }
        @keyframes yyp-install-glow {
          0%, 100% { box-shadow: 0 10px 28px rgba(255,208,0,.50), 0 4px 12px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04); }
          50%      { box-shadow: 0 10px 28px rgba(255,208,0,.62), 0 4px 12px rgba(0,0,0,.12), 0 0 0 6px rgba(255,208,0,.18); }
        }
        @media (min-width: 768px) {
          .yyp-install-banner { top: calc(env(safe-area-inset-top, 0) + 92px); }
        }

        .yyp-install-banner-icon {
          width: 26px; height: 26px;
          background: #111; color: #FFD000;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: .8rem;
          flex-shrink: 0;
        }

        /* Hide the long subtitle text from the floating button (we keep
           only an accessible label inside it via aria attributes). */
        .yyp-install-banner-text strong {
          font-weight: 800; letter-spacing: -.01em; font-size: .8125rem;
          color: #111;
        }
        .yyp-install-banner-text span { display: none; }

        .yyp-install-banner-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: #111; color: #FFD000;
          border: none; cursor: pointer;
          font-family: inherit; font-weight: 800;
          font-size: .75rem; letter-spacing: .02em; text-transform: uppercase;
          padding: 7px 12px; border-radius: 999px;
          flex-shrink: 0;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 2px 6px rgba(0,0,0,.2);
        }
        .yyp-install-banner-btn:hover  { transform: translateY(-1px); }
        .yyp-install-banner-btn:active { transform: translateY(0); }

        .yyp-install-banner-close {
          background: rgba(17,17,17,.10); border: none; color: #111;
          width: 24px; height: 24px;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 14px; line-height: 1;
          flex-shrink: 0;
          margin-right: 2px;
          transition: background .15s;
        }
        .yyp-install-banner-close:hover { background: rgba(17,17,17,.20); }

        /* ── iOS install tip — floating pill near the bottom (Safari Share
              icon lives in the bottom toolbar on iPhone, so we anchor
              near it) ── */
        .yyp-ios-tip {
          position: fixed;
          z-index: 9989;
          bottom: calc(env(safe-area-inset-bottom, 0) + 96px);
          left: 50%;
          transform: translateX(-50%) translateY(20px) scale(.96);
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(17, 17, 17, .95);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          color: #fff;
          border-radius: 999px;
          padding: 9px 14px 9px 9px;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: .8125rem;
          box-shadow: 0 14px 36px rgba(0,0,0,.32), 0 0 0 1px rgba(255,255,255,.06);
          opacity: 0;
          transition: opacity .35s ease, transform .45s cubic-bezier(.34, 1.4, .64, 1);
          pointer-events: none;
          white-space: nowrap;
          max-width: calc(100vw - 24px);
        }
        .yyp-ios-tip.is-in {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
          pointer-events: auto;
        }
        .yyp-ios-tip-icon {
          flex-shrink: 0;
          width: 26px; height: 26px;
          background: #FFD000; color: #111;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: .85rem;
        }
        .yyp-ios-tip-body  { display: inline-flex; align-items: center; gap: 6px; }
        .yyp-ios-tip-title { font-weight: 800; color: #FFD000; letter-spacing: -.01em; font-size: .8125rem; }
        .yyp-ios-tip-sub   { color: rgba(255,255,255,.78); font-size: .75rem; font-weight: 600; }
        /* Constrain every SVG inside the iOS tip so it can never go giant */
        .yyp-ios-tip svg { width: 14px !important; height: 14px !important; flex-shrink: 0; }
        .yyp-ios-tip-close {
          background: rgba(255,255,255,.10); border: none; color: rgba(255,255,255,.8);
          width: 24px; height: 24px;
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; line-height: 1;
          flex-shrink: 0;
          transition: background .15s;
        }
        .yyp-ios-tip-close:hover { background: rgba(255,255,255,.20); color: #fff; }
        @media (max-width: 360px) {
          .yyp-ios-tip-sub { display: none; }
        }

        /* ── App-feel polish — only tap-highlight; nothing that could
              affect scrolling on any device ── */
        button, .btn, .yyp-install-btn, .reaction-btn,
        .yyp-bn-tab, .yyp-toast-action {
          -webkit-tap-highlight-color: transparent;
        }

        /* When running as installed PWA, hide both prompts */
        @media (display-mode: standalone) {
          .yyp-install-banner, .yyp-ios-tip { display: none !important; }
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
    requestAnimationFrame(() => btn.classList.add('is-in'));
  }

  function hideInstallButton() {
    if (!installBtn) return;
    installBtn.classList.remove('is-in');
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


  /* ── 3. iOS install tip — Safari has Add-to-Home-Screen, but
        Chrome/Firefox/Edge on iOS DON'T (Apple forces all iOS
        browsers onto WebKit but blocks the install path).
        So we detect both cases and show the right copy. ── */
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isIOSChromeOrOther() {
    /* On iOS, Chrome → "CriOS", Firefox → "FxiOS", Edge → "EdgiOS",
       Brave → "Brave" with CriOS, DuckDuckGo → "DuckDuckGo" */
    return isIOS() && /CriOS|FxiOS|EdgiOS|DuckDuckGo|YaBrowser/i.test(navigator.userAgent);
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

      const inChrome = isIOSChromeOrOther();

      if (inChrome) {
        /* iOS Chrome / Firefox / Edge can't install PWAs — Apple only
           allows it from Safari. Show a compact "open in Safari" pill
           with a copy-link helper. */
        tip.innerHTML = `
          <div class="yyp-ios-tip-icon">🦊</div>
          <div class="yyp-ios-tip-body">
            <span class="yyp-ios-tip-title">Open in Safari to install</span>
          </div>
          <button class="yyp-install-banner-btn" type="button" data-action="copy">📋 Copy link</button>
          <button class="yyp-ios-tip-close" aria-label="Dismiss">×</button>
        `;
      } else {
        /* Native iOS Safari — show the Share → Add to Home Screen tip. */
        tip.innerHTML = `
          <div class="yyp-ios-tip-icon">🍽️</div>
          <div class="yyp-ios-tip-body">
            <span class="yyp-ios-tip-title">Install:</span>
            <span class="yyp-ios-tip-sub">Tap <strong>Share</strong>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v13"/><path d="M7 7l5-5 5 5"/><rect x="4" y="13" width="16" height="8" rx="2"/></svg>
              → Add to Home Screen</span>
          </div>
          <button class="yyp-ios-tip-close" aria-label="Dismiss">×</button>
        `;
      }

      document.body.appendChild(tip);
      requestAnimationFrame(() => tip.classList.add('is-in'));

      const copyBtn = tip.querySelector('[data-action="copy"]');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            copyBtn.innerHTML = '✓ Copied';
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy link`;
            }, 1800);
          } catch {
            /* clipboard API blocked — fall back to prompt */
            window.prompt('Copy this link and paste in Safari:', window.location.href);
          }
        });
      }

      tip.querySelector('.yyp-ios-tip-close').addEventListener('click', () => {
        tip.classList.remove('is-in');
        setTimeout(() => tip.remove(), 400);
        try { localStorage.setItem(LS_IOS_DISMISSED, '1'); } catch {}
      });
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShowIosTip);
  } else {
    maybeShowIosTip();
  }

})();
