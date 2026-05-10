/* ============================================================
   YUMYUMPO — Main JavaScript
   Homepage interactions, data rendering, animations
   ============================================================ */

'use strict';

/* ── RESTAURANT DATA (static seed — replace with Supabase queries) ── */

const FEATURED_RESTAURANTS = [
  {
    id: 1,
    slug: 'marias-kitchen',
    name: "Maria's Kitchen",
    cuisine: 'Filipino · Home-cooked',
    description: 'Authentic Filipino comfort food made with love. Famous for their sinigang and crispy lechon.',
    location: 'El Nido, Palawan',
    rating: 4.8,
    reviews: 1238,
    badge: 'Editor\'s Pick',
    tags: ['Local Favorite', 'Family-Friendly', 'Affordable'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🍛',
  },
  {
    id: 2,
    slug: 'sunset-grill',
    name: 'Sunset Grill',
    cuisine: 'Seafood · BBQ',
    description: 'Perched above the water with jaw-dropping sunsets and the freshest grilled seafood in town.',
    location: 'Coron, Palawan',
    rating: 4.9,
    reviews: 874,
    badge: '🔥 Trending',
    tags: ['Romantic', 'Scenic View', 'Seafood'],
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🌅',
  },
  {
    id: 3,
    slug: 'brew-and-bite',
    name: 'Brew & Bite',
    cuisine: 'Café · All-day brunch',
    description: 'A cozy café where specialty coffee meets incredible brunch plates. Perfect for slow mornings.',
    location: 'BGC, Taguig',
    rating: 4.7,
    reviews: 2104,
    badge: 'Best Café',
    tags: ['Café', 'WiFi-Friendly', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '☕',
  },
  {
    id: 4,
    slug: 'ramen-tori',
    name: 'Ramen Tori',
    cuisine: 'Japanese · Ramen',
    description: 'Rich, deep broths simmered 18 hours. The kind of ramen that ruins all other ramen for you.',
    location: 'Makati, Metro Manila',
    rating: 4.8,
    reviews: 3891,
    badge: 'Most Loved',
    tags: ['Late Night', 'Date Spot', 'Must Try'],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🍜',
  },
  {
    id: 5,
    slug: 'la-mesa-verde',
    name: 'La Mesa Verde',
    cuisine: 'Healthy · Plant-based',
    description: 'Creative plant-based cuisine that makes going green feel like an indulgence.',
    location: 'Poblacion, Makati',
    rating: 4.6,
    reviews: 542,
    badge: '🌿 Healthy',
    tags: ['Vegan', 'Healthy', 'Trendy'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🥗',
  },
  {
    id: 6,
    slug: 'the-smokehouse',
    name: 'The Smokehouse',
    cuisine: 'BBQ · American',
    description: 'Low and slow. Tender, fall-off-the-bone ribs and smoked brisket that dreams are made of.',
    location: 'Cebu City',
    rating: 4.7,
    reviews: 1566,
    badge: 'Top Rated',
    tags: ['BBQ', 'Group-Friendly', 'Value for Money'],
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🔥',
  },
];

const TRENDING_RESTAURANTS = [
  {
    id: 7,
    slug: 'izakaya-nori',
    name: 'Izakaya Nori',
    cuisine: 'Japanese · Izakaya',
    rating: 4.9,
    location: 'Quezon City',
    rank: '#1 This Week',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 8,
    slug: 'paluto-na',
    name: 'Paluto Na!',
    cuisine: 'Filipino · Fresh Market',
    rating: 4.7,
    location: 'Boracay Island',
    rank: '#2 This Week',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 9,
    slug: 'creperie-manila',
    name: 'Crêperie Manila',
    cuisine: 'French · Crêpes',
    rating: 4.6,
    location: 'Bonifacio Global City',
    rank: '#3 This Week',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 10,
    slug: 'fishermans-wharf',
    name: "Fisherman's Wharf",
    cuisine: 'Seafood · Grill',
    rating: 4.8,
    location: 'Puerto Galera',
    rank: '#4 This Week',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=80',
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
  const stars = renderStars(r.rating);
  const tagsHTML = r.tags.map((t, i) =>
    `<span class="card-tag ${i === 0 ? 'orange' : ''}">${t}</span>`
  ).join('');

  return `
    <article class="restaurant-card" onclick="goToRestaurant('${r.slug}')" role="button" tabindex="0">
      <div class="card-image-wrap">
        <img src="${r.image}" alt="${r.name}" loading="lazy" />
        <div class="card-badge">${r.badge}</div>
        <div class="card-logo">
          <span class="card-logo-placeholder">${r.logo_emoji}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-rating">
          ${stars}
          <span>${r.rating}</span>
          <span class="review-count">(${r.reviews.toLocaleString()} reviews)</span>
        </div>
        <h3 class="card-name">${r.name}</h3>
        <p class="card-cuisine">${r.cuisine}</p>
        <p class="card-desc">${r.description}</p>
        <div class="card-location">
          <svg class="w-3.5 h-3.5 text-warm-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          ${r.location}
        </div>
        <div class="card-tags">${tagsHTML}</div>
      </div>
    </article>
  `;
}

function trendingCard(r) {
  return `
    <article class="trending-card" onclick="goToRestaurant('${r.slug}')" role="button" tabindex="0">
      <div class="trending-card-image">
        <img src="${r.image}" alt="${r.name}" loading="lazy" />
      </div>
      <div class="trending-card-body">
        <p class="trending-rank">${r.rank}</p>
        <h3 class="trending-name">${r.name}</h3>
        <p class="trending-meta">${r.cuisine} · ${r.location}</p>
        <div class="flex items-center gap-1 mt-2">
          <span class="text-yellow-400 text-xs">★</span>
          <span class="text-xs font-semibold text-charcoal">${r.rating}</span>
        </div>
      </div>
    </article>
  `;
}

function tourismCard(r) {
  return `
    <article class="tourism-card" onclick="goToRestaurant('${r.slug}')" role="button" tabindex="0">
      <img src="${r.image}" alt="${r.name}" loading="lazy" />
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
      <div class="skeleton-image skeleton" style="${isSmall ? 'aspect-ratio:3/2' : ''}"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line" style="width:60%"></div>
        <div class="skeleton skeleton-line" style="width:80%; height:20px"></div>
        <div class="skeleton skeleton-line" style="width:45%"></div>
        <div class="skeleton skeleton-line" style="width:90%"></div>
      </div>
    </div>
  `;
}


/* ── STAR RENDERER ── */
function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  let html = '';
  for (let i = 0; i < full; i++) html += '<span class="star">★</span>';
  if (half) html += '<span class="star" style="opacity:0.5">★</span>';
  return html;
}


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
  // Toggle active state
  document.querySelectorAll('.cuisine-pill').forEach(el => {
    el.classList.toggle('active', el.textContent.trim() === cuisine);
  });
  // In production: filter restaurant grid via Supabase query
  console.log(`Filtering by: ${cuisine}`);
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
  const suffix = el.nextElementSibling?.textContent?.includes('%') ? '' : '';

  const tick = (now) => {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value    = Math.floor(eased * target);

    el.textContent = value.toLocaleString() + (el.nextElementSibling?.textContent?.includes('%') ? '%' : '+');

    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString() + (target < 100 ? '%' : '+');
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
