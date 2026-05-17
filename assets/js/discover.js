/* ============================================================
   YUMYUMPO — Restaurant Discovery Engine
   Handles: search, filtering, sorting, rendering, pagination
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   FULL RESTAURANT DATASET
   In production: fetched from Supabase on init.
   Each record matches the `restaurants` table schema.
══════════════════════════════════════════════════════════ */
const ALL_RESTAURANTS = [
  {
    id: 1, slug: 'marias-kitchen',
    name: "Maria's Kitchen",
    cuisine: 'Filipino',
    description: 'Authentic Filipino comfort food made with love. Famous for sinigang, crispy lechon, and kare-kare that tastes like home.',
    ai_summary: 'Beloved local haunt serving authentic Filipino comfort food. A go-to for backpackers and families — the kind of place that feels like home.',
    location: 'El Nido, Palawan',
    rating: 4.8, reviews: 1238,
    buzz: 'trending',
    badge: "Editor's Pick", badge_style: 'default',
    tags: ['Local Favorite', 'Family-Friendly', 'Budget-Friendly', 'Backpacker-Approved'],
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🍛',
    has_yumyumpo_site: true, website: null,
    created_at: '2024-01-10',
  },
  {
    id: 2, slug: 'sunset-grill',
    name: 'Sunset Grill',
    cuisine: 'Seafood',
    description: 'Perched above the water with jaw-dropping sunsets. The freshest grilled seafood and the coldest beers in Coron.',
    ai_summary: 'Perched above the water with jaw-dropping sunset views. A must-visit for couples and travelers chasing golden-hour magic over grilled seafood.',
    location: 'Coron, Palawan',
    rating: 4.9, reviews: 874,
    buzz: 'trending',
    badge: '🔥 Trending', badge_style: 'dark',
    tags: ['Romantic', 'Scenic View', 'Beach Dining', 'Date Spot'],
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🌅',
    has_yumyumpo_site: false, website: 'https://sunsetgrill.ph',
    created_at: '2024-02-14',
  },
  {
    id: 3, slug: 'brew-and-bite',
    name: 'Brew & Bite',
    cuisine: 'Café',
    description: 'A cozy café with specialty single-origin coffee and incredible brunch plates. The WiFi is solid, the vibes even better.',
    ai_summary: 'Specialty single-origin coffee meets incredible all-day brunch. Solid WiFi, even better vibes — popular with digital nomads and slow-morning travelers.',
    location: 'BGC, Taguig',
    rating: 4.7, reviews: 2104,
    buzz: 'hot',
    badge: 'Best Café', badge_style: 'default',
    tags: ['WiFi-Friendly', 'Instagrammable', 'Backpacker-Approved', 'Hidden Gem'],
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '☕',
    has_yumyumpo_site: true, website: null,
    created_at: '2024-01-28',
  },
  {
    id: 4, slug: 'ramen-tori',
    name: 'Ramen Tori',
    cuisine: 'Japanese',
    description: 'Rich, deep broths simmered 18 hours. The kind of ramen that ruins all other ramen for you — permanently.',
    ai_summary: 'Rich, 18-hour broths that ruin all other ramen permanently. Consistently ranked Makati\'s top Japanese spot — expect queues, they\'re worth it.',
    location: 'Makati, Metro Manila',
    rating: 4.8, reviews: 3891,
    buzz: 'hot',
    badge: 'Most Loved', badge_style: 'default',
    tags: ['Late Night', 'Date Spot', 'Must Try', 'Local Favorite'],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🍜',
    has_yumyumpo_site: false, website: 'https://ramentori.ph',
    created_at: '2023-11-05',
  },
  {
    id: 5, slug: 'la-mesa-verde',
    name: 'La Mesa Verde',
    cuisine: 'Vegan',
    description: 'Creative plant-based cuisine that makes going green feel like an indulgence. Every plate is a work of art.',
    ai_summary: 'Creative plant-based cuisine that makes going green feel like an indulgence. Every plate is a work of art — popular with health-conscious travelers.',
    location: 'Poblacion, Makati',
    rating: 4.6, reviews: 542,
    badge: '🌿 Healthy', badge_style: 'default',
    tags: ['Vegan', 'Healthy', 'Instagrammable', 'Scenic View'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🥗',
    has_yumyumpo_site: false, website: null,
    created_at: '2024-03-01',
  },
  {
    id: 6, slug: 'the-smokehouse',
    name: 'The Smokehouse',
    cuisine: 'BBQ',
    description: 'Low and slow. Tender, fall-off-the-bone ribs and smoked brisket that dreams are made of. Full racks on weekends.',
    ai_summary: 'Low and slow is the only way here. Tender smoked brisket and fall-off-the-bone ribs that draw crowds from across the city every weekend.',
    location: 'Cebu City',
    rating: 4.7, reviews: 1566,
    buzz: 'trending',
    badge: 'Top Rated', badge_style: 'default',
    tags: ['Group-Friendly', 'Budget-Friendly', 'Local Favorite', 'Family-Friendly'],
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🔥',
    has_yumyumpo_site: true, website: null,
    created_at: '2023-12-12',
  },
  {
    id: 7, slug: 'izakaya-nori',
    name: 'Izakaya Nori',
    cuisine: 'Japanese',
    description: 'Vibey Japanese izakaya energy — skewers, sake, and sashimi until 2am. A backpacker rite of passage in QC.',
    ai_summary: 'Vibey izakaya with skewers, sake, and sashimi until 2am. A backpacker rite of passage in Quezon City.',
    location: 'Quezon City',
    rating: 4.9, reviews: 2210,
    badge: '#1 This Week', badge_style: 'dark',
    tags: ['Late Night', 'Backpacker-Approved', 'Hidden Gem', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🍶',
    has_yumyumpo_site: true, website: null,
    created_at: '2024-04-02',
  },
  {
    id: 8, slug: 'paluto-na',
    name: 'Paluto Na!',
    cuisine: 'Filipino',
    description: 'Pick your fresh catch from the market and they cook it however you want. The most authentic island dining experience.',
    ai_summary: 'Pick your fresh catch, they cook it your way. The most authentic island dining experience in Boracay — a must for every first-time visitor.',
    location: 'Boracay Island',
    rating: 4.7, reviews: 988,
    badge: '🏝️ Island Life', badge_style: 'default',
    tags: ['Beach Dining', 'Local Favorite', 'Budget-Friendly', 'Backpacker-Approved'],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🐟',
    has_yumyumpo_site: false, website: null,
    created_at: '2024-01-18',
  },
  {
    id: 9, slug: 'siargao-surf-kitchen',
    name: 'Siargao Surf Kitchen',
    cuisine: 'Café',
    description: 'Acai bowls, fresh smoothies, and all-day brunch for surfers and sun-chasers. Right next to Cloud 9.',
    ai_summary: 'Acai bowls and all-day brunch right next to Cloud 9. The ultimate surf-town café — popular with every backpacker passing through Siargao.',
    location: 'General Luna, Siargao',
    rating: 4.8, reviews: 743,
    badge: '🏄 Surf Town', badge_style: 'dark',
    tags: ['Beach Dining', 'Healthy', 'Backpacker-Approved', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🌊',
    has_yumyumpo_site: true, website: null,
    created_at: '2024-03-20',
  },
  {
    id: 10, slug: 'korean-bbq-house',
    name: 'K-Grill House',
    cuisine: 'Korean',
    description: 'All-you-can-eat Korean BBQ with unlimited samgyupsal and banchan. The go-to for group nights out.',
    ai_summary: 'Unlimited samgyupsal and banchan for groups. The undisputed go-to for late-night Korean BBQ in Manila.',
    location: 'Malate, Manila',
    rating: 4.5, reviews: 1890,
    badge: 'Group Favorite', badge_style: 'default',
    tags: ['Group-Friendly', 'Budget-Friendly', 'Late Night', 'Family-Friendly'],
    image: 'https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🥩',
    has_yumyumpo_site: false, website: null,
    created_at: '2023-10-30',
  },
  {
    id: 11, slug: 'bohol-bites',
    name: 'Bohol Bites',
    cuisine: 'Filipino',
    description: 'Tiny warung-style spot famous for their chocolate hills tsokolate and crispy batchoy. A hidden gem.',
    ai_summary: 'Tiny warung-style spot famous for chocolate hills tsokolate and crispy batchoy. A true hidden gem that locals guard fiercely.',
    location: 'Tagbilaran, Bohol',
    rating: 4.6, reviews: 328,
    badge: '💎 Hidden Gem', badge_style: 'dark',
    tags: ['Hidden Gem', 'Budget-Friendly', 'Local Favorite', 'Backpacker-Approved'],
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🫙',
    has_yumyumpo_site: false, website: null,
    created_at: '2024-02-08',
  },
  {
    id: 12, slug: 'pizzeria-roma',
    name: 'Pizzeria Roma',
    cuisine: 'Italian',
    description: 'Wood-fired Neapolitan pizza with imported 00 flour and San Marzano tomatoes. Closest thing to Italy in Manila.',
    ai_summary: 'Wood-fired Neapolitan pizza with imported ingredients — the closest thing to Italy in Metro Manila. Perfect for date nights.',
    location: 'Salcedo Village, Makati',
    rating: 4.7, reviews: 1104,
    badge: 'Most Popular', badge_style: 'default',
    tags: ['Date Spot', 'Romantic', 'Instagrammable', 'Family-Friendly'],
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🍕',
    has_yumyumpo_site: true, website: null,
    created_at: '2023-09-15',
  },
  {
    id: 13, slug: 'el-pescador',
    name: 'El Pescador',
    cuisine: 'Seafood',
    description: 'Fishermen dock directly at the restaurant every morning. If it swam yesterday, it is on the menu today.',
    ai_summary: 'Fishermen dock directly here every morning. If it swam yesterday, it\'s on today\'s menu — as fresh as seafood gets in El Nido.',
    location: 'El Nido, Palawan',
    rating: 4.8, reviews: 612,
    badge: '🎣 Super Fresh', badge_style: 'dark',
    tags: ['Beach Dining', 'Local Favorite', 'Hidden Gem', 'Scenic View'],
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🎣',
    has_yumyumpo_site: false, website: null,
    created_at: '2024-04-10',
  },
  {
    id: 14, slug: 'burger-republic',
    name: 'Burger Republic',
    cuisine: 'Burgers',
    description: 'Smash burgers with wagyu beef, house sauces, and a lineup of milkshakes that breaks the internet weekly.',
    ai_summary: 'Wagyu smash burgers and internet-breaking milkshakes. Budget-friendly, late-night, and consistently packed with regulars.',
    location: 'Kapitolyo, Pasig',
    rating: 4.6, reviews: 2340,
    badge: '🍔 Fan Fave', badge_style: 'default',
    tags: ['Budget-Friendly', 'Late Night', 'Backpacker-Approved', 'Group-Friendly'],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🍔',
    has_yumyumpo_site: false, website: 'https://burgerrepublic.ph',
    created_at: '2024-01-02',
  },
  {
    id: 15, slug: 'tacos-del-sol',
    name: 'Tacos del Sol',
    cuisine: 'Mexican',
    description: 'Authentic birria tacos, street-style quesadillas, and horchata that will make you forget you are not in Mexico.',
    ai_summary: 'Authentic birria tacos and street-style quesadillas. The horchata alone is worth the trip — a Poblacion staple for late-night cravings.',
    location: 'Poblacion, Makati',
    rating: 4.5, reviews: 876,
    badge: '🌮 Street Vibes', badge_style: 'default',
    tags: ['Late Night', 'Budget-Friendly', 'Backpacker-Approved', 'Instagrammable'],
    image: 'https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🌮',
    has_yumyumpo_site: false, website: null,
    created_at: '2024-03-11',
  },
  {
    id: 16, slug: 'halo-halo-ni-lola',
    name: 'Halo-Halo ni Lola',
    cuisine: 'Desserts',
    description: 'The most legendary halo-halo in the Philippines. Three generations deep, zero compromise on quality.',
    ai_summary: 'Three generations deep, zero compromise. The most legendary halo-halo in the Philippines — every traveler should make the pilgrimage to Iloilo for this.',
    location: 'Iloilo City',
    rating: 4.9, reviews: 4102,
    badge: '🍨 Legendary', badge_style: 'dark',
    tags: ['Local Favorite', 'Budget-Friendly', 'Family-Friendly', 'Backpacker-Approved'],
    image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🍧',
    has_yumyumpo_site: true, website: null,
    created_at: '2023-08-01',
  },
  {
    id: 17, slug: 'canton-empire',
    name: 'Canton Empire',
    cuisine: 'Chinese',
    description: 'Dim sum carts rolling from 6am and a roast duck that has a cult following. Weekend queues are long — and worth it.',
    ai_summary: 'Dim sum carts rolling from 6am in the heart of Binondo. The roast duck has a cult following — weekend queues are long and completely worth it.',
    location: 'Binondo, Manila',
    rating: 4.6, reviews: 3200,
    badge: '🥟 Binondo Classic', badge_style: 'default',
    tags: ['Family-Friendly', 'Local Favorite', 'Budget-Friendly', 'Group-Friendly'],
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '🥢',
    has_yumyumpo_site: false, website: null,
    created_at: '2023-07-22',
  },
  {
    id: 18, slug: 'fishermans-wharf',
    name: "Fisherman's Wharf",
    cuisine: 'Seafood',
    description: 'Bonfires on the beach, barbecued squid, and cold beers. The quintessential island night-out experience.',
    ai_summary: 'Bonfires on the beach, barbecued squid, and cold beers under the stars. The quintessential island night-out — romantic, raw, unforgettable.',
    location: 'Puerto Galera',
    rating: 4.8, reviews: 821,
    badge: '🏖️ Beach Bonfires', badge_style: 'dark',
    tags: ['Beach Dining', 'Late Night', 'Romantic', 'Scenic View'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop&q=75',
    logo_emoji: '⚓',
    has_yumyumpo_site: true, website: null,
    created_at: '2024-02-22',
  },
];


/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
const state = {
  search:    '',
  cuisine:   'all',
  tags:      new Set(),
  locations: new Set(),
  rating:    0,
  sort:      'rating',
  view:      'grid',
  page:      1,
  perPage:   9,
};


/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
/* The static ALL_RESTAURANTS above is the fallback dataset.
   If Supabase is reachable, we replace it with live data. */
let DATASET = ALL_RESTAURANTS;

document.addEventListener('DOMContentLoaded', () => {
  // Check URL params for pre-applied filters
  const params = new URLSearchParams(window.location.search);
  if (params.get('cuisine')) state.cuisine = params.get('cuisine');
  if (params.get('tag'))     state.tags.add(params.get('tag'));
  if (params.get('q'))       state.search = params.get('q');

  // Sync search input if pre-filled
  if (state.search) {
    const navInput = document.getElementById('nav-search');
    if (navInput) navInput.value = state.search;
    showSearchClear();
  }

  // Activate correct cuisine tab if pre-filtered
  if (state.cuisine !== 'all') {
    document.querySelectorAll('.filter-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cuisine === state.cuisine);
    });
  }

  /* Render immediately with whatever dataset is available, then
     swap in Supabase data when it arrives. */
  updateTabCounts();
  renderResults();

  if (window.YYP?.ready) loadFromSupabase();
  else document.addEventListener('yyp:ready', loadFromSupabase, { once: true });

  /* Refresh the dataset whenever the tab regains focus or visibility,
     so newly-added restaurants appear without a full reload. */
  let lastRefresh = Date.now();
  const REFRESH_COOLDOWN = 5_000;
  function maybeRefresh() {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastRefresh < REFRESH_COOLDOWN) return;
    lastRefresh = Date.now();
    loadFromSupabase();
  }
  document.addEventListener('visibilitychange', maybeRefresh);
  window.addEventListener('focus', maybeRefresh);
});

async function loadFromSupabase() {
  if (!window.db?.getHomepagePicks) return;
  try {
    const data = await window.db.getHomepagePicks({ limit: 200, order: 'rating' });
    if (data?.length) {
      DATASET = data;
      updateTabCounts();
      renderResults();
    }
  } catch (err) {
    console.warn('[Discover] Supabase load failed, using static fallback:', err);
  }
  /* Repopulate the sidebar filters from real data — replaces the
     hardcoded "Palawan 8 / Boracay 6 / ..." placeholders. */
  renderLocationFilter();
  renderTagFilter();
}

/* Build the LOCATION filter sidebar from whatever's in DATASET.
   Groups by the comma-separated city/area (so "Coron, Palawan" and
   "El Nido, Palawan" both count toward "Palawan" — drop the segment
   before the comma if a province segment exists, otherwise the head). */
function renderLocationFilter() {
  const container = document.getElementById('location-filter-list');
  if (!container) return;
  const counts = new Map();
  for (const r of DATASET) {
    const loc = (r.location || '').trim();
    if (!loc) continue;
    /* "El Nido, Palawan" → ["El Nido","Palawan"] — prefer the LAST
       segment so multiple barangays roll up to one province/city. */
    const parts = loc.split(',').map(s => s.trim()).filter(Boolean);
    const key = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (counts.size === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic px-2 py-2">No locations yet</p>';
    return;
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  container.innerHTML = sorted.map(([loc, n]) => {
    const checked = state.locations?.has(loc) ? 'checked' : '';
    return `
      <label class="filter-checkbox-row">
        <input type="checkbox" value="loc:${escapeHtmlAttr(loc)}" ${checked} onchange="toggleLocation(this)" />
        <span class="filter-checkbox-label">${escapeHtml(loc)}</span>
        <span class="filter-checkbox-count">${n}</span>
      </label>`;
  }).join('');
}

function escapeHtml(s)     { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeHtmlAttr(s) { return escapeHtml(s); }

/* Vibe / Tags filter — built from the actual tag set on real restaurants.
   Shows the top ~12 tags by occurrence so the sidebar stays compact. */
function renderTagFilter() {
  const container = document.getElementById('tag-filter-list');
  if (!container) return;
  const counts = new Map();
  for (const r of DATASET) {
    const tags = Array.isArray(r.tags) ? r.tags : [];
    for (const t of tags) {
      if (!t) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  if (counts.size === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic px-2 py-2">No tags yet</p>';
    return;
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  container.innerHTML = sorted.map(([tag, n]) => {
    const checked = state.tags?.has(tag) ? 'checked' : '';
    return `
      <label class="filter-checkbox-row">
        <input type="checkbox" value="${escapeHtmlAttr(tag)}" ${checked} onchange="toggleTag(this)" />
        <span class="filter-checkbox-label">${tagEmoji(tag)}${escapeHtml(tag)}</span>
        <span class="filter-checkbox-count">${n}</span>
      </label>`;
  }).join('');
}


/* ══════════════════════════════════════════════════════════
   FILTER ENGINE
══════════════════════════════════════════════════════════ */
function getFilteredRestaurants() {
  let results = [...DATASET];

  // Search
  if (state.search.trim()) {
    const q = state.search.toLowerCase().trim();
    results = results.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Cuisine
  if (state.cuisine !== 'all') {
    results = results.filter(r => r.cuisine === state.cuisine);
  }

  // Tags (must match ALL selected tags)
  if (state.tags.size > 0) {
    results = results.filter(r =>
      [...state.tags].every(tag => r.tags.includes(tag))
    );
  }

  // Locations
  if (state.locations.size > 0) {
    results = results.filter(r =>
      [...state.locations].some(loc => r.location.toLowerCase().includes(loc.toLowerCase()))
    );
  }

  // Rating
  if (state.rating > 0) {
    results = results.filter(r => r.rating >= state.rating);
  }

  // Sort
  results.sort((a, b) => {
    switch (state.sort) {
      case 'rating':  return b.rating - a.rating;
      case 'reviews': return b.reviews - a.reviews;
      case 'newest':  return new Date(b.created_at) - new Date(a.created_at);
      case 'name':    return a.name.localeCompare(b.name);
      default:        return 0;
    }
  });

  return results;
}


/* ══════════════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════════════ */
function renderResults() {
  const filtered = getFilteredRestaurants();
  const visible  = filtered.slice(0, state.page * state.perPage);
  const grid     = document.getElementById('results-grid');
  const countEl  = document.getElementById('results-count');
  const loadWrap = document.getElementById('load-more-wrap');

  // Update count
  if (countEl) {
    const noun = filtered.length === 1 ? 'restaurant' : 'restaurants';
    countEl.textContent = `${filtered.length} ${noun} found`;
  }

  // Render active filter chips
  renderActiveChips();

  // Empty state
  if (!filtered.length) {
    if (grid) grid.innerHTML = emptyState();
    if (loadWrap) loadWrap.classList.add('hidden');
    return;
  }

  // Show / hide load more
  if (loadWrap) {
    loadWrap.classList.toggle('hidden', visible.length >= filtered.length);
  }

  // Render cards
  if (!grid) return;

  if (state.view === 'list') {
    grid.className = 'results-list';
    grid.innerHTML = visible.map((r, i) => listCard(r, i)).join('');
  } else {
    grid.className = 'results-grid';
    grid.innerHTML = visible.map((r, i) => gridCard(r, i)).join('');
  }

  // Animate cards in
  requestAnimationFrame(() => {
    grid.querySelectorAll('.restaurant-card, .list-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.transitionDelay = `${Math.min(i * 0.05, 0.4)}s`;
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    });
  });
}


/* ══════════════════════════════════════════════════════════
   CARD TEMPLATES
══════════════════════════════════════════════════════════ */
function buzzPill(r) {
  if (!r.buzz) return '';
  const label = r.buzz === 'hot' ? '🔥 Hot' : '📈 Trending';
  const title = r.buzz === 'hot'
    ? 'Trending on YUMYUMPO — top 10% this week'
    : 'Trending on YUMYUMPO this week';
  return `<span class="card-buzz ${r.buzz}" title="${title}"><span class="buzz-dot"></span>${label}</span>`;
}

function gridCard(r, idx) {
  const tagsHTML = r.tags.slice(0, 3).map((t, i) => {
    const cls = i === 0 ? 'card-tag yellow' : 'card-tag';
    return `<span class="${cls}">${tagEmoji(t)}${t}</span>`;
  }).join('');

  const badgeCls = r.badge_style === 'dark' ? 'card-badge dark' : 'card-badge white';

  return `
    <article
      class="restaurant-card"
      onclick="openRestaurant('${r.slug}')"
      onkeydown="if(event.key==='Enter')openRestaurant('${r.slug}')"
      role="button"
      tabindex="0"
      aria-label="View ${r.name}"
    >
      <div class="card-image-wrap">
        <img
          src="${r.image}"
          alt="${r.name}"
          loading="${idx < 6 ? 'eager' : 'lazy'}"
          onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&auto=format&fit=crop&q=75'"
        />
        <span class="${badgeCls}">${r.badge}</span>
        <button
          class="card-save-btn"
          onclick="event.stopPropagation(); toggleSave('${r.slug}', this)"
          aria-label="Save restaurant"
          title="Save to favourites"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
        <button class="card-share" type="button" aria-label="Share this restaurant" title="Share"
          onclick="event.stopPropagation();event.preventDefault();shareVenue('${r.slug}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>

      <div class="card-body">
        ${buzzPill(r)}
        <div class="card-rating">
          <span class="stars">${starString(r.rating)}</span>
          <span class="score">${r.rating}</span>
          <span class="count">(${r.reviews.toLocaleString()} Google reviews)</span>
        </div>
        <h3 class="card-name">${r.name}</h3>
        <p class="card-cuisine">${r.cuisine}</p>
        <p class="card-ai-summary">${r.ai_summary || r.description}</p>
        <div class="card-location">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          ${r.location}
        </div>
        <div class="card-tags">${tagsHTML}</div>
        <div class="card-actions" onclick="event.stopPropagation()">
          ${dCardCTA(r)}
        </div>
      </div>
    </article>
  `;
}

function listCard(r, idx) {
  const tagsHTML = r.tags.slice(0, 3).map(t =>
    `<span class="card-tag">${tagEmoji(t)}${t}</span>`
  ).join('');

  return `
    <article
      class="list-card"
      onclick="openRestaurant('${r.slug}')"
      role="button" tabindex="0"
      aria-label="View ${r.name}"
    >
      <div class="list-card-image">
        <img src="${r.image}" alt="${r.name}" loading="${idx < 4 ? 'eager' : 'lazy'}"
          onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75'" />
      </div>
      <div class="list-card-body">
        <div>
          ${buzzPill(r)}
          <div class="flex items-start justify-between gap-3 mb-1">
            <div>
              <span class="text-xs font-black text-yellow-600 uppercase tracking-wider">${r.cuisine}</span>
              <h3 class="card-name mt-0.5">${r.name}</h3>
            </div>
            <span class="card-badge white shrink-0">${r.badge}</span>
          </div>
          <div class="card-rating mb-2">
            <span class="stars">${starString(r.rating)}</span>
            <span class="score">${r.rating}</span>
            <span class="count">(${r.reviews.toLocaleString()} Google reviews)</span>
          </div>
          <p class="card-ai-summary text-sm line-clamp-2 mb-3">${r.ai_summary || r.description}</p>
        </div>
        <div>
          <div class="card-location mb-2">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
            ${r.location}
          </div>
          <div class="card-tags mb-3">${tagsHTML}</div>
          <div class="card-actions" onclick="event.stopPropagation()">
            ${dCardCTA(r)}
          </div>
        </div>
      </div>
    </article>
  `;
}

function emptyState() {
  return `
    <div class="empty-state">
      <span class="empty-state-emoji">🍽️</span>
      <h3 class="font-display font-bold text-xl text-brand-black mb-2">No restaurants found</h3>
      <p class="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Try adjusting your search or removing some filters to see more results.</p>
      <button class="btn-primary mx-auto" onclick="resetAllFilters()">
        Clear All Filters
      </button>
    </div>
  `;
}


/* ══════════════════════════════════════════════════════════
   ACTIVE FILTER CHIPS (applied filters row)
══════════════════════════════════════════════════════════ */
function renderActiveChips() {
  const container = document.getElementById('active-filter-chips');
  if (!container) return;

  const chips = [];

  if (state.search) {
    chips.push({ label: `"${state.search}"`, remove: () => { state.search = ''; clearSearch(); } });
  }
  if (state.cuisine !== 'all') {
    chips.push({ label: state.cuisine, remove: () => setCuisine('all', document.querySelector('.filter-tab[data-cuisine="all"]')) });
  }
  state.tags.forEach(tag => {
    chips.push({ label: tag, remove: () => removeTag(tag) });
  });
  state.locations.forEach(loc => {
    chips.push({ label: loc, remove: () => removeLocation(loc) });
  });
  if (state.rating > 0) {
    chips.push({ label: `${state.rating}+ stars`, remove: () => setRating(0, null) });
  }

  container.innerHTML = chips.map((c, i) => `
    <button
      class="active-filter-chip"
      onclick="filterChipRemove(${i})"
      data-chip="${i}"
    >
      ${c.label}
      <span class="remove">×</span>
    </button>
  `).join('');

  // Store remove fns (can't serialize into HTML)
  window._chipRemoveFns = chips.map(c => c.remove);
}

window.filterChipRemove = function(i) {
  if (window._chipRemoveFns?.[i]) {
    window._chipRemoveFns[i]();
    state.page = 1;
    renderResults();
  }
};


/* ══════════════════════════════════════════════════════════
   FILTER HANDLERS (called from HTML)
══════════════════════════════════════════════════════════ */

/* Cuisine tab */
window.setCuisine = function(cuisine, btn) {
  state.cuisine = cuisine;
  state.page    = 1;
  document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderResults();
};

/* Tag toggle (sidebar checkboxes) */
window.toggleTag = function(checkbox) {
  if (checkbox.checked) state.tags.add(checkbox.value);
  else                  state.tags.delete(checkbox.value);
  state.page = 1;
  renderResults();
};

/* Location toggle */
window.toggleLocation = function(checkbox) {
  const loc = checkbox.value.replace('loc:', '');
  if (checkbox.checked) state.locations.add(loc);
  else                  state.locations.delete(loc);
  state.page = 1;
  rememberCity();
  renderResults();
};

/* Remember the city the visitor is exploring so the home page's
   location-based promotions can feature it. Stores the most recent
   selected location (city only); clears it when no filter is set. */
function rememberCity() {
  try {
    if (state.locations && state.locations.size) {
      const latest = [...state.locations].pop();
      const city = String(latest || '').split(',')[0].trim();
      if (city) localStorage.setItem('yyp_city', city);
    } else {
      localStorage.removeItem('yyp_city');
    }
  } catch { /* localStorage unavailable — non-fatal */ }
  /* Let the Live Promotions strip re-scope to the new city. */
  document.dispatchEvent(new CustomEvent('yyp:city-changed'));
}

/* Vibe quick-filter (hero chips) */
window.applyVibe = function(tag) {
  if (state.tags.has(tag)) state.tags.delete(tag);
  else state.tags.add(tag);
  // Sync sidebar checkboxes
  document.querySelectorAll(`input[value="${tag}"]`).forEach(cb => {
    cb.checked = state.tags.has(tag);
  });
  state.page = 1;
  renderResults();
};

function removeTag(tag) {
  state.tags.delete(tag);
  document.querySelectorAll(`input[value="${tag}"]`).forEach(cb => cb.checked = false);
  state.page = 1;
  renderResults();
}

function removeLocation(loc) {
  state.locations.delete(loc);
  document.querySelectorAll(`input[value="loc:${loc}"]`).forEach(cb => cb.checked = false);
  state.page = 1;
  rememberCity();
  renderResults();
}

/* Rating filter */
window.setRating = function(rating, btn) {
  state.rating = rating;
  state.page   = 1;
  document.querySelectorAll('.rating-btn').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderResults();
};

/* Sort */
window.applySort = function(sort) {
  state.sort = sort;
  state.page = 1;
  renderResults();
};

/* Search */
window.syncSearch = function(value) {
  state.search = value;
  state.page   = 1;
  // Keep all search inputs in sync
  ['nav-search', 'mobile-hero-search'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== value) el.value = value;
  });
  // Show/hide clear btn
  const clear = document.getElementById('nav-search-clear');
  if (clear) clear.classList.toggle('visible', value.length > 0);
  renderResults();
};

window.clearSearch = function() {
  state.search = '';
  ['nav-search', 'mobile-hero-search'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const clear = document.getElementById('nav-search-clear');
  if (clear) clear.classList.remove('visible');
  state.page = 1;
  renderResults();
};

function showSearchClear() {
  const clear = document.getElementById('nav-search-clear');
  if (clear) clear.classList.add('visible');
}

/* Reset all */
window.resetAllFilters = function() {
  state.search   = '';
  state.cuisine  = 'all';
  state.tags     = new Set();
  state.locations = new Set();
  state.rating   = 0;
  state.sort     = 'rating';
  state.page     = 1;
  rememberCity();

  // Reset checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  // Reset tabs
  document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
  const allTab = document.querySelector('.filter-tab[data-cuisine="all"]');
  if (allTab) allTab.classList.add('active');
  // Reset rating
  document.querySelectorAll('.rating-btn').forEach((el, i) => el.classList.toggle('active', i === 0));
  // Reset sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'rating';
  // Clear search inputs
  clearSearch();

  renderResults();
};

/* Load more */
window.loadMore = function() {
  const btn = document.getElementById('load-more-btn');
  if (btn) btn.classList.add('loading');
  setTimeout(() => {
    state.page++;
    renderResults();
    if (btn) btn.classList.remove('loading');
  }, 400);
};


/* ══════════════════════════════════════════════════════════
   VIEW TOGGLE (grid / list)
══════════════════════════════════════════════════════════ */
window.setView = function(view) {
  state.view = view;
  const gridBtn = document.getElementById('grid-view-btn');
  const listBtn = document.getElementById('list-view-btn');

  if (gridBtn) {
    gridBtn.className = view === 'grid'
      ? 'p-2 rounded-lg bg-white text-brand-black shadow-sm transition-all'
      : 'p-2 rounded-lg text-gray-400 transition-all hover:text-brand-black';
  }
  if (listBtn) {
    listBtn.className = view === 'list'
      ? 'p-2 rounded-lg bg-white text-brand-black shadow-sm transition-all'
      : 'p-2 rounded-lg text-gray-400 transition-all hover:text-brand-black';
  }

  renderResults();
};


/* ══════════════════════════════════════════════════════════
   MOBILE FILTER DRAWER
══════════════════════════════════════════════════════════ */
window.openFilterDrawer = function() {
  document.getElementById('filter-drawer')?.classList.add('open');
  document.getElementById('drawer-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeFilterDrawer = function() {
  document.getElementById('filter-drawer')?.classList.remove('open');
  document.getElementById('drawer-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
};


/* ══════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════ */
window.openRestaurant = function(slug) {
  const r = DATASET.find(x => x.slug === slug);
  trackDiscoveryEvent('card_click', slug, r?.id || null);
  /* Premium / YUMYUMPO-hosted → internal profile page (which itself surfaces
     the external website CTA + WhatsApp/IG floaters). Pure external listings
     (no profile worth showing) → straight to their site. */
  if (r && r.has_yumyumpo_site) {
    window.location.href = `restaurant.html?slug=${slug}`;
    return;
  }
  const url = r && (r.website || r.website_url);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.href = `restaurant.html?slug=${slug}`;
};

/* Save / favourite (local storage) */
window.toggleSave = function(slug, btn) {
  const saved = JSON.parse(localStorage.getItem('yumyumpo_saved') || '[]');
  const idx   = saved.indexOf(slug);
  if (idx === -1) {
    saved.push(slug);
    btn.style.background = 'var(--yellow)';
    btn.title = 'Saved!';
  } else {
    saved.splice(idx, 1);
    btn.style.background = '';
    btn.title = 'Save to favourites';
  }
  localStorage.setItem('yumyumpo_saved', JSON.stringify(saved));
};


/* ══════════════════════════════════════════════════════════
   TAB COUNTS
══════════════════════════════════════════════════════════ */
function updateTabCounts() {
  const el = document.getElementById('tab-count-all');
  if (el) el.textContent = ALL_RESTAURANTS.length;
}


/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function starString(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 0; i < 5; i++) {
    if (i < full)         s += '★';
    else if (i === full && half) s += '½';
    else                  s += '☆';
  }
  return s;
}

function tagEmoji(tag) {
  const map = {
    'Budget-Friendly':     '💸 ',
    'Hidden Gem':          '💎 ',
    'Backpacker-Approved': '🎒 ',
    'Romantic':            '🕯️ ',
    'Local Favorite':      '❤️ ',
    'Late Night':          '🌙 ',
    'Beach Dining':        '🏖️ ',
    'Scenic View':         '🌅 ',
    'Family-Friendly':     '👨‍👩‍👧 ',
    'Instagrammable':      '📸 ',
    'WiFi-Friendly':       '📶 ',
    'Group-Friendly':      '👥 ',
    'Date Spot':           '💑 ',
    'Must Try':            '🔥 ',
    'Healthy':             '🥗 ',
    'Vegan':               '🌿 ',
  };
  return map[tag] || '';
}


/* ── CARD CTA (discover page — mirrors main.js cardCTA logic) ── */
function dCardCTA(r) {
  if (r.has_yumyumpo_site) {
    return `<a href="restaurant.html?slug=${r.slug}" class="card-cta card-cta--profile" onclick="event.stopPropagation(); if(typeof trackWebsiteClick==='function') trackWebsiteClick('profile','${r.slug}')">View Full Profile <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`;
  }
  const url = r.website || r.website_url;
  if (url) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="card-cta card-cta--external" onclick="event.stopPropagation(); if(typeof trackWebsiteClick==='function') trackWebsiteClick('external','${r.slug}')">Visit Website <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg></a>`;
  }
  return `<a href="admin/apply.html?ref=get-listed&restaurant=${encodeURIComponent(r.name)}" class="card-cta card-cta--funnel" onclick="event.stopPropagation()">Get Listed on YUMYUMPO</a>`;
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════ */
function trackDiscoveryEvent(type, slug, restaurantId = null) {
  window.db?.trackAnalyticsEvent(type, restaurantId, { slug, source: 'discover' });
}

/* trackWebsiteClick is defined globally in main.js — available on all pages */

/* ── Quick share (restaurant cards) ──────────────────────────
   Native share sheet on mobile; clipboard copy + toast elsewhere. */
window.shareVenue = function (slug) {
  if (!slug) return;
  const url = location.origin + '/restaurant.html?slug=' + encodeURIComponent(slug);
  if (navigator.share) {
    navigator.share({ title: 'YUMYUMPO', text: 'Check out this restaurant on YUMYUMPO', url }).catch(() => {});
    return;
  }
  try { navigator.clipboard.writeText(url); } catch (_) {}
  let t = document.getElementById('yyp-share-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'yyp-share-toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;font-weight:600;font-size:.85rem;padding:11px 20px;border-radius:12px;z-index:9999;opacity:0;transition:opacity .2s;box-shadow:0 8px 24px rgba(0,0,0,.25)';
    document.body.appendChild(t);
  }
  t.textContent = 'Link copied — share it anywhere ✓';
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  clearTimeout(window.__yypShareTimer);
  window.__yypShareTimer = setTimeout(() => { t.style.opacity = '0'; }, 2200);
};
