/* ============================================================
   YUMYUMPO — Admin Dashboard JS  v2.0
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   RESTAURANT DATA
══════════════════════════════════════════════════════════ */
const ADMIN_RESTAURANTS = [
  { id:1,  name:"Maria's Kitchen",      emoji:'🍛', cuisine:'Filipino',  location:'El Nido, Palawan',    rating:4.8, views:3847, whatsapp:312, website:88,  featured:true,  active:true,  slug:'marias-kitchen' },
  { id:2,  name:'Sunset Grill',         emoji:'🌅', cuisine:'Seafood',   location:'Coron, Palawan',      rating:4.9, views:2901, whatsapp:278, website:124, featured:true,  active:true,  slug:'sunset-grill' },
  { id:3,  name:'Brew & Bite',          emoji:'☕', cuisine:'Café',      location:'BGC, Taguig',         rating:4.7, views:5214, whatsapp:94,  website:441, featured:false, active:true,  slug:'brew-and-bite' },
  { id:4,  name:'Ramen Tori',           emoji:'🍜', cuisine:'Japanese',  location:'Makati, Metro Manila',rating:4.8, views:4102, whatsapp:201, website:312, featured:true,  active:true,  slug:'ramen-tori' },
  { id:5,  name:'La Mesa Verde',        emoji:'🥗', cuisine:'Vegan',     location:'Poblacion, Makati',   rating:4.6, views:1388, whatsapp:62,  website:108, featured:false, active:true,  slug:'la-mesa-verde' },
  { id:6,  name:'The Smokehouse',       emoji:'🔥', cuisine:'BBQ',       location:'Cebu City',           rating:4.7, views:2766, whatsapp:210, website:188, featured:false, active:true,  slug:'the-smokehouse' },
  { id:7,  name:'Izakaya Nori',         emoji:'🍶', cuisine:'Japanese',  location:'Quezon City',         rating:4.9, views:3201, whatsapp:185, website:0,   featured:true,  active:true,  slug:'izakaya-nori' },
  { id:8,  name:"Fisherman's Wharf",    emoji:'⚓', cuisine:'Seafood',   location:'Puerto Galera',       rating:4.8, views:1955, whatsapp:144, website:67,  featured:false, active:false, slug:'fishermans-wharf' },
  { id:9,  name:'K-Grill House',        emoji:'🥩', cuisine:'Korean',    location:'Malate, Manila',      rating:4.5, views:1890, whatsapp:98,  website:0,   featured:false, active:true,  slug:'korean-bbq-house' },
  { id:10, name:'Siargao Surf Kitchen', emoji:'🌊', cuisine:'Café',      location:'General Luna, Siargao',rating:4.8, views:743, whatsapp:127, website:88,  featured:false, active:true,  slug:'siargao-surf-kitchen' },
];

const ALL_TAGS = [
  'Local Favorite', 'Tourist Favorite', 'Romantic', 'Family-Friendly',
  'Late Night', 'Budget-Friendly', 'Fine Dining', 'Instagrammable',
  'Outdoor Seating', 'Breakfast', 'Lunch', 'Dinner',
  'Healthy', 'Must Try', 'Date Spot', 'Group-Friendly', 'WiFi-Friendly',
  'Scenic View', 'Hidden Gem', 'Chef Special', 'Beach Dining',
  'Backpacker-Approved', 'Seafood', 'Vegan', 'Gluten-Free',
];

let selectedTags = new Set();
let filteredRestaurants = [...ADMIN_RESTAURANTS];


/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderTopRestaurants();
  renderIntelligence();
  renderRestaurantList(ADMIN_RESTAURANTS);
  renderFeaturedList();
  renderTagSelector();
  updateStatTotal();
  initSlugAutoFill();
});


/* ══════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════ */
window.showTab = function(tabName) {
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  const tabs = { dashboard:0, restaurants:1, add:2, featured:4 };
  const links = document.querySelectorAll('.sidebar-link');
  if (typeof tabs[tabName] !== 'undefined' && links[tabs[tabName]]) {
    links[tabs[tabName]].classList.add('active');
  }
};


/* ══════════════════════════════════════════════════════════
   DASHBOARD — TOP PERFORMERS
══════════════════════════════════════════════════════════ */
function renderTopRestaurants() {
  const container = document.getElementById('top-restaurants-list');
  if (!container) return;

  const top = [...ADMIN_RESTAURANTS]
    .filter(r => r.active)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  container.innerHTML = top.map((r, i) => {
    const totalClicks = r.whatsapp + r.website;
    const ctr = r.views > 0 ? ((totalClicks / r.views) * 100).toFixed(1) : '0';
    const perfClass = parseFloat(ctr) >= 20 ? 'perf-hot' : parseFloat(ctr) >= 10 ? 'perf-stable' : 'perf-low';
    const perfLabel = parseFloat(ctr) >= 20 ? '↑ Hot' : parseFloat(ctr) >= 10 ? '→ Stable' : '↓ Low';
    const spark = generateSparkline(r.views);

    return `
      <div class="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
        <span class="font-black text-gray-400 text-sm w-5 text-center">${i+1}</span>
        <span class="text-xl">${r.emoji}</span>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-brand-black truncate">${r.name}</p>
          <p class="text-xs text-gray-400">${r.cuisine} · ${r.location}</p>
        </div>
        <div class="sparkline">${spark}</div>
        <div class="text-right">
          <p class="text-sm font-black text-brand-black">${r.views.toLocaleString()}</p>
          <p class="text-xs text-gray-400">views</p>
        </div>
        <span class="perf-badge ${perfClass}">${perfLabel}</span>
      </div>
    `;
  }).join('');
}

function generateSparkline(baseViews) {
  const bars = Array.from({ length: 7 }, () =>
    Math.max(3, Math.floor(Math.random() * 100))
  );
  const max = Math.max(...bars);
  const today = bars.length - 1;
  return bars.map((v, i) => {
    const h = Math.max(3, Math.round((v / max) * 24));
    return `<div class="spark-bar ${i === today ? 'lit' : ''}" style="height:${h}px"></div>`;
  }).join('');
}


/* ══════════════════════════════════════════════════════════
   DASHBOARD — RESTAURANT INTELLIGENCE
   Identifies opportunities and performance alerts
══════════════════════════════════════════════════════════ */
function renderIntelligence() {
  const container = document.getElementById('intelligence-list');
  if (!container) return;

  const insights = generateInsights(ADMIN_RESTAURANTS);

  container.innerHTML = insights.map(insight => `
    <div class="flex items-start gap-4 p-4 rounded-xl border ${insight.border} ${insight.bg}">
      <div class="text-xl shrink-0 mt-0.5">${insight.icon}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-0.5">
          <p class="font-bold text-sm text-brand-black">${insight.title}</p>
          <span class="perf-badge ${insight.badge}">${insight.type}</span>
        </div>
        <p class="text-xs text-gray-600">${insight.message}</p>
      </div>
      ${insight.action ? `
        <a href="${insight.action.href}" class="shrink-0 text-xs font-bold text-brand-black bg-brand-yellow px-3 py-1.5 rounded-lg hover:bg-yellow-400 transition-colors">
          ${insight.action.label}
        </a>` : ''}
    </div>
  `).join('');
}

function generateInsights(restaurants) {
  const insights = [];
  const active = restaurants.filter(r => r.active);

  // Top performer reward
  const top = [...active].sort((a, b) => b.views - a.views)[0];
  if (top) insights.push({
    icon: '🏆', type: 'Opportunity', badge: 'perf-hot',
    bg: 'bg-yellow-50', border: 'border-yellow-200',
    title: `${top.name} is your #1 performer`,
    message: `${top.views.toLocaleString()} views this week. Consider featuring them on the homepage to amplify reach further.`,
    action: { label: 'Feature Now', href: '#' },
  });

  // Low CTR alert
  const lowCTR = active.filter(r => {
    const ctr = ((r.whatsapp + r.website) / r.views) * 100;
    return ctr < 5 && r.views > 500;
  });
  if (lowCTR.length) insights.push({
    icon: '⚠️', type: 'Alert', badge: 'perf-low',
    bg: 'bg-red-50', border: 'border-red-200',
    title: `${lowCTR.length} restaurant${lowCTR.length > 1 ? 's' : ''} with low CTR`,
    message: `${lowCTR.map(r => r.name).slice(0,2).join(', ')} have high views but low click-throughs. Check if contact links are correctly set up.`,
    action: { label: 'Review Listings', href: '#' },
  });

  // Inactive restaurants
  const inactive = restaurants.filter(r => !r.active);
  if (inactive.length) insights.push({
    icon: '💤', type: 'Action Needed', badge: 'perf-stable',
    bg: 'bg-gray-50', border: 'border-gray-200',
    title: `${inactive.length} restaurant${inactive.length > 1 ? 's' : ''} inactive`,
    message: `${inactive.map(r => r.name).join(', ')} ${inactive.length > 1 ? 'are' : 'is'} not visible to users. Reactivate to restore visibility.`,
    action: { label: 'Manage', href: '#' },
  });

  // WhatsApp champion
  const waChamp = [...active].sort((a,b) => b.whatsapp - a.whatsapp)[0];
  if (waChamp && waChamp.whatsapp > 200) insights.push({
    icon: '💬', type: 'Insight', badge: 'perf-hot',
    bg: 'bg-green-50', border: 'border-green-200',
    title: `${waChamp.name} leads in WhatsApp conversions`,
    message: `${waChamp.whatsapp} WhatsApp clicks this week. This restaurant is effectively converting profile views into real customer actions.`,
    action: null,
  });

  // No featured restaurants in a cuisine
  const cuisines = [...new Set(active.map(r => r.cuisine))];
  const unfeaturedCuisines = cuisines.filter(c =>
    active.filter(r => r.cuisine === c && r.featured).length === 0
  );
  if (unfeaturedCuisines.length) insights.push({
    icon: '🎯', type: 'Marketing', badge: 'perf-stable',
    bg: 'bg-blue-50', border: 'border-blue-200',
    title: `${unfeaturedCuisines.length} cuisine categories have no featured restaurant`,
    message: `${unfeaturedCuisines.slice(0,3).join(', ')} have no featured listing. Add one to improve discoverability for these categories.`,
    action: { label: 'Set Featured', href: '#' },
  });

  return insights.slice(0, 5);
}


/* ══════════════════════════════════════════════════════════
   RESTAURANT LIST
══════════════════════════════════════════════════════════ */
function renderRestaurantList(list) {
  const container = document.getElementById('restaurant-list');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<p class="text-center text-gray-400 py-10 text-sm">No restaurants found.</p>';
    return;
  }

  container.innerHTML = list.map(r => {
    const totalClicks = (r.whatsapp || 0) + (r.website || 0);
    const ctr = r.views > 0 ? ((totalClicks / r.views) * 100).toFixed(1) : '0';

    return `
      <div class="restaurant-row">
        <div class="w-10 h-10 rounded-xl bg-yellow-light flex items-center justify-center text-lg shrink-0">${r.emoji}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-bold text-sm text-brand-black">${r.name}</p>
            ${r.featured ? '<span class="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Featured</span>' : ''}
            ${!r.active  ? '<span class="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>' : ''}
          </div>
          <p class="text-xs text-gray-400">${r.cuisine} · ${r.location}</p>
        </div>
        <div class="hidden sm:flex items-center gap-5 text-xs text-gray-400">
          <div class="text-center">
            <p class="font-black text-brand-black text-sm">${r.views.toLocaleString()}</p>
            <p>views</p>
          </div>
          <div class="text-center">
            <p class="font-black text-green-600 text-sm">${(r.whatsapp||0).toLocaleString()}</p>
            <p>whatsapp</p>
          </div>
          <div class="text-center">
            <p class="font-black text-blue-600 text-sm">${ctr}%</p>
            <p>CTR</p>
          </div>
          <span class="text-yellow-400">★ ${r.rating}</span>
        </div>
        <div class="flex items-center gap-1">
          <a href="../restaurant.html?slug=${r.slug}" target="_blank"
             class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-black transition-colors" title="View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <button onclick="toggleFeatured(${r.id})"
             class="p-2 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="${r.featured ? 'Remove feature' : 'Feature'}">
            <svg class="w-4 h-4" fill="${r.featured ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
          </button>
          <button onclick="toggleActive(${r.id})"
             class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-black transition-colors" title="${r.active ? 'Deactivate' : 'Activate'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${r.active ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}"/></svg>
          </button>
          <button onclick="deleteRestaurant(${r.id})"
             class="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.filterRestaurants = function() {
  const search  = document.getElementById('restaurant-search')?.value?.toLowerCase() || '';
  const cuisine = document.getElementById('cuisine-filter')?.value || '';
  const status  = document.getElementById('status-filter')?.value || '';

  filteredRestaurants = ADMIN_RESTAURANTS.filter(r => {
    const matchSearch  = !search  || r.name.toLowerCase().includes(search) || r.location.toLowerCase().includes(search);
    const matchCuisine = !cuisine || r.cuisine === cuisine;
    const matchStatus  = !status
      || (status === 'active'   && r.active && !r.featured)
      || (status === 'featured' && r.featured)
      || (status === 'inactive' && !r.active);
    return matchSearch && matchCuisine && matchStatus;
  });

  renderRestaurantList(filteredRestaurants);
};

window.toggleFeatured = function(id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (r) r.featured = !r.featured;
  renderRestaurantList(filteredRestaurants);
  renderTopRestaurants();
  renderFeaturedList();
  renderIntelligence();
};

window.toggleActive = function(id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (r) r.active = !r.active;
  renderRestaurantList(filteredRestaurants);
  updateStatTotal();
  renderIntelligence();
};

window.deleteRestaurant = function(id) {
  if (!confirm('Delete this restaurant? This cannot be undone.')) return;
  const idx = ADMIN_RESTAURANTS.findIndex(x => x.id === id);
  if (idx !== -1) ADMIN_RESTAURANTS.splice(idx, 1);
  filteredRestaurants = filteredRestaurants.filter(x => x.id !== id);
  renderRestaurantList(filteredRestaurants);
  updateStatTotal();
  renderIntelligence();
};


/* ══════════════════════════════════════════════════════════
   FEATURED LIST
══════════════════════════════════════════════════════════ */
function renderFeaturedList() {
  const container = document.getElementById('featured-list');
  if (!container) return;

  const featured = ADMIN_RESTAURANTS.filter(r => r.featured);
  const others   = ADMIN_RESTAURANTS.filter(r => !r.featured && r.active);

  container.innerHTML = `
    <div class="mb-6">
      <p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Currently Featured (${featured.length}/6)</p>
      <div class="space-y-2">
        ${featured.length
          ? featured.map(r => `
            <div class="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <span class="text-lg">${r.emoji}</span>
              <div class="flex-1"><p class="font-bold text-sm text-brand-black">${r.name}</p><p class="text-xs text-gray-400">${r.location}</p></div>
              <button onclick="toggleFeatured(${r.id})" class="text-xs font-bold text-red-500 bg-white border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
            </div>`).join('')
          : '<p class="text-sm text-gray-400 text-center py-4">No featured restaurants yet.</p>'
        }
      </div>
    </div>
    <div>
      <p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Add to Featured</p>
      <div class="space-y-2">
        ${others.slice(0,6).map(r => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span class="text-lg">${r.emoji}</span>
            <div class="flex-1"><p class="font-bold text-sm text-brand-black">${r.name}</p><p class="text-xs text-gray-400">${r.location}</p></div>
            <button onclick="toggleFeatured(${r.id})" ${featured.length >= 6 ? 'disabled' : ''}
              class="text-xs font-bold text-brand-black bg-brand-yellow border border-yellow-300 px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              + Feature
            </button>
          </div>`).join('')}
      </div>
    </div>
  `;
}


/* ══════════════════════════════════════════════════════════
   TAG SELECTOR
══════════════════════════════════════════════════════════ */
function renderTagSelector() {
  const container = document.getElementById('tag-selector');
  if (!container) return;
  container.innerHTML = ALL_TAGS.map(tag => `
    <button type="button"
      class="tag-toggle ${selectedTags.has(tag) ? 'active' : ''}"
      onclick="toggleTag('${tag}')">${tag}</button>
  `).join('');
}

window.toggleTag = function(tag) {
  if (selectedTags.has(tag)) selectedTags.delete(tag);
  else selectedTags.add(tag);
  const input = document.getElementById('selected-tags');
  if (input) input.value = [...selectedTags].join(',');
  renderTagSelector();
};


/* ══════════════════════════════════════════════════════════
   SLUG AUTO-FILL
══════════════════════════════════════════════════════════ */
function initSlugAutoFill() {
  const nameInput = document.querySelector('[name="name"]');
  const slugInput = document.querySelector('[name="slug"]');
  if (!nameInput || !slugInput) return;

  nameInput.addEventListener('input', () => {
    if (!slugInput.dataset.edited) slugInput.value = toSlug(nameInput.value);
  });
  slugInput.addEventListener('input', () => {
    slugInput.dataset.edited = 'true';
    slugInput.value = toSlug(slugInput.value);
  });
}

function toSlug(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}


/* ══════════════════════════════════════════════════════════
   FORM SUBMIT
══════════════════════════════════════════════════════════ */
window.submitRestaurant = async function(e) {
  e.preventDefault();
  const form    = e.target;
  const data    = Object.fromEntries(new FormData(form));
  const message = document.getElementById('form-message');
  data.tags = [...selectedTags];

  if (window.supabase) {
    const { error } = await window.supabase.from('restaurants').insert([{
      name: data.name, slug: data.slug, description: data.description,
      cuisine_type: data.cuisine_type, location: data.location, address: data.address,
      google_rating: parseFloat(data.google_rating) || null,
      review_count: parseInt(data.review_count) || 0,
      website_url: data.website_url || null, whatsapp_url: data.whatsapp_url || null,
      messenger_url: data.messenger_url || null, instagram_url: data.instagram_url || null,
      facebook_url: data.facebook_url || null, phone: data.phone || null,
      cover_image_url: data.cover_image_url || null, is_featured: !!data.is_featured,
      is_active: !!data.is_active, tagline: data.tagline || null,
    }]);
    if (error) { showMessage(message, 'error', `Error: ${error.message}`); return; }
  } else {
    ADMIN_RESTAURANTS.push({
      id: Date.now(), name: data.name, emoji: getCuisineEmoji(data.cuisine_type),
      cuisine: data.cuisine_type, location: data.location,
      rating: parseFloat(data.google_rating) || 0, views: 0,
      whatsapp: 0, website: 0, featured: !!data.is_featured, active: true,
      slug: data.slug,
    });
  }

  showMessage(message, 'success', `✓ "${data.name}" listed successfully!`);
  form.reset(); selectedTags.clear(); renderTagSelector();
  renderRestaurantList(ADMIN_RESTAURANTS); updateStatTotal(); renderIntelligence();

  // Track the action
  if (window.YAn) YAn.track('restaurant_added', { name: data.name, cuisine: data.cuisine_type });

  setTimeout(() => showTab('restaurants'), 1400);
};

function showMessage(el, type, text) {
  if (!el) return;
  el.className = `rounded-xl p-4 text-sm font-semibold ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`;
  el.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}


/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function updateStatTotal() {
  const el = document.getElementById('stat-total');
  if (el) el.textContent = ADMIN_RESTAURANTS.filter(r => r.active).length;
}

function getCuisineEmoji(c) {
  const m = { Filipino:'🍛', Japanese:'🍜', Korean:'🥘', Italian:'🍕', Chinese:'🥟', Seafood:'🦞', Café:'☕', BBQ:'🔥', Vegan:'🥗', Burgers:'🍔', Mexican:'🌮', Desserts:'🍨' };
  return m[c] || '🍽️';
}
