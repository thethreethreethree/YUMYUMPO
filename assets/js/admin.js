/* ============================================================
   YUMYUMPO — Admin Dashboard JS
   ============================================================ */

'use strict';

/* ── SEED DATA (replace with Supabase queries in production) ── */
const ADMIN_RESTAURANTS = [
  { id:1,  name:"Maria's Kitchen",      cuisine:'Filipino',  location:'El Nido, Palawan',      rating:4.8, views:3847, featured:true,  active:true,  slug:'marias-kitchen' },
  { id:2,  name:'Sunset Grill',         cuisine:'Seafood',   location:'Coron, Palawan',         rating:4.9, views:2901, featured:true,  active:true,  slug:'sunset-grill' },
  { id:3,  name:'Brew & Bite',          cuisine:'Café',      location:'BGC, Taguig',            rating:4.7, views:5214, featured:false, active:true,  slug:'brew-and-bite' },
  { id:4,  name:'Ramen Tori',           cuisine:'Japanese',  location:'Makati, Metro Manila',   rating:4.8, views:4102, featured:true,  active:true,  slug:'ramen-tori' },
  { id:5,  name:'La Mesa Verde',        cuisine:'Vegan',     location:'Poblacion, Makati',      rating:4.6, views:1388, featured:false, active:true,  slug:'la-mesa-verde' },
  { id:6,  name:'The Smokehouse',       cuisine:'BBQ',       location:'Cebu City',              rating:4.7, views:2766, featured:false, active:true,  slug:'the-smokehouse' },
  { id:7,  name:'Izakaya Nori',         cuisine:'Japanese',  location:'Quezon City',            rating:4.9, views:3201, featured:true,  active:true,  slug:'izakaya-nori' },
  { id:8,  name:"Fisherman's Wharf",    cuisine:'Seafood',   location:'Puerto Galera',          rating:4.8, views:1955, featured:false, active:false, slug:'fishermans-wharf' },
];

const ALL_TAGS = [
  'Local Favorite', 'Tourist Favorite', 'Romantic', 'Family-Friendly',
  'Late Night', 'Budget-Friendly', 'Fine Dining', 'Instagrammable',
  'Outdoor Seating', 'Breakfast', 'Lunch', 'Dinner', 'Seafood',
  'Healthy', 'Must Try', 'Date Spot', 'Group-Friendly', 'WiFi-Friendly',
  'Scenic View', 'Hidden Gem', 'Chef Special', 'Beach Dining',
];

let selectedTags = new Set();
let filteredRestaurants = [...ADMIN_RESTAURANTS];


/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  renderTopRestaurants();
  renderRestaurantList(ADMIN_RESTAURANTS);
  renderFeaturedList();
  renderTagSelector();
  updateStatTotal();
  initSlugAutoFill();
});


/* ── TAB SWITCHER ── */
window.showTab = function (tabName) {
  // Hide all tabs
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));

  // Deactivate sidebar links
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));

  // Show target tab
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove('hidden');

  // Activate correct sidebar link
  const links = {
    dashboard:   0,
    restaurants: 1,
    add:         2,
    analytics:   3,
    featured:    4,
  };
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  if (sidebarLinks[links[tabName]]) {
    sidebarLinks[links[tabName]].classList.add('active');
  }
};


/* ── DASHBOARD ── */
function updateStatTotal() {
  const el = document.getElementById('stat-total');
  if (el) el.textContent = ADMIN_RESTAURANTS.filter(r => r.active).length;
}

function renderTopRestaurants() {
  const container = document.getElementById('top-restaurants-list');
  if (!container) return;

  const top = [...ADMIN_RESTAURANTS]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  container.innerHTML = top.map((r, i) => `
    <div class="flex items-center gap-4 py-3 border-b border-stone-pale last:border-0">
      <span class="text-sm font-bold text-stone-mid w-5">${i + 1}</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm text-charcoal truncate">${r.name}</p>
        <p class="text-xs text-stone-mid">${r.cuisine} · ${r.location}</p>
      </div>
      <div class="text-right">
        <p class="text-sm font-bold text-charcoal">${r.views.toLocaleString()}</p>
        <p class="text-xs text-stone-mid">views</p>
      </div>
      <span class="text-yellow-400 text-sm font-bold ml-2">★ ${r.rating}</span>
      ${r.featured ? '<span class="text-xs font-semibold text-warm-orange bg-orange-50 px-2 py-0.5 rounded-full">Featured</span>' : ''}
    </div>
  `).join('');
}


/* ── RESTAURANT LIST ── */
function renderRestaurantList(list) {
  const container = document.getElementById('restaurant-list');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<p class="text-center text-stone-mid py-10">No restaurants found.</p>';
    return;
  }

  container.innerHTML = list.map(r => `
    <div class="restaurant-row">
      <div class="w-10 h-10 rounded-xl bg-warm-beige flex items-center justify-center text-lg shrink-0">
        ${getCuisineEmoji(r.cuisine)}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-semibold text-sm text-charcoal">${r.name}</p>
          ${r.featured ? '<span class="text-xs font-semibold text-warm-orange bg-orange-50 px-2 py-0.5 rounded-full">Featured</span>' : ''}
          ${!r.active  ? '<span class="text-xs font-semibold text-red-400 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>' : ''}
        </div>
        <p class="text-xs text-stone-mid">${r.cuisine} · ${r.location}</p>
      </div>
      <div class="hidden sm:flex items-center gap-4 text-sm text-stone-mid">
        <span>★ ${r.rating}</span>
        <span>${r.views.toLocaleString()} views</span>
      </div>
      <div class="flex gap-2 ml-2">
        <a href="../restaurant.html?slug=${r.slug}" target="_blank"
           class="p-2 rounded-lg hover:bg-stone-pale text-stone-mid hover:text-charcoal transition-colors" title="View">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
        <button onclick="toggleFeatured(${r.id})"
           class="p-2 rounded-lg hover:bg-orange-50 text-stone-mid hover:text-warm-orange transition-colors" title="${r.featured ? 'Unfeature' : 'Feature'}">
          <svg class="w-4 h-4" fill="${r.featured ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
        </button>
        <button onclick="deleteRestaurant(${r.id})"
           class="p-2 rounded-lg hover:bg-red-50 text-stone-mid hover:text-red-400 transition-colors" title="Delete">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

window.filterRestaurants = function () {
  const search  = document.getElementById('restaurant-search')?.value?.toLowerCase() || '';
  const cuisine = document.getElementById('cuisine-filter')?.value || '';

  filteredRestaurants = ADMIN_RESTAURANTS.filter(r => {
    const matchSearch  = !search  || r.name.toLowerCase().includes(search) || r.location.toLowerCase().includes(search);
    const matchCuisine = !cuisine || r.cuisine === cuisine;
    return matchSearch && matchCuisine;
  });

  renderRestaurantList(filteredRestaurants);
};

window.toggleFeatured = function (id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (!r) return;
  r.featured = !r.featured;
  renderRestaurantList(filteredRestaurants);
  renderTopRestaurants();
  renderFeaturedList();
  // In production: update Supabase row
};

window.deleteRestaurant = function (id) {
  if (!confirm('Are you sure you want to delete this restaurant?')) return;
  const idx = ADMIN_RESTAURANTS.findIndex(x => x.id === id);
  if (idx !== -1) ADMIN_RESTAURANTS.splice(idx, 1);
  filteredRestaurants = filteredRestaurants.filter(x => x.id !== id);
  renderRestaurantList(filteredRestaurants);
  updateStatTotal();
  // In production: delete from Supabase
};


/* ── FEATURED LIST ── */
function renderFeaturedList() {
  const container = document.getElementById('featured-list');
  if (!container) return;

  const featured = ADMIN_RESTAURANTS.filter(r => r.featured);
  const inactive = ADMIN_RESTAURANTS.filter(r => !r.featured);

  container.innerHTML = `
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-charcoal mb-3">Currently Featured (${featured.length}/6)</h3>
      <div class="space-y-2">
        ${featured.map(r => `
          <div class="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
            <span class="text-lg">${getCuisineEmoji(r.cuisine)}</span>
            <div class="flex-1">
              <p class="font-semibold text-sm text-charcoal">${r.name}</p>
              <p class="text-xs text-stone-mid">${r.location}</p>
            </div>
            <button onclick="toggleFeatured(${r.id})" class="text-xs font-semibold text-red-400 hover:text-red-600 bg-white border border-red-100 px-3 py-1.5 rounded-lg transition-colors">
              Remove
            </button>
          </div>
        `).join('')}
        ${featured.length === 0 ? '<p class="text-sm text-stone-mid text-center py-4">No featured restaurants yet.</p>' : ''}
      </div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-charcoal mb-3">Add to Featured</h3>
      <div class="space-y-2">
        ${inactive.slice(0,5).map(r => `
          <div class="flex items-center gap-3 p-3 bg-stone-pale rounded-xl">
            <span class="text-lg">${getCuisineEmoji(r.cuisine)}</span>
            <div class="flex-1">
              <p class="font-semibold text-sm text-charcoal">${r.name}</p>
              <p class="text-xs text-stone-mid">${r.location}</p>
            </div>
            <button onclick="toggleFeatured(${r.id})" class="text-xs font-semibold text-warm-orange hover:text-warm-amber bg-white border border-orange-100 px-3 py-1.5 rounded-lg transition-colors" ${featured.length >= 6 ? 'disabled' : ''}>
              + Feature
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}


/* ── TAG SELECTOR ── */
function renderTagSelector() {
  const container = document.getElementById('tag-selector');
  if (!container) return;

  container.innerHTML = ALL_TAGS.map(tag => `
    <button type="button"
      class="tag-toggle text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${selectedTags.has(tag) ? 'bg-warm-orange text-white border-warm-orange' : 'bg-white text-stone-mid border-stone-light hover:border-warm-orange hover:text-warm-orange'}"
      onclick="toggleTag('${tag}')">${tag}</button>
  `).join('');
}

window.toggleTag = function (tag) {
  if (selectedTags.has(tag)) selectedTags.delete(tag);
  else selectedTags.add(tag);

  const input = document.getElementById('selected-tags');
  if (input) input.value = [...selectedTags].join(',');

  renderTagSelector();
};


/* ── SLUG AUTO-FILL ── */
function initSlugAutoFill() {
  const nameInput = document.querySelector('[name="name"]');
  const slugInput = document.querySelector('[name="slug"]');
  if (!nameInput || !slugInput) return;

  nameInput.addEventListener('input', () => {
    if (!slugInput.dataset.edited) {
      slugInput.value = toSlug(nameInput.value);
    }
  });

  slugInput.addEventListener('input', () => {
    slugInput.dataset.edited = 'true';
    slugInput.value = toSlug(slugInput.value);
  });
}

function toSlug(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


/* ── FORM SUBMIT ── */
window.submitRestaurant = async function (e) {
  e.preventDefault();

  const form    = e.target;
  const data    = Object.fromEntries(new FormData(form));
  const message = document.getElementById('form-message');

  // Add selected tags
  data.tags = [...selectedTags];

  if (window.supabase) {
    const { error } = await window.supabase.from('restaurants').insert([{
      name:            data.name,
      slug:            data.slug,
      description:     data.description,
      cuisine_type:    data.cuisine_type,
      location:        data.location,
      address:         data.address,
      google_rating:   parseFloat(data.google_rating) || null,
      review_count:    parseInt(data.review_count) || 0,
      website_url:     data.website_url || null,
      whatsapp_url:    data.whatsapp_url || null,
      messenger_url:   data.messenger_url || null,
      instagram_url:   data.instagram_url || null,
      facebook_url:    data.facebook_url || null,
      phone:           data.phone || null,
      cover_image_url: data.cover_image_url || null,
      logo_image_url:  data.logo_image_url || null,
      is_featured:     !!data.is_featured,
      is_active:       !!data.is_active,
      tagline:         data.tagline || null,
    }]);

    if (error) {
      showMessage(message, 'error', `Error: ${error.message}`);
      return;
    }
  } else {
    // Offline / dev mode: add to local array
    ADMIN_RESTAURANTS.push({
      id:       Date.now(),
      name:     data.name,
      cuisine:  data.cuisine_type,
      location: data.location,
      rating:   parseFloat(data.google_rating) || 0,
      views:    0,
      featured: !!data.is_featured,
      active:   true,
      slug:     data.slug,
    });
  }

  showMessage(message, 'success', `✓ "${data.name}" has been added successfully!`);
  form.reset();
  selectedTags.clear();
  renderTagSelector();
  renderRestaurantList(ADMIN_RESTAURANTS);
  updateStatTotal();

  setTimeout(() => showTab('restaurants'), 1500);
};

function showMessage(el, type, text) {
  if (!el) return;
  el.className = `rounded-xl p-4 text-sm font-medium ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`;
  el.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}


/* ── HELPERS ── */
function getCuisineEmoji(cuisine) {
  const map = {
    Filipino: '🍛', Japanese: '🍜', Korean: '🥘', Italian: '🍕',
    Chinese: '🥟', Seafood: '🦞', Café: '☕', BBQ: '🔥',
    Vegan: '🥗', Burgers: '🍔', Mexican: '🌮', Desserts: '🍨',
  };
  return map[cuisine] || '🍽️';
}
