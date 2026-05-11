/* ============================================================
   YUMYUMPO — Main JavaScript
   Homepage interactions, data rendering, animations
   ============================================================ */

'use strict';

/* ── RESTAURANT DATA (static seed — replace with Supabase queries) ── */

/*
 * has_yumyumpo_site: true  → restaurant uses YUMYUMPO Premium Hosting
 *                            card CTA → restaurant.html (internal, full analytics)
 * website: 'https://...'   → restaurant has their own site
 *                            card CTA → external redirect (click tracked)
 * neither                  → card shows "Get Listed" funnel
 */
const FEATURED_RESTAURANTS = [
  {
    id: 1,
    slug: 'marias-kitchen',
    name: "Maria's Kitchen",
    cuisine: 'Filipino · Home-cooked',
    ai_summary: 'Beloved local haunt serving authentic Filipino comfort food. Famous for their sinigang and crispy lechon — the kind of place that feels like home.',
    location: 'El Nido, Palawan',
    rating: 4.8,
    reviews: 1238,
    badge: 'Editor\'s Pick',
    tags: ['Local Favorite', 'Family-Friendly', 'Budget-Friendly'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🍛',
    has_yumyumpo_site: true,
    website: null,
  },
  {
    id: 2,
    slug: 'sunset-grill',
    name: 'Sunset Grill',
    cuisine: 'Seafood · BBQ',
    ai_summary: 'Perched above the water with jaw-dropping views. A go-to for couples and travelers chasing golden-hour magic over grilled seafood.',
    location: 'Coron, Palawan',
    rating: 4.9,
    reviews: 874,
    badge: '🔥 Trending',
    tags: ['Romantic', 'Scenic View', 'Beach Dining'],
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🌅',
    has_yumyumpo_site: false,
    website: 'https://sunsetgrill.ph',
  },
  {
    id: 3,
    slug: 'brew-and-bite',
    name: 'Brew & Bite',
    cuisine: 'Café · All-day brunch',
    ai_summary: 'Specialty single-origin coffee meets incredible all-day brunch. Solid WiFi, even better vibes — popular with digital nomads and slow-morning travelers.',
    location: 'BGC, Taguig',
    rating: 4.7,
    reviews: 2104,
    badge: 'Best Café',
    tags: ['WiFi-Friendly', 'Instagrammable', 'Backpacker-Approved'],
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '☕',
    has_yumyumpo_site: true,
    website: null,
  },
  {
    id: 4,
    slug: 'ramen-tori',
    name: 'Ramen Tori',
    cuisine: 'Japanese · Ramen',
    ai_summary: 'Rich, 18-hour broths that ruin all other ramen permanently. Consistently ranked Makati\'s top Japanese spot — expect queues, they\'re worth it.',
    location: 'Makati, Metro Manila',
    rating: 4.8,
    reviews: 3891,
    badge: 'Most Loved',
    tags: ['Late Night', 'Date Spot', 'Must Try'],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🍜',
    has_yumyumpo_site: false,
    website: 'https://ramentori.ph',
  },
  {
    id: 5,
    slug: 'la-mesa-verde',
    name: 'La Mesa Verde',
    cuisine: 'Healthy · Plant-based',
    ai_summary: 'Creative plant-based cuisine that makes going green feel like an indulgence. Every plate is a work of art — popular with health-conscious travelers.',
    location: 'Poblacion, Makati',
    rating: 4.6,
    reviews: 542,
    badge: '🌿 Healthy',
    tags: ['Vegan', 'Healthy', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🥗',
    has_yumyumpo_site: false,
    website: null,
  },
  {
    id: 6,
    slug: 'the-smokehouse',
    name: 'The Smokehouse',
    cuisine: 'BBQ · American',
    ai_summary: 'Low and slow is the only way here. Tender smoked brisket and fall-off-the-bone ribs that draw crowds from across the city every weekend.',
    location: 'Cebu City',
    rating: 4.7,
    reviews: 1566,
    badge: 'Top Rated',
    tags: ['Group-Friendly', 'Budget-Friendly', 'Local Favorite'],
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🔥',
    has_yumyumpo_site: true,
    website: null,
  },
];

const TRENDING_RESTAURANTS = [
  {
    id: 7, slug: 'izakaya-nori',
    name: 'Izakaya Nori', cuisine: 'Japanese · Izakaya',
    ai_summary: 'Vibey izakaya with skewers, sake, and sashimi until 2am. A backpacker rite of passage in QC.',
    rating: 4.9, reviews: 2210, location: 'Quezon City', rank: '#1 This Week',
    tags: ['Late Night', 'Hidden Gem'],
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    has_yumyumpo_site: true, website: null,
  },
  {
    id: 8, slug: 'paluto-na',
    name: 'Paluto Na!', cuisine: 'Filipino · Fresh Market',
    ai_summary: 'Pick your fresh catch, they cook it your way. The most authentic island dining in Boracay.',
    rating: 4.7, reviews: 988, location: 'Boracay Island', rank: '#2 This Week',
    tags: ['Beach Dining', 'Local Favorite'],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
    has_yumyumpo_site: false, website: null,
  },
  {
    id: 9, slug: 'siargao-surf-kitchen',
    name: 'Siargao Surf Kitchen', cuisine: 'Café · All-day',
    ai_summary: 'Acai bowls and all-day brunch right next to Cloud 9. The ultimate surf-town café experience.',
    rating: 4.8, reviews: 743, location: 'General Luna, Siargao', rank: '#3 This Week',
    tags: ['Beach Dining', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&auto=format&fit=crop&q=80',
    has_yumyumpo_site: true, website: null,
  },
  {
    id: 10, slug: 'fishermans-wharf',
    name: "Fisherman's Wharf", cuisine: 'Seafood · Grill',
    ai_summary: 'Bonfires on the beach, barbecued squid, and cold beers. The quintessential island night-out.',
    rating: 4.8, reviews: 821, location: 'Puerto Galera', rank: '#4 This Week',
    tags: ['Romantic', 'Scenic View'],
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=80',
    has_yumyumpo_site: false, website: 'https://fishermanswharf.ph',
  },
];

const TOURISM_RESTAURANTS = [
  {
    id: 11,
    slug: 'el-nido-eats',
    name: 'El Nido Eats',
    tag: '🏝️ Tourist Favorite',
    location: 'El Nido, Palawan',
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 12,
    slug: 'bohol-bites',
    name: 'Bohol Bites',
    tag: '🌺 Hidden Gem',
    location: 'Tagbilaran, Bohol',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 13,
    slug: 'siargao-surf-kitchen',
    name: 'Siargao Surf Kitchen',
    tag: '🏄 Beach Dining',
    location: 'General Luna, Siargao',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
  },
];


/* ── DOM READY ── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  renderFeaturedRestaurants();
  renderTrendingRestaurants();
  renderTourismRestaurants();
  initRevealAnimations();
  initStatsCounter();
  initSearchPlaceholderRotation();
  initMobileMenu();
});


/* ── NAVBAR ── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}


/* ── MOBILE MENU ── */
function initMobileMenu() {
  // Legacy listener — also wired via onclick in HTML
}

window.toggleMobileMenu = function() {
  document.getElementById('mobile-menu')?.classList.toggle('hidden');
};


/* ── RENDER CARDS ── */
function renderFeaturedRestaurants() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  // Show skeletons while "loading"
  grid.innerHTML = Array(6).fill(0).map(skeletonCard).join('');

  setTimeout(() => {
    grid.innerHTML = FEATURED_RESTAURANTS.map(r => featuredCard(r)).join('');
    grid.querySelectorAll('.restaurant-card').forEach((card, i) => {
      card.classList.add('reveal');
      card.style.transitionDelay = `${i * 0.07}s`;
      requestAnimationFrame(() => card.classList.add('visible'));
    });
  }, 600);
}

function renderTrendingRestaurants() {
  const grid = document.getElementById('trending-grid');
  if (!grid) return;

  grid.innerHTML = Array(4).fill(0).map(() => skeletonCard('trending')).join('');

  setTimeout(() => {
    grid.innerHTML = TRENDING_RESTAURANTS.map(r => trendingCard(r)).join('');
    grid.querySelectorAll('.trending-card').forEach((card, i) => {
      card.classList.add('reveal');
      card.style.transitionDelay = `${i * 0.08}s`;
      requestAnimationFrame(() => card.classList.add('visible'));
    });
  }, 700);
}

function renderTourismRestaurants() {
  const grid = document.getElementById('tourism-grid');
  if (!grid) return;

  setTimeout(() => {
    grid.innerHTML = TOURISM_RESTAURANTS.map(r => tourismCard(r)).join('');
    grid.querySelectorAll('.tourism-card').forEach((card, i) => {
      card.classList.add('reveal');
      card.style.transitionDelay = `${i * 0.1}s`;
      requestAnimationFrame(() => card.classList.add('visible'));
    });
  }, 500);
}


/* ── CARD TEMPLATES ── */
function featuredCard(r) {
  const tagsHTML = (r.tags || []).map((t, i) =>
    `<span class="card-tag ${i === 0 ? 'yellow' : ''}">${tagEmoji(t)}${t}</span>`
  ).join('');

  return `
    <article
      class="restaurant-card"
      onclick="goToRestaurant('${r.slug}')"
      role="button" tabindex="0"
      aria-label="View ${r.name}"
    >
      <div class="card-image-wrap">
        <img
          src="${r.image}"
          alt="${r.name}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&auto=format&fit=crop&q=75'"
        />
        <span class="card-badge white">${r.badge}</span>
        ${r.has_yumyumpo_site ? `<span class="card-hosted-badge" title="Powered by YUMYUMPO">⚡ On YUMYUMPO</span>` : ''}
        <button
          class="card-save-btn"
          onclick="event.stopPropagation(); toggleHomeSave('${r.slug}', this)"
          aria-label="Save ${r.name}"
          title="Save to favourites"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
        <div class="card-logo" aria-hidden="true">${r.logo_emoji}</div>
      </div>
      <div class="card-body">
        <div class="card-rating">
          <span class="stars">★★★★★</span>
          <span class="score">${r.rating}</span>
          <span class="count">(${r.reviews.toLocaleString()} Google reviews)</span>
        </div>
        <h3 class="card-name">${r.name}</h3>
        <p class="card-cuisine">${r.cuisine}</p>
        <p class="card-ai-summary">${r.ai_summary || ''}</p>
        <div class="card-location">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          ${r.location}
        </div>
        <div class="card-tags">${tagsHTML}</div>
        <div class="card-actions" onclick="event.stopPropagation()">
          ${cardCTA(r)}
        </div>
      </div>
    </article>
  `;
}

function trendingCard(r) {
  const tagsHTML = (r.tags || []).slice(0, 2).map(t =>
    `<span class="card-tag">${tagEmoji(t)}${t}</span>`
  ).join('');

  return `
    <article
      class="trending-card"
      onclick="goToRestaurant('${r.slug}')"
      role="button" tabindex="0"
      aria-label="View ${r.name}"
    >
      <div class="trending-card-image">
        <img
          src="${r.image}"
          alt="${r.name}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=75'"
        />
        ${r.has_yumyumpo_site ? `<span class="card-hosted-badge" title="Powered by YUMYUMPO">⚡ On YUMYUMPO</span>` : ''}
      </div>
      <div class="trending-card-body">
        <p class="trending-rank">${r.rank}</p>
        <h3 class="trending-name">${r.name}</h3>
        <p class="trending-meta">${r.cuisine}</p>
        <p class="trending-summary">${r.ai_summary || ''}</p>
        <div class="flex items-center gap-1.5 mt-2 mb-2">
          <span style="color:#FACC15;font-size:0.8rem">★</span>
          <span class="text-xs font-black text-brand-black">${r.rating}</span>
          <span class="text-xs text-gray-400">(${(r.reviews || 0).toLocaleString()})</span>
          <span class="text-xs text-gray-300 mx-1">·</span>
          <span class="text-xs text-gray-400">📍 ${r.location}</span>
        </div>
        <div class="card-tags" style="margin-bottom:10px">${tagsHTML}</div>
        <div class="card-actions" onclick="event.stopPropagation()">
          ${cardCTA(r)}
        </div>
      </div>
    </article>
  `;
}

function tourismCard(r) {
  return `
    <article
      class="tourism-card"
      onclick="goToRestaurant('${r.slug}')"
      role="button" tabindex="0"
      aria-label="View ${r.name}"
    >
      <img
        src="${r.image}"
        alt="${r.name}"
        loading="lazy"
        onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=75'"
      />
      <div class="tourism-card-overlay"></div>
      <div class="tourism-card-content">
        <span class="tourism-card-tag">${r.tag}</span>
        <h3 class="tourism-card-name">${r.name}</h3>
        <p class="tourism-card-location">📍 ${r.location}</p>
      </div>
    </article>
  `;
}

function skeletonCard(type = 'featured') {
  const isSmall = type === 'trending';
  return `
    <div class="skeleton-card">
      <div class="skeleton-image skeleton" style="${isSmall ? 'aspect-ratio:3/2' : 'aspect-ratio:4/3'}"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line" style="width:35%; height:10px"></div>
        <div class="skeleton skeleton-line" style="width:75%; height:18px; margin-top:6px"></div>
        <div class="skeleton skeleton-line" style="width:50%; height:10px"></div>
        <div class="skeleton skeleton-line" style="width:90%; height:10px"></div>
        <div class="skeleton skeleton-line" style="width:65%; height:10px"></div>
      </div>
    </div>
  `;
}


/* ── CARD CTA — single action based on restaurant type ──
 *   has_yumyumpo_site → internal profile page (full analytics)
 *   website only      → external redirect (click tracked)
 *   neither           → get listed funnel
 */
function cardCTA(r) {
  if (r.has_yumyumpo_site) {
    return `
      <a
        href="restaurant.html?id=${r.slug}"
        class="card-cta card-cta--profile"
        onclick="event.stopPropagation(); trackWebsiteClick('profile','${r.slug}')"
      >
        View Full Profile
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>`;
  }
  if (r.website) {
    return `
      <a
        href="${r.website}"
        target="_blank"
        rel="noopener noreferrer"
        class="card-cta card-cta--external"
        onclick="event.stopPropagation(); trackWebsiteClick('external','${r.slug}')"
      >
        Visit Website
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
      </a>`;
  }
  return `
    <a
      href="admin/index.html?ref=get-listed&restaurant=${encodeURIComponent(r.name)}"
      class="card-cta card-cta--funnel"
      onclick="event.stopPropagation()"
    >
      Get Listed on YUMYUMPO
    </a>`;
}

/* ── WEBSITE CLICK TRACKING ── */
window.trackWebsiteClick = function(type, slug) {
  if (typeof YAn !== 'undefined') {
    YAn.track('website_click', { type, restaurant_slug: slug });
  }
};

/* ── TAG EMOJI HELPER (shared with discover.js context on homepage) ── */
function tagEmoji(tag) {
  const map = {
    'Budget-Friendly': '💸 ', 'Local Favorite': '❤️ ', 'Romantic': '🕯️ ',
    'Family-Friendly': '👨‍👩‍👧 ', 'Late Night': '🌙 ', 'Beach Dining': '🏖️ ',
    'Scenic View': '🌅 ', 'Hidden Gem': '💎 ', 'Backpacker-Approved': '🎒 ',
    'Instagrammable': '📸 ', 'WiFi-Friendly': '📶 ', 'Date Spot': '💑 ',
    'Must Try': '🔥 ', 'Healthy': '🥗 ', 'Group-Friendly': '👥 ',
  };
  return map[tag] || '';
}


/* ── SAVE TOGGLE (homepage cards) ── */
window.toggleHomeSave = function(slug, btn) {
  const saved = JSON.parse(localStorage.getItem('yumyumpo_saved') || '[]');
  const idx   = saved.indexOf(slug);
  if (idx === -1) {
    saved.push(slug);
    btn.style.background = 'var(--yellow, #FFD000)';
    btn.title = 'Saved!';
  } else {
    saved.splice(idx, 1);
    btn.style.background = '';
    btn.title = 'Save to favourites';
  }
  localStorage.setItem('yumyumpo_saved', JSON.stringify(saved));
};


/* ── NAVIGATION ── */
function goToRestaurant(slug) {
  // Track the click event
  trackEvent('card_click', { restaurant_slug: slug });
  window.location.href = `restaurant.html?slug=${slug}`;
}


/* ── SEARCH ── */
window.handleSearch = function () {
  const query = document.getElementById('hero-search')?.value?.trim();
  if (!query) return;
  trackEvent('search', { query });
  window.location.href = `discover.html?q=${encodeURIComponent(query)}`;
};

window.fillSearch = function (text) {
  const input = document.getElementById('hero-search');
  if (input) {
    input.value = text;
    input.focus();
  }
};

window.fillAiSearch = function (text) {
  const input = document.getElementById('ai-search');
  if (input) {
    input.value = text;
    input.focus();
  }
};

window.filterByCuisine = function (cuisine) {
  trackEvent('cuisine_filter', { cuisine });
  // Navigate to discover page with pre-applied cuisine filter
  window.location.href = `discover.html?cuisine=${encodeURIComponent(cuisine)}`;
};

// Rotate placeholder text in hero search
function initSearchPlaceholderRotation() {
  const input = document.getElementById('hero-search');
  if (!input) return;

  const placeholders = [
    'Best cafés in El Nido...',
    'Romantic sunset dinner...',
    'Cheap local street food...',
    'Best ramen in Manila...',
    'Hidden gem seafood spots...',
    'Cozy brunch with great coffee...',
  ];

  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % placeholders.length;
    input.setAttribute('placeholder', placeholders[idx]);
  }, 3000);
}

// Allow Enter key for search
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'hero-search') {
    window.handleSearch();
  }
});


/* ── CUISINE FILTER ── */
// (Wire to Supabase in production)


/* ── SCROLL REVEAL ── */
function initRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.section-header, .stat-item').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}


/* ── STATS COUNTER ── */
function initStatsCounter() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.count);
      animateCount(el, target);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

function animateCount(el, target) {
  const duration = 1800;
  const startTime = performance.now();
  // Read suffix directly from the element's original text (set in HTML as e.g. "0+" or "0%")
  const originalText = el.textContent || '';
  const suffix = originalText.includes('%') ? '%' : '+';

  const tick = (now) => {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const value    = Math.floor(eased * target);
    el.textContent = value.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString() + suffix;
  };

  requestAnimationFrame(tick);
}


/* ── ANALYTICS (stub — connects to Supabase) ── */
function trackEvent(eventType, metadata = {}) {
  // In production, send to Supabase analytics_events table
  if (window.supabase) {
    window.supabase
      .from('analytics_events')
      .insert([{ event_type: eventType, metadata, created_at: new Date().toISOString() }])
      .then(({ error }) => { if (error) console.warn('Analytics error:', error); });
  }
  // Also log locally for debugging
  if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
    console.log('[Analytics]', eventType, metadata);
  }
}
