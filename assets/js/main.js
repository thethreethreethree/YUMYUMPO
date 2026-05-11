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
    ai_summary: 'Beloved local haunt serving authentic Filipino comfort food. Famous for their sinigang and crispy lechon — the kind of place that feels like home.',
    location: 'El Nido, Palawan',
    rating: 4.8,
    reviews: 1238,
    badge: 'Editor\'s Pick',
    tags: ['Local Favorite', 'Family-Friendly', 'Budget-Friendly'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🍛',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000001',
    website: null,
    maps: 'https://maps.google.com/?q=El+Nido+Palawan',
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
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000002',
    website: 'https://sunsetgrill.ph',
    maps: 'https://maps.google.com/?q=Coron+Palawan',
  },
  {
    id: 3,
    slug: 'brew-and-bite',
    name: 'Brew & Bite',
    cuisine: 'Café · All-day brunch',
    ai_summary: 'A cozy café where specialty single-origin coffee meets incredible brunch plates. Solid WiFi, better vibes — popular with digital nomads and travelers alike.',
    location: 'BGC, Taguig',
    rating: 4.7,
    reviews: 2104,
    badge: 'Best Café',
    tags: ['WiFi-Friendly', 'Instagrammable', 'Backpacker-Approved'],
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '☕',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000003',
    website: 'https://brewandbite.ph',
    maps: 'https://maps.google.com/?q=BGC+Taguig',
  },
  {
    id: 4,
    slug: 'ramen-tori',
    name: 'Ramen Tori',
    cuisine: 'Japanese · Ramen',
    ai_summary: 'Rich, 18-hour broths that ruin all other ramen permanently. Consistently ranked as Makati\'s top Japanese spot — expect queues on weekends.',
    location: 'Makati, Metro Manila',
    rating: 4.8,
    reviews: 3891,
    badge: 'Most Loved',
    tags: ['Late Night', 'Date Spot', 'Must Try'],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    logo_emoji: '🍜',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000004',
    website: 'https://ramentori.ph',
    maps: 'https://maps.google.com/?q=Makati+Metro+Manila',
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
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000005',
    website: null,
    maps: 'https://maps.google.com/?q=Poblacion+Makati',
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
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000006',
    website: 'https://thesmokehouse.ph',
    maps: 'https://maps.google.com/?q=Cebu+City',
  },
];

const TRENDING_RESTAURANTS = [
  {
    id: 7,
    slug: 'izakaya-nori',
    name: 'Izakaya Nori',
    cuisine: 'Japanese · Izakaya',
    ai_summary: 'Vibey izakaya with skewers, sake, and sashimi until 2am. A backpacker rite of passage.',
    rating: 4.9,
    reviews: 2210,
    location: 'Quezon City',
    rank: '#1 This Week',
    tags: ['Late Night', 'Hidden Gem'],
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000007',
    website: null,
    maps: 'https://maps.google.com/?q=Quezon+City',
  },
  {
    id: 8,
    slug: 'paluto-na',
    name: 'Paluto Na!',
    cuisine: 'Filipino · Fresh Market',
    ai_summary: 'Pick your fresh catch, they cook it your way. The most authentic island dining experience in Boracay.',
    rating: 4.7,
    reviews: 988,
    location: 'Boracay Island',
    rank: '#2 This Week',
    tags: ['Beach Dining', 'Local Favorite'],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000008',
    website: null,
    maps: 'https://maps.google.com/?q=Boracay+Island',
  },
  {
    id: 9,
    slug: 'siargao-surf-kitchen',
    name: 'Siargao Surf Kitchen',
    cuisine: 'Café · All-day',
    ai_summary: 'Acai bowls and all-day brunch right next to Cloud 9. The ultimate surf-town café experience.',
    rating: 4.8,
    reviews: 743,
    location: 'General Luna, Siargao',
    rank: '#3 This Week',
    tags: ['Beach Dining', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&auto=format&fit=crop&q=80',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000009',
    website: 'https://siargaosurfkitchen.ph',
    maps: 'https://maps.google.com/?q=General+Luna+Siargao',
  },
  {
    id: 10,
    slug: 'fishermans-wharf',
    name: "Fisherman's Wharf",
    cuisine: 'Seafood · Grill',
    ai_summary: 'Bonfires on the beach, barbecued squid, and cold beers. The quintessential island night-out experience.',
    rating: 4.8,
    reviews: 821,
    location: 'Puerto Galera',
    rank: '#4 This Week',
    tags: ['Romantic', 'Scenic View'],
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=80',
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/639000000010',
    website: null,
    maps: 'https://maps.google.com/?q=Puerto+Galera',
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
          ${r.instagram ? `<a href="${r.instagram}" target="_blank" rel="noopener" class="card-social-btn" title="Instagram" onclick="trackSocial('instagram','${r.slug}')">${iconInstagram()}</a>` : ''}
          ${r.whatsapp  ? `<a href="${r.whatsapp}"  target="_blank" rel="noopener" class="card-social-btn" title="WhatsApp" onclick="trackSocial('whatsapp','${r.slug}')">${iconWhatsApp()}</a>` : ''}
          ${r.maps      ? `<a href="${r.maps}"      target="_blank" rel="noopener" class="card-social-btn" title="Google Maps" onclick="trackSocial('maps','${r.slug}')">${iconMaps()}</a>` : ''}
          ${r.website   ? `<a href="${r.website}"   target="_blank" rel="noopener" class="card-social-btn card-social-btn--website" title="Visit Website" onclick="trackSocial('website','${r.slug}')">Visit Website ${iconArrow()}</a>`
                        : `<a href="admin/index.html" class="card-social-btn card-social-btn--claim" title="Claim this listing">Get a Website</a>`}
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
        <div class="card-actions" onclick="event.stopPropagation()" style="padding-top:8px;border-top:1px solid var(--gray-100)">
          ${r.instagram ? `<a href="${r.instagram}" target="_blank" rel="noopener" class="card-social-btn" title="Instagram" onclick="trackSocial('instagram','${r.slug}')">${iconInstagram()}</a>` : ''}
          ${r.whatsapp  ? `<a href="${r.whatsapp}"  target="_blank" rel="noopener" class="card-social-btn" title="WhatsApp" onclick="trackSocial('whatsapp','${r.slug}')">${iconWhatsApp()}</a>` : ''}
          ${r.maps      ? `<a href="${r.maps}"      target="_blank" rel="noopener" class="card-social-btn" title="Google Maps" onclick="trackSocial('maps','${r.slug}')">${iconMaps()}</a>` : ''}
          ${r.website   ? `<a href="${r.website}" target="_blank" rel="noopener" class="card-social-btn card-social-btn--website" onclick="trackSocial('website','${r.slug}')">Visit Website ${iconArrow()}</a>`
                        : `<a href="admin/index.html" class="card-social-btn card-social-btn--claim">Get a Website</a>`}
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


/* ── SOCIAL ICON HELPERS ── */
function iconInstagram() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;
}
function iconWhatsApp() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
}
function iconMaps() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
}
function iconArrow() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>`;
}

/* ── SOCIAL CLICK TRACKING ── */
window.trackSocial = function(type, slug) {
  if (typeof YAn !== 'undefined') {
    YAn.track('social_click', { type, restaurant_slug: slug });
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
