/* ============================================================
   YUMYUMPO — Vibe Map FAB
   A bold floating Vibe Map shortcut, bottom-RIGHT, raised above
   the bottom-nav so it's immediately obvious.
   Hidden where it'd be redundant or collide:
     • /vibe-map, /admin/*, /account/restaurant (editor surfaces)
     • /discover (Vibe Map is in the nav + a hero pill there)
     • /restaurant (the WhatsApp/IG/Messenger stack owns bottom-right)
   ============================================================ */

(function () {
  'use strict';

  /* Disable on surfaces where it'd be redundant or in the way. */
  const path = location.pathname.toLowerCase();
  if (path.endsWith('/vibe-map.html') || path.endsWith('/vibe-map'))   return;
  if (path.includes('/admin/'))                                         return;
  if (path.endsWith('/account/restaurant.html') ||
      path.endsWith('/account/restaurant'))                             return;
  if (path.endsWith('/discover.html') || path.endsWith('/discover'))   return;
  /* /restaurant has the contact-bubble stack pinned bottom-right. */
  if (path.endsWith('/restaurant.html') || path.endsWith('/restaurant')) return;

  /* Resolve relative href so it works from any directory depth. */
  const isNested = path.includes('/admin/') || path.includes('/account/');
  const href     = (isNested ? '../' : '') + 'vibe-map.html';

  /* Inject the stylesheet once. */
  const css = document.createElement('style');
  css.textContent = `
    .yyp-vm-fab {
      position: fixed;
      right: 16px;
      bottom: calc(env(safe-area-inset-bottom, 0) + 92px);
      z-index: 60;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 20px 13px 16px;
      background: #FFD000; color: #111;
      border: 3px solid #111;
      border-radius: 999px;
      font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
      font-size: 0.82rem; font-weight: 800;
      text-decoration: none;
      box-shadow: 0 10px 24px -6px rgba(0,0,0,0.35), 0 0 0 0 rgba(255,208,0,0.6);
      transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.15s;
      animation: yypVmHello 0.5s ease 0.4s both;
    }
    .yyp-vm-fab:hover {
      background: #E6BB00;
      transform: translateY(-2px);
      box-shadow: 0 14px 32px -8px rgba(0,0,0,0.45);
    }
    .yyp-vm-fab svg {
      width: 18px; height: 18px; flex-shrink: 0;
    }
    .yyp-vm-fab .yyp-vm-fab-label {
      letter-spacing: 0.02em;
    }
    /* On very small phones, drop the label to keep the FAB compact. */
    @media (max-width: 380px) {
      .yyp-vm-fab { padding: 11px 12px; }
      .yyp-vm-fab .yyp-vm-fab-label { display: none; }
    }
    /* Slide-in entry */
    @keyframes yypVmHello {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(css);

  /* Inject the button. */
  function mount() {
    if (document.querySelector('.yyp-vm-fab')) return;
    const a = document.createElement('a');
    a.className = 'yyp-vm-fab';
    a.href = href;
    a.setAttribute('aria-label', 'Open Vibe Map');
    a.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span class="yyp-vm-fab-label">Vibe Map</span>`;
    document.body.appendChild(a);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
