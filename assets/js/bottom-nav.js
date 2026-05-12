/* ============================================================
   YUMYUMPO — Mobile bottom navigation
   ────────────────────────────────────────────────────────────
   Injects a floating, thumb-friendly bottom nav on every page
   except admin/analytics. Hidden on desktop (md: breakpoint up).

   Tabs: Home · Explore · Ask Fred · Saved · Profile
   ============================================================ */

'use strict';

(function () {
  /* Skip on admin/analytics surfaces where the sidebar is the nav. */
  const path = location.pathname.toLowerCase();
  if (path.includes('/admin/') || path.endsWith('analytics.html')) return;

  /* Inject styles once */
  if (!document.getElementById('yyp-bottom-nav-styles')) {
    const css = document.createElement('style');
    css.id = 'yyp-bottom-nav-styles';
    css.textContent = `
      .yyp-bottom-nav {
        position: fixed; left: 50%; transform: translateX(-50%);
        bottom: 16px; z-index: 60;
        display: flex; align-items: center; gap: 4px;
        background: rgba(17, 17, 17, .92);
        backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        border-radius: 999px;
        padding: 6px;
        box-shadow:
          0 12px 40px rgba(0, 0, 0, .35),
          0 0 0 1px rgba(255, 255, 255, .05);
        max-width: calc(100vw - 24px);
      }
      @media (min-width: 768px) { .yyp-bottom-nav { display: none; } }
      body { padding-bottom: 96px; }
      @media (min-width: 768px) { body { padding-bottom: 0; } }

      .yyp-bn-tab {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 2px;
        min-width: 58px;
        padding: 8px 10px;
        border-radius: 999px;
        color: rgba(255, 255, 255, .55);
        text-decoration: none;
        transition: all .2s;
        font-family: 'Space Grotesk', sans-serif;
        font-size: .65rem; font-weight: 700;
        letter-spacing: .02em;
        flex-shrink: 0;
        position: relative;
      }
      .yyp-bn-tab svg { width: 20px; height: 20px; }
      .yyp-bn-tab:hover { color: #fff; }
      .yyp-bn-tab.is-active {
        background: #FFD000;
        color: #111;
        box-shadow: 0 4px 12px rgba(255, 208, 0, .35);
      }
      .yyp-bn-tab.is-active svg { stroke-width: 2.5; }

      .yyp-bn-tab[data-tab="ask-fred"] {
        background: #FFD000;
        color: #111;
        margin: -10px 4px 0;
        width: 56px; height: 56px;
        border-radius: 50%;
        box-shadow: 0 8px 20px rgba(255, 208, 0, .45);
      }
      .yyp-bn-tab[data-tab="ask-fred"] span { display: none; }
      .yyp-bn-tab[data-tab="ask-fred"] svg { width: 24px; height: 24px; }
      .yyp-bn-tab[data-tab="ask-fred"].is-active {
        background: #fff; color: #111;
      }
    `;
    document.head.appendChild(css);
  }

  /* Resolve "active" tab from current pathname */
  function activeTab() {
    const p = location.pathname.toLowerCase();
    if (p.endsWith('/') || p.endsWith('index.html')) return 'home';
    if (p.includes('discover'))    return 'explore';
    if (p.includes('ai-search'))   return 'ask-fred';
    if (p.includes('saved'))       return 'saved';
    if (p.includes('account/'))    return 'profile';
    return null;
  }

  const TABS = [
    { id: 'home',     label: 'Home',     href: 'index.html',
      icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    { id: 'explore',  label: 'Explore',  href: 'discover.html',
      icon: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>' },
    { id: 'ask-fred', label: 'Fred',     href: 'ai-search.html',
      icon: '<path d="M14 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0M10 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0M16 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" /><path d="M8 16s1.5 2 4 2 4-2 4-2"/>' },
    { id: 'saved',    label: 'Saved',    href: 'account/saved.html',
      icon: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>' },
    { id: 'profile',  label: 'Profile',  href: 'account/index.html',
      icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
  ];

  /* Build & inject */
  function render() {
    const root = rootHref();
    const active = activeTab();
    const html = `
      <nav class="yyp-bottom-nav" aria-label="Bottom navigation">
        ${TABS.map(t => `
          <a class="yyp-bn-tab ${t.id === active ? 'is-active' : ''}"
             href="${root}${t.href}"
             data-tab="${t.id}"
             aria-label="${t.label}"
             aria-current="${t.id === active ? 'page' : 'false'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
            <span>${t.label}</span>
          </a>
        `).join('')}
      </nav>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);
  }

  function rootHref() {
    return location.pathname.includes('/admin/') || location.pathname.includes('/account/') ? '../' : '';
  }

  /* Guard saved/profile tabs: open auth modal if not signed in */
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('.yyp-bn-tab');
    if (!a) return;
    const tab = a.dataset.tab;
    if ((tab === 'saved' || tab === 'profile') && !window.YYP?.account?.isSignedIn) {
      e.preventDefault();
      window.YYP.openAuthModal({
        intent: tab === 'saved'
          ? 'Sign in to access your saved places'
          : 'Sign in to view your profile'
      });
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();

})();
