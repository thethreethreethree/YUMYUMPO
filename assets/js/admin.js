/* ============================================================
   YUMYUMPO — Admin Dashboard  v3.0
   Auth guard · Edit modal · Image upload · Cuisine mgmt · AI tags
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   RESTAURANT DATASET
══════════════════════════════════════════════════════════ */
/* Static seed — replaced on load with real Supabase data. */
let ADMIN_RESTAURANTS = [
  { id:1,  name:"Maria's Kitchen",       emoji:'🍛', cuisine:'Filipino',  location:'El Nido, Palawan',     rating:4.8, views:3847, whatsapp:312, website:88,  featured:true,  active:true,  slug:'marias-kitchen',       whatsapp_url:'https://wa.me/639123456789', website_url:null,        instagram_url:'https://instagram.com',    facebook_url:'https://facebook.com',    phone:'+63 912 345 6789',  cover:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80', description:"Maria's Kitchen has been serving the El Nido community for over 15 years.", address:'123 Corong-Corong Road, El Nido, Palawan 5313', tags:['Local Favorite','Budget-Friendly','Family-Friendly'] },
  { id:2,  name:'Sunset Grill',          emoji:'🌅', cuisine:'Seafood',   location:'Coron, Palawan',       rating:4.9, views:2901, whatsapp:278, website:124, featured:true,  active:true,  slug:'sunset-grill',         whatsapp_url:'https://wa.me/639987654321', website_url:'https://example.com', instagram_url:'https://instagram.com', facebook_url:'https://facebook.com', phone:'+63 998 765 4321', cover:'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80', description:"Perched above the water with jaw-dropping sunsets.", address:'Waterfront Blvd, Coron, Palawan', tags:['Romantic','Scenic View','Beach Dining'] },
  { id:3,  name:'Brew & Bite',           emoji:'☕', cuisine:'Café',      location:'BGC, Taguig',          rating:4.7, views:5214, whatsapp:94,  website:441, featured:false, active:true,  slug:'brew-and-bite',        whatsapp_url:null,                         website_url:'https://example.com', instagram_url:'https://instagram.com', facebook_url:'https://facebook.com', phone:'+63 917 123 4567', cover:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80', description:'Specialty coffee and incredible brunch plates.', address:'5th Avenue, BGC, Taguig', tags:['WiFi-Friendly','Instagrammable','Backpacker-Approved'] },
  { id:4,  name:'Ramen Tori',            emoji:'🍜', cuisine:'Japanese',  location:'Makati, Metro Manila', rating:4.8, views:4102, whatsapp:201, website:312, featured:true,  active:true,  slug:'ramen-tori',           whatsapp_url:null,                         website_url:'https://example.com', instagram_url:'https://instagram.com', facebook_url:'https://facebook.com', phone:'+63 905 678 9012', cover:'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80', description:'Rich, deep broths simmered 18 hours.', address:'Salcedo Village, Makati', tags:['Late Night','Date Spot','Must Try'] },
  { id:5,  name:'La Mesa Verde',         emoji:'🥗', cuisine:'Vegan',     location:'Poblacion, Makati',    rating:4.6, views:1388, whatsapp:62,  website:108, featured:false, active:true,  slug:'la-mesa-verde',        whatsapp_url:'https://wa.me/639111222333', website_url:null,        instagram_url:'https://instagram.com',    facebook_url:null,                      phone:'+63 912 111 2233', cover:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80', description:'Creative plant-based cuisine.', address:'Poblacion, Makati City', tags:['Vegan','Healthy','Instagrammable'] },
  { id:6,  name:'The Smokehouse',        emoji:'🔥', cuisine:'BBQ',       location:'Cebu City',            rating:4.7, views:2766, whatsapp:210, website:188, featured:false, active:true,  slug:'the-smokehouse',       whatsapp_url:'https://wa.me/639222333444', website_url:'https://example.com', instagram_url:null,                       facebook_url:'https://facebook.com',    phone:'+63 933 456 7890', cover:'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80', description:'Low and slow BBQ.', address:'Cebu City', tags:['Group-Friendly','Budget-Friendly'] },
  { id:7,  name:'Izakaya Nori',          emoji:'🍶', cuisine:'Japanese',  location:'Quezon City',          rating:4.9, views:3201, whatsapp:185, website:0,   featured:true,  active:true,  slug:'izakaya-nori',         whatsapp_url:'https://wa.me/639505678901', website_url:null,        instagram_url:'https://instagram.com',    facebook_url:'https://facebook.com',    phone:'+63 950 567 8901', cover:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80', description:'Vibey izakaya energy until 2am.', address:'Tomas Morato Ave, QC', tags:['Late Night','Backpacker-Approved','Hidden Gem'] },
  { id:8,  name:"Fisherman's Wharf",     emoji:'⚓', cuisine:'Seafood',   location:'Puerto Galera',        rating:4.8, views:1955, whatsapp:144, website:67,  featured:false, active:false, slug:'fishermans-wharf',     whatsapp_url:'https://wa.me/639333444555', website_url:null,        instagram_url:null,                       facebook_url:null,                      phone:'+63 918 333 4455', cover:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80', description:'Bonfires on the beach, barbecued squid.', address:'Puerto Galera, Oriental Mindoro', tags:['Beach Dining','Late Night','Romantic'] },
  { id:9,  name:'K-Grill House',         emoji:'🥩', cuisine:'Korean',    location:'Malate, Manila',       rating:4.5, views:1890, whatsapp:98,  website:0,   featured:false, active:true,  slug:'korean-bbq-house',     whatsapp_url:'https://wa.me/639444555666', website_url:null,        instagram_url:'https://instagram.com',    facebook_url:'https://facebook.com',    phone:'+63 915 555 6677', cover:'https://images.unsplash.com/photo-1583032015879-e5022cb87c3b?w=800&auto=format&fit=crop&q=80', description:'All-you-can-eat Korean BBQ.', address:'Malate, Manila', tags:['Group-Friendly','Budget-Friendly','Late Night'] },
  { id:10, name:'Siargao Surf Kitchen',  emoji:'🌊', cuisine:'Café',      location:'General Luna, Siargao',rating:4.8, views:743,  whatsapp:127, website:88,  featured:false, active:true,  slug:'siargao-surf-kitchen', whatsapp_url:'https://wa.me/639612345678', website_url:'https://example.com', instagram_url:'https://instagram.com', facebook_url:null, phone:'+63 961 234 5678', cover:'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&auto=format&fit=crop&q=80', description:'Fuel for surfers. Vibes for everyone.', address:'Cloud 9 Road, General Luna, Siargao', tags:['Beach Dining','Healthy','WiFi-Friendly'] },
];

/* ══════════════════════════════════════════════════════════
   CUISINE CATEGORIES DATASET
══════════════════════════════════════════════════════════ */
let ADMIN_CUISINES = [
  { id:1,  emoji:'🇵🇭', name:'Filipino',  order:1,  active:true },
  { id:2,  emoji:'🍜',  name:'Japanese',  order:2,  active:true },
  { id:3,  emoji:'🦞',  name:'Seafood',   order:3,  active:true },
  { id:4,  emoji:'☕',  name:'Café',      order:4,  active:true },
  { id:5,  emoji:'🍕',  name:'Italian',   order:5,  active:true },
  { id:6,  emoji:'🥘',  name:'Korean',    order:6,  active:true },
  { id:7,  emoji:'🔥',  name:'BBQ',       order:7,  active:true },
  { id:8,  emoji:'🥗',  name:'Vegan',     order:8,  active:true },
  { id:9,  emoji:'🥟',  name:'Chinese',   order:9,  active:true },
  { id:10, emoji:'🍔',  name:'Burgers',   order:10, active:true },
  { id:11, emoji:'🌮',  name:'Mexican',   order:11, active:true },
  { id:12, emoji:'🍨',  name:'Desserts',  order:12, active:true },
];

/* ══════════════════════════════════════════════════════════
   AI TAGS DATASET
══════════════════════════════════════════════════════════ */
let ADMIN_TAGS = [
  { id:1,  name:'Local Favorite',      category:'vibe',     searches:412, restaurants:8  },
  { id:2,  name:'Tourist Favorite',    category:'vibe',     searches:388, restaurants:6  },
  { id:3,  name:'Romantic',            category:'vibe',     searches:301, restaurants:5  },
  { id:4,  name:'Family-Friendly',     category:'vibe',     searches:287, restaurants:7  },
  { id:5,  name:'Late Night',          category:'vibe',     searches:264, restaurants:6  },
  { id:6,  name:'Budget-Friendly',     category:'vibe',     searches:498, restaurants:9  },
  { id:7,  name:'Fine Dining',         category:'vibe',     searches:189, restaurants:2  },
  { id:8,  name:'Instagrammable',      category:'vibe',     searches:445, restaurants:7  },
  { id:9,  name:'Hidden Gem',          category:'vibe',     searches:367, restaurants:5  },
  { id:10, name:'Backpacker-Approved', category:'vibe',     searches:521, restaurants:8  },
  { id:11, name:'Date Spot',           category:'vibe',     searches:312, restaurants:4  },
  { id:12, name:'Group-Friendly',      category:'vibe',     searches:234, restaurants:5  },
  { id:13, name:'Breakfast',           category:'meal',     searches:198, restaurants:4  },
  { id:14, name:'Lunch',               category:'meal',     searches:156, restaurants:6  },
  { id:15, name:'Dinner',              category:'meal',     searches:203, restaurants:7  },
  { id:16, name:'Brunch',              category:'meal',     searches:178, restaurants:3  },
  { id:17, name:'WiFi-Friendly',       category:'feature',  searches:289, restaurants:5  },
  { id:18, name:'Outdoor Seating',     category:'feature',  searches:167, restaurants:4  },
  { id:19, name:'Scenic View',         category:'feature',  searches:334, restaurants:6  },
  { id:20, name:'Beach Dining',        category:'feature',  searches:411, restaurants:5  },
  { id:21, name:'Must Try',            category:'feature',  searches:289, restaurants:5  },
  { id:22, name:'Chef Special',        category:'feature',  searches:145, restaurants:3  },
  { id:23, name:'Healthy',             category:'diet',     searches:223, restaurants:4  },
  { id:24, name:'Vegan',               category:'diet',     searches:198, restaurants:3  },
  { id:25, name:'Gluten-Free',         category:'diet',     searches:112, restaurants:2  },
  { id:26, name:'Seafood',             category:'diet',     searches:345, restaurants:6  },
];

const ALL_TAGS = ADMIN_TAGS.map(t => t.name);

let selectedTags       = new Set();
let filteredRestaurants = [...ADMIN_RESTAURANTS];
let editingTag         = null;


/* ══════════════════════════════════════════════════════════
   INIT + AUTH GUARD
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initDashboard();
  initDragAndDrop('add');
  initDragAndDrop('edit');
  initSlugAutoFill();
});

function checkAuth() {
  /* Production auth: require a real Supabase session — no exceptions. */
  const mode = window.YYP?.mode || 'production';

  const enforce = () => {
    const client = window.YYP?.client;

    /* Without a configured Supabase client, the admin area cannot be authenticated. */
    if (!client) {
      if (mode === 'production') {
        window.location.href = 'login.html';
      } else {
        const greeting = document.getElementById('admin-greeting');
        if (greeting) greeting.textContent = 'Development mode — Supabase not configured.';
      }
      return;
    }

    client.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        window.location.href = 'login.html';
        return;
      }
      const greeting = document.getElementById('admin-greeting');
      if (greeting && session.user?.email) {
        greeting.textContent = `Signed in as ${session.user.email}`;
      }
      /* Auto-logout on session expiry */
      client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') window.location.href = 'login.html';
      });
    });
  };

  if (window.YYP?.ready) enforce();
  else document.addEventListener('yyp:ready', enforce, { once: true });
}

function initDashboard() {
  /* Render with seed data immediately so the UI feels instant.
     Once Supabase is ready, swap in real data. */
  renderTopRestaurants();
  renderIntelligence();
  renderRestaurantList(ADMIN_RESTAURANTS);
  renderFeaturedList();
  renderCuisinesTab();
  renderTagsTab();
  renderTagSelector();
  updateStatTotal();

  if (window.YYP?.ready) loadAdminFromSupabase();
  else document.addEventListener('yyp:ready', loadAdminFromSupabase, { once: true });
}

async function loadAdminFromSupabase() {
  if (!window.db?.getHomepagePicks) return;
  try {
    const data = await window.db.getHomepagePicks({ limit: 500, order: 'created' });
    if (!data?.length) return;

    /* Map Supabase rows → the shape the admin templates expect.
       Real UUID `id` is preserved as a string. */
    ADMIN_RESTAURANTS = data.map(r => ({
      id:                r.id,                  // UUID string
      slug:              r.slug,
      name:              r.name,
      cuisine:           r.cuisine,
      location:          r.location,
      address:           r.address || '',
      description:       r.description || '',
      tagline:           r.tagline || '',
      rating:            r.rating,
      review_count:      r.reviews,
      cover:             r.cover,
      emoji:             getCuisineEmoji(r.cuisine),
      featured:          r.is_featured,
      active:            true,    /* getHomepagePicks already filters by is_active */
      website_url:       r.website_url,
      has_yumyumpo_site: r.has_yumyumpo_site,
      tags:              r.tags || [],
      /* Analytics fields — will populate as real traffic flows */
      views:             0,
      whatsapp:          0,
      website:           0,
    }));

    filteredRestaurants = [...ADMIN_RESTAURANTS];
    renderTopRestaurants();
    renderIntelligence();
    renderRestaurantList(ADMIN_RESTAURANTS);
    renderFeaturedList();
    updateStatTotal();
  } catch (err) {
    console.warn('[Admin] Supabase load failed, using static seed:', err);
  }
}

window.handleLogout = async function() {
  const client = window.YYP?.client;
  if (client) await client.auth.signOut();
  window.location.href = 'login.html';
};


/* ══════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════ */
window.showTab = function(tabName) {
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.sidebar-link[data-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabName);
  });
};


/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
function updateStatTotal() {
  const el = document.getElementById('stat-total');
  if (el) el.textContent = ADMIN_RESTAURANTS.filter(r => r.active).length;
  const rc = document.getElementById('restaurant-count');
  if (rc) rc.textContent = ADMIN_RESTAURANTS.length;
}

function renderTopRestaurants() {
  const container = document.getElementById('top-restaurants-list');
  if (!container) return;

  const top = [...ADMIN_RESTAURANTS].filter(r => r.active)
    .sort((a, b) => b.views - a.views).slice(0, 5);

  container.innerHTML = top.map((r, i) => {
    const ctr = r.views > 0 ? (((r.whatsapp + r.website) / r.views) * 100).toFixed(1) : '0';
    const perf = parseFloat(ctr) >= 20 ? 'perf-hot' : parseFloat(ctr) >= 10 ? 'perf-stable' : 'perf-low';
    return `
      <div class="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
        <span class="font-black text-gray-400 text-sm w-5 shrink-0">${i+1}</span>
        <span class="text-xl">${r.emoji}</span>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm text-brand-black truncate">${r.name}</p>
          <p class="text-xs text-gray-400">${r.cuisine} · ${r.location}</p>
        </div>
        <div class="hidden sm:flex items-center gap-3 text-sm">
          <span class="font-black text-brand-black">${r.views.toLocaleString()}<span class="text-xs text-gray-400 font-normal ml-0.5">views</span></span>
          <span class="text-xs text-green-600 font-bold">${ctr}% CTR</span>
        </div>
        <span class="perf-badge ${perf}">${parseFloat(ctr) >= 20 ? '↑ Hot' : parseFloat(ctr) >= 10 ? '→ OK' : '↓ Low'}</span>
      </div>`;
  }).join('');
}

function renderIntelligence() {
  const container = document.getElementById('intelligence-list');
  if (!container) return;

  const active = ADMIN_RESTAURANTS.filter(r => r.active);
  const insights = [];

  const top = [...active].sort((a,b) => b.views - a.views)[0];
  if (top) insights.push({ icon:'🏆', type:'Opportunity', bg:'bg-yellow-50', border:'border-yellow-200', badge:'perf-stable', title:`${top.name} is your #1 performer`, message:`${top.views.toLocaleString()} views this week. Consider featuring it on the homepage.`, action:'featured' });

  const lowCTR = active.filter(r => (((r.whatsapp+r.website)/r.views)*100) < 5 && r.views > 500);
  if (lowCTR.length) insights.push({ icon:'⚠️', type:'Alert', bg:'bg-red-50', border:'border-red-200', badge:'perf-low', title:`${lowCTR.length} restaurant${lowCTR.length>1?'s':''} with very low CTR`, message:`${lowCTR.map(r=>r.name).slice(0,2).join(', ')} have high views but few clicks. Check their contact links.`, action:'restaurants' });

  const inactive = ADMIN_RESTAURANTS.filter(r => !r.active);
  if (inactive.length) insights.push({ icon:'💤', type:'Action', bg:'bg-gray-50', border:'border-gray-200', badge:'perf-stable', title:`${inactive.length} restaurant${inactive.length>1?'s':''} inactive`, message:`${inactive.map(r=>r.name).join(', ')} ${inactive.length>1?'are':'is'} hidden from users. Reactivate to restore visibility.`, action:'restaurants' });

  const topWA = [...active].sort((a,b) => b.whatsapp - a.whatsapp)[0];
  if (topWA?.whatsapp > 150) insights.push({ icon:'💬', type:'Insight', bg:'bg-green-50', border:'border-green-200', badge:'perf-hot', title:`${topWA.name} leads in WhatsApp conversions`, message:`${topWA.whatsapp} WhatsApp clicks this week — highest on the platform.`, action:null });

  container.innerHTML = insights.slice(0,4).map(ins => `
    <div class="intel-card ${ins.bg} ${ins.border}">
      <span class="text-xl shrink-0 mt-0.5">${ins.icon}</span>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-0.5 flex-wrap">
          <p class="font-bold text-sm text-brand-black">${ins.title}</p>
          <span class="perf-badge ${ins.badge}">${ins.type}</span>
        </div>
        <p class="text-xs text-gray-600">${ins.message}</p>
      </div>
      ${ins.action ? `<button onclick="showTab('${ins.action}')" class="shrink-0 text-xs font-bold text-brand-black bg-brand-yellow px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors">Act Now</button>` : ''}
    </div>`).join('');
}


/* ══════════════════════════════════════════════════════════
   RESTAURANT LIST
══════════════════════════════════════════════════════════ */
function renderRestaurantList(list) {
  const container = document.getElementById('restaurant-list');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<p class="text-center text-gray-400 py-12 text-sm">No restaurants match your search.</p>';
    return;
  }

  container.innerHTML = list.map(r => {
    const views       = r.views || 0;
    const websiteHits = r.website || 0;
    const ctr         = views > 0 ? ((websiteHits / views) * 100).toFixed(1) + '%' : '—';
    const viewsLabel  = views > 0 ? views.toLocaleString() : '—';
    const clicksLabel = websiteHits > 0 ? websiteHits.toLocaleString() : '—';
    const ytype       = r.has_yumyumpo_site ? 'On YUMYUMPO' : (r.website_url ? 'Has site' : 'No site');
    return `
      <div class="restaurant-row">
        <div class="w-10 h-10 rounded-xl bg-yellow-light flex items-center justify-center text-lg shrink-0">${r.emoji}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-bold text-sm text-brand-black">${r.name}</p>
            ${r.featured ? '<span class="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Featured</span>' : ''}
            ${!r.active ? '<span class="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Inactive</span>' : ''}
            <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">${ytype}</span>
          </div>
          <p class="text-xs text-gray-400">${r.cuisine} · ${r.location}</p>
        </div>
        <div class="hidden sm:flex items-center gap-5 text-xs text-gray-400">
          <div class="text-center"><p class="font-black text-brand-black text-sm">${viewsLabel}</p><p>views</p></div>
          <div class="text-center"><p class="font-black text-blue-500 text-sm">${clicksLabel}</p><p>website clicks</p></div>
          <div class="text-center"><p class="font-black text-green-600 text-sm">${ctr}</p><p>CTR</p></div>
          <span class="text-yellow-400">★ ${r.rating || '—'}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="openEditModal('${r.id}')" class="p-2 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="Quick edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <a href="../account/restaurant.html?slug=${r.slug}" target="_blank" class="p-2 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="Full edit (hours, menu, gallery)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </a>
          <a href="../restaurant.html?slug=${r.slug}" target="_blank" class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-black transition-colors" title="View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
          <button onclick="toggleFeatured('${r.id}')" class="p-2 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="${r.featured?'Remove feature':'Feature'}">
            <svg class="w-4 h-4" fill="${r.featured?'currentColor':'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
          </button>
          <button onclick="toggleActive('${r.id}')" class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-black transition-colors" title="${r.active?'Deactivate':'Activate'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${r.active?'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z':'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}"/></svg>
          </button>
          <button onclick="deleteRestaurant('${r.id}')" class="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

window.filterRestaurants = function() {
  const search  = document.getElementById('restaurant-search')?.value?.toLowerCase() || '';
  const cuisine = document.getElementById('cuisine-filter')?.value || '';
  const status  = document.getElementById('status-filter')?.value || '';

  filteredRestaurants = ADMIN_RESTAURANTS.filter(r => {
    const ms = !search  || r.name.toLowerCase().includes(search) || r.location.toLowerCase().includes(search);
    const mc = !cuisine || r.cuisine === cuisine;
    const mv = !status
      || (status === 'featured' && r.featured)
      || (status === 'active'   && r.active && !r.featured)
      || (status === 'inactive' && !r.active);
    return ms && mc && mv;
  });
  renderRestaurantList(filteredRestaurants);
};

window.toggleFeatured = async function(id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (!r) return;
  const newVal = !r.featured;

  const client = window.YYP?.client;
  if (client) {
    const { error } = await client.from('restaurants').update({ is_featured: newVal }).eq('id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
  }
  r.featured = newVal;
  renderRestaurantList(filteredRestaurants);
  renderFeaturedList();
  renderTopRestaurants();
};

window.toggleActive = async function(id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (!r) return;
  const newVal = !r.active;

  const client = window.YYP?.client;
  if (client) {
    const { error } = await client.from('restaurants').update({ is_active: newVal }).eq('id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
  }
  r.active = newVal;
  renderRestaurantList(filteredRestaurants);
  updateStatTotal();
  renderIntelligence();
};

window.deleteRestaurant = async function(id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (!r) return;
  if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;

  const client = window.YYP?.client;
  if (client) {
    const { error } = await client.from('restaurants').delete().eq('id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
  }
  const idx = ADMIN_RESTAURANTS.findIndex(x => x.id === id);
  if (idx !== -1) ADMIN_RESTAURANTS.splice(idx, 1);
  filteredRestaurants = filteredRestaurants.filter(x => x.id !== id);
  renderRestaurantList(filteredRestaurants);
  updateStatTotal();
  renderIntelligence();
  renderFeaturedList();
  renderTopRestaurants();
};


/* ══════════════════════════════════════════════════════════
   EDIT RESTAURANT MODAL
══════════════════════════════════════════════════════════ */
window.openEditModal = function(id) {
  const r = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (!r) return;

  /* Field setters are null-safe — modal HTML may evolve over time. */
  const setVal     = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  const setChecked = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };

  setVal('edit-restaurant-id', id);
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) modalTitle.textContent = `Edit — ${r.name}`;

  setVal('edit-name',         r.name);
  setVal('edit-slug',         r.slug);
  setVal('edit-tagline',      r.tagline);
  setVal('edit-description',  r.description);
  setVal('edit-cuisine',      r.cuisine);
  setVal('edit-location',     r.location);
  setVal('edit-address',      r.address);
  setVal('edit-rating',       r.rating);
  setVal('edit-reviews',      r.review_count);
  setVal('edit-cover',        r.cover);
  setVal('edit-website',      r.website_url);
  setChecked('edit-has-yumyumpo-site', r.has_yumyumpo_site);
  setChecked('edit-featured', r.featured);
  setChecked('edit-active',   r.active);

  // Reset image preview (null-safe)
  const previewGrid = document.getElementById('edit-preview-grid');
  if (previewGrid) {
    previewGrid.innerHTML = '';
    if (r.cover) addImagePreview('edit', r.cover, null);
  }

  document.getElementById('edit-message')?.classList.add('hidden');
  document.getElementById('edit-modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeEditModal = function(event) {
  if (event.target === document.getElementById('edit-modal')) closeEditModalDirect();
};

window.closeEditModalDirect = function() {
  document.getElementById('edit-modal').classList.remove('open');
  document.body.style.overflow = '';
};

window.saveEdit = function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-restaurant-id')?.value;   // UUID string
  const r  = ADMIN_RESTAURANTS.find(x => x.id === id);
  if (!r) return;

  const getVal = id => document.getElementById(id)?.value ?? '';
  const isChecked = id => !!document.getElementById(id)?.checked;

  r.name              = getVal('edit-name');
  r.slug              = getVal('edit-slug');
  r.tagline           = getVal('edit-tagline');
  r.description       = getVal('edit-description');
  r.cuisine           = getVal('edit-cuisine');
  r.location          = getVal('edit-location');
  r.address           = getVal('edit-address');
  r.rating            = parseFloat(getVal('edit-rating')) || r.rating;
  r.review_count      = parseInt(getVal('edit-reviews')) || 0;
  r.cover             = getVal('edit-cover') || r.cover;
  r.website_url       = getVal('edit-website') || null;
  r.has_yumyumpo_site = isChecked('edit-has-yumyumpo-site');
  r.featured          = isChecked('edit-featured');
  r.active            = isChecked('edit-active');
  r.emoji             = getCuisineEmoji(r.cuisine);

  // Supabase update
  if (window.YYP?.client) {
    window.YYP.client.from('restaurants').update({
      name: r.name, slug: r.slug, description: r.description,
      cuisine_type: r.cuisine, location: r.location,
      google_rating: r.rating, cover_image_url: r.cover,
      website_url: r.website_url, has_yumyumpo_site: r.has_yumyumpo_site,
      is_featured: r.featured, is_active: r.active,
    }).eq('id', id).then(({ error }) => {
      if (error) console.warn('[Admin] Edit save error:', error.message);
    });
  }

  const msg = document.getElementById('edit-message');
  if (msg) {
    msg.className = 'rounded-xl p-3 text-sm font-semibold bg-green-50 text-green-700 border border-green-200';
    msg.textContent = `✓ ${r.name} updated successfully.`;
    msg.classList.remove('hidden');
  }

  renderRestaurantList(filteredRestaurants);
  renderTopRestaurants();
  renderFeaturedList();
  renderIntelligence();

  setTimeout(closeEditModalDirect, 1200);
};


/* ══════════════════════════════════════════════════════════
   IMAGE UPLOAD
══════════════════════════════════════════════════════════ */
function initDragAndDrop(prefix) {
  const zone = document.getElementById(`${prefix}-drop-zone`);
  if (!zone) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (files.length) processImageFiles(files, prefix);
  });
}

window.handleFileSelect = function(event, prefix) {
  const files = [...event.target.files];
  if (files.length) processImageFiles(files, prefix);
  event.target.value = '';
};

async function processImageFiles(files, prefix) {
  const progress    = document.getElementById(`${prefix}-upload-progress`);
  const progressBar = document.getElementById(`${prefix}-progress-bar`);
  if (progress) progress.classList.remove('hidden');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > 5 * 1024 * 1024) { alert(`${file.name} is too large (max 5MB).`); continue; }

    const pct = Math.round(((i + 0.5) / files.length) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;

    // Show local preview immediately
    const localURL = URL.createObjectURL(file);
    const itemEl   = addImagePreview(prefix, localURL, file.name);

    // Upload to Supabase Storage if available
    if (window.YYP?.client) {
      const fileName = `restaurants/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
      const { data, error } = await window.YYP.client.storage
        .from('restaurant-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (!error && data) {
        const { data: { publicUrl } } = window.YYP.client.storage
          .from('restaurant-images').getPublicUrl(data.path);

        // Update the cover URL input with the first uploaded image
        const coverInput = document.getElementById(`${prefix}-cover`) || document.getElementById(`${prefix}-cover-url`);
        if (coverInput && !coverInput.value) coverInput.value = publicUrl;

        // Update the preview item's stored URL
        if (itemEl) itemEl.dataset.url = publicUrl;
        URL.revokeObjectURL(localURL);
      }
    }
  }

  if (progressBar) progressBar.style.width = '100%';
  setTimeout(() => { if (progress) progress.classList.add('hidden'); if (progressBar) progressBar.style.width = '0%'; }, 800);
}

function addImagePreview(prefix, url, fileName) {
  const grid = document.getElementById(`${prefix}-preview-grid`);
  if (!grid) return null;

  const item = document.createElement('div');
  item.className    = 'image-preview-item';
  item.dataset.url  = url;
  item.innerHTML = `
    <img src="${url}" alt="${fileName || 'Preview'}" />
    <button class="image-preview-remove" onclick="removeImagePreview(this)" title="Remove">✕</button>
  `;
  grid.appendChild(item);
  return item;
}

window.removeImagePreview = function(btn) {
  btn.closest('.image-preview-item')?.remove();
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
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-black text-gray-400 uppercase tracking-widest">Currently Featured (${featured.length}/6)</p>
        ${featured.length >= 6 ? '<span class="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Maximum reached</span>' : ''}
      </div>
      <div class="space-y-2">
        ${featured.length
          ? featured.map(r => `
              <div class="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <span class="text-lg">${r.emoji}</span>
                <div class="flex-1">
                  <p class="font-bold text-sm text-brand-black">${r.name}</p>
                  <p class="text-xs text-gray-400">${r.cuisine} · ${r.location} · ${r.views.toLocaleString()} views</p>
                </div>
                <button onclick="toggleFeatured('${r.id}')" class="text-xs font-bold text-red-500 bg-white border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
              </div>`).join('')
          : '<p class="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">No featured restaurants yet. Add one from the list below.</p>'
        }
      </div>
    </div>
    <div>
      <p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Available to Feature</p>
      <div class="space-y-2">
        ${others.slice(0, 8).map(r => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span class="text-lg">${r.emoji}</span>
            <div class="flex-1">
              <p class="font-bold text-sm text-brand-black">${r.name}</p>
              <p class="text-xs text-gray-400">${r.cuisine} · ${r.views.toLocaleString()} views</p>
            </div>
            <button onclick="toggleFeatured('${r.id}')" ${featured.length >= 6 ? 'disabled' : ''}
              class="text-xs font-bold text-brand-black bg-brand-yellow border border-yellow-300 px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              + Feature
            </button>
          </div>`).join('')}
      </div>
    </div>`;
}


/* ══════════════════════════════════════════════════════════
   CUISINE CATEGORY MANAGEMENT
══════════════════════════════════════════════════════════ */
function renderCuisinesTab() {
  const grid = document.getElementById('cuisine-grid');
  if (!grid) return;

  grid.innerHTML = ADMIN_CUISINES.map(c => `
    <div class="cuisine-card ${c.active ? '' : 'inactive'}" id="cuisine-${c.id}">
      <span class="cuisine-emoji-btn">${c.emoji}</span>
      <p class="font-bold text-sm text-brand-black">${c.name}</p>
      <p class="text-xs text-gray-400">Order: ${c.order}</p>
      <p class="text-xs text-gray-400">${ADMIN_RESTAURANTS.filter(r => r.cuisine === c.name).length} restaurants</p>
      <div class="flex gap-1.5 mt-1 flex-wrap justify-center">
        <button onclick="editCuisine(${c.id})" class="text-xs font-bold text-brand-black bg-brand-yellow px-2.5 py-1 rounded-lg hover:bg-yellow-300 transition-colors">Edit</button>
        <button onclick="toggleCuisine(${c.id})" class="text-xs font-bold ${c.active ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'} px-2.5 py-1 rounded-lg transition-colors">
          ${c.active ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>`).join('');
}

window.openAddCuisine = function() {
  document.getElementById('add-cuisine-form').classList.remove('hidden');
  document.getElementById('new-cuisine-name').focus();
};

window.closeAddCuisine = function() {
  document.getElementById('add-cuisine-form').classList.add('hidden');
};

window.saveCuisine = function() {
  const emoji = document.getElementById('new-cuisine-emoji').value.trim() || '🍽️';
  const name  = document.getElementById('new-cuisine-name').value.trim();
  const order = parseInt(document.getElementById('new-cuisine-order').value) || 99;

  if (!name) { alert('Please enter a cuisine name.'); return; }
  if (ADMIN_CUISINES.find(c => c.name.toLowerCase() === name.toLowerCase())) { alert('This cuisine already exists.'); return; }

  const newId = Math.max(...ADMIN_CUISINES.map(c => c.id)) + 1;
  ADMIN_CUISINES.push({ id: newId, emoji, name, order, active: true });
  ADMIN_CUISINES.sort((a, b) => a.order - b.order);

  document.getElementById('new-cuisine-emoji').value = '';
  document.getElementById('new-cuisine-name').value  = '';
  closeAddCuisine();
  renderCuisinesTab();

  if (window.YYP?.client) {
    window.YYP.client.from('cuisine_categories').insert([{ name, emoji, sort_order: order }]).then(() => {});
  }
};

window.editCuisine = function(id) {
  const c = ADMIN_CUISINES.find(x => x.id === id);
  if (!c) return;

  const newEmoji = prompt('Emoji:', c.emoji);
  if (newEmoji === null) return;
  const newName  = prompt('Cuisine name:', c.name);
  if (!newName) return;
  const newOrder = parseInt(prompt('Sort order (lower = first):', c.order) || c.order);

  c.emoji = newEmoji.trim() || c.emoji;
  c.name  = newName.trim()  || c.name;
  c.order = isNaN(newOrder) ? c.order : newOrder;
  ADMIN_CUISINES.sort((a, b) => a.order - b.order);
  renderCuisinesTab();
};

window.toggleCuisine = function(id) {
  const c = ADMIN_CUISINES.find(x => x.id === id);
  if (c) c.active = !c.active;
  renderCuisinesTab();
};


/* ══════════════════════════════════════════════════════════
   AI TAG MANAGEMENT
══════════════════════════════════════════════════════════ */
window.renderTagsTab = function() {
  const filterCat = document.getElementById('tag-filter-cat')?.value || '';
  const tags = filterCat ? ADMIN_TAGS.filter(t => t.category === filterCat) : ADMIN_TAGS;

  // Stats
  const totalUsedTags = ADMIN_TAGS.filter(t => t.restaurants > 0).length;
  const taggedRests   = new Set(ADMIN_RESTAURANTS.flatMap(r => r.tags || []));
  const topTag        = [...ADMIN_TAGS].sort((a,b) => b.searches - a.searches)[0];

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('tags-total',       ADMIN_TAGS.length);
  setEl('tags-used',        totalUsedTags);
  setEl('tags-restaurants', taggedRests.size);
  setEl('tags-top',         topTag?.name || '—');

  // Tag cloud
  const cloud = document.getElementById('tags-cloud');
  if (cloud) {
    const CAT_COLORS = { vibe:'#FFD000', meal:'#22C55E', feature:'#3B82F6', diet:'#8B5CF6', location:'#F97316' };
    cloud.innerHTML = tags.map(t => `
      <div class="tag-pill" style="border-color:${CAT_COLORS[t.category]||'#E8E8E8'}20;background:${CAT_COLORS[t.category]||'#F3F3F3'}15" title="${t.restaurants} restaurants · ${t.searches} AI searches">
        <span>${t.name}</span>
        <span class="text-xs font-black text-gray-400">${t.restaurants}</span>
        <button class="remove-tag" onclick="deleteTag(${t.id})" title="Delete tag">×</button>
      </div>`).join('');
  }

  // Table
  const tbody = document.getElementById('tags-table');
  if (tbody) {
    const sorted = [...tags].sort((a,b) => b.searches - a.searches);
    const maxS   = sorted[0]?.searches || 1;
    tbody.innerHTML = sorted.map(t => {
      const CAT_LABELS = { vibe:'Vibe', meal:'Meal Type', feature:'Feature', diet:'Diet', location:'Location' };
      return `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="py-3 pr-4 font-bold text-sm text-brand-black">${t.name}</td>
          <td class="py-3 pr-4"><span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${CAT_LABELS[t.category]||t.category}</span></td>
          <td class="py-3 pr-4 text-center font-black text-sm ${t.restaurants > 5 ? 'text-green-600' : t.restaurants > 2 ? 'text-brand-black' : 'text-gray-400'}">${t.restaurants}</td>
          <td class="py-3 pr-4">
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-gray-100 rounded-full h-1.5"><div class="h-1.5 bg-brand-yellow rounded-full" style="width:${(t.searches/maxS)*100}%"></div></div>
              <span class="text-xs font-black text-brand-black w-10 text-right">${t.searches}</span>
            </div>
          </td>
          <td class="py-3 text-right">
            <div class="flex gap-1 justify-end">
              <button onclick="editTagInline(${t.id})" class="text-xs font-bold text-brand-black bg-brand-yellow px-2 py-1 rounded-lg hover:bg-yellow-300 transition-colors">Edit</button>
              <button onclick="deleteTag(${t.id})" class="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }
};

window.addTag = function() {
  const input    = document.getElementById('new-tag-input');
  const catInput = document.getElementById('new-tag-category');
  const name     = input?.value?.trim();
  const category = catInput?.value || 'vibe';

  if (!name) { input?.focus(); return; }
  if (ADMIN_TAGS.find(t => t.name.toLowerCase() === name.toLowerCase())) {
    alert('This tag already exists.'); return;
  }

  const newId = Math.max(...ADMIN_TAGS.map(t => t.id)) + 1;
  ADMIN_TAGS.push({ id: newId, name, category, searches: 0, restaurants: 0 });
  ALL_TAGS.push(name);

  if (input) input.value = '';
  renderTagsTab();
  renderTagSelector();

  /* NOTE: restaurant_tags is a junction table (restaurant ↔ tag).
     There is no master "tags" table in the current schema, so the
     admin tag taxonomy is kept in-memory only. Tags are persisted
     when they're attached to a restaurant via the edit form. */
  if (false && window.YYP?.client) {
    window.YYP.client.from('restaurant_tags').insert([{ tag_name: name }]).then(() => {});
  }
};

window.editTagInline = function(id) {
  const t = ADMIN_TAGS.find(x => x.id === id);
  if (!t) return;
  const newName = prompt(`Rename tag "${t.name}":`, t.name);
  if (!newName || newName === t.name) return;
  t.name = newName.trim();
  renderTagsTab();
};

window.deleteTag = function(id) {
  const t = ADMIN_TAGS.find(x => x.id === id);
  if (!t) return;
  if (!confirm(`Delete tag "${t.name}"? It will be removed from all restaurant listings.`)) return;
  ADMIN_TAGS.splice(ADMIN_TAGS.findIndex(x => x.id === id), 1);
  renderTagsTab();
  renderTagSelector();
};


/* ══════════════════════════════════════════════════════════
   TAG SELECTOR (Add Restaurant form)
══════════════════════════════════════════════════════════ */
function renderTagSelector() {
  const container = document.getElementById('tag-selector');
  if (!container) return;
  container.innerHTML = ADMIN_TAGS.map(t => `
    <button type="button"
      class="tag-pill ${selectedTags.has(t.name) ? 'active' : ''}"
      onclick="toggleFormTag('${t.name.replace(/'/g, "\\'")}')">${t.name}</button>`).join('');
}

window.toggleFormTag = function(tag) {
  if (selectedTags.has(tag)) selectedTags.delete(tag);
  else selectedTags.add(tag);
  const input = document.getElementById('selected-tags');
  if (input) input.value = [...selectedTags].join(',');
  renderTagSelector();
};


/* ══════════════════════════════════════════════════════════
   LISTING MODE TOGGLE — Premium (YUMYUMPO-hosted) vs External
══════════════════════════════════════════════════════════ */
window.onModeChange = function() {
  const form = document.getElementById('add-restaurant-form');
  if (!form) return;
  const mode = form.listing_mode?.value || 'premium';
  const hostedBox  = form.querySelector('[name="has_yumyumpo_site"]');
  const websiteUrl = form.querySelector('[name="website_url"]');
  const featuredBox = form.querySelector('[name="is_featured"]');

  // Update tile highlight
  form.querySelectorAll('.mode-tile').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  if (mode === 'premium') {
    if (hostedBox)  hostedBox.checked = true;
    if (websiteUrl) { websiteUrl.disabled = false; websiteUrl.required = true; websiteUrl.placeholder = 'https://thethreethreethree.github.io/Blend-Grind/'; }
    if (featuredBox) featuredBox.checked = true;
  } else {
    if (hostedBox)  hostedBox.checked = false;
    if (websiteUrl) { websiteUrl.disabled = false; websiteUrl.required = true; websiteUrl.placeholder = "https://restaurant-own-site.com"; }
    if (featuredBox) featuredBox.checked = false;
  }
};
document.addEventListener('DOMContentLoaded', () => setTimeout(window.onModeChange, 60));


/* ══════════════════════════════════════════════════════════
   ADD RESTAURANT FORM
══════════════════════════════════════════════════════════ */
window.submitRestaurant = async function(e) {
  e.preventDefault();
  const form    = e.target;
  const data    = Object.fromEntries(new FormData(form));
  const message = document.getElementById('form-message');
  data.tags     = [...selectedTags];

  // Pick up cover URL from either the URL field or the first uploaded preview
  if (!data.cover_image_url) {
    const firstPreview = document.querySelector('#add-preview-grid .image-preview-item');
    if (firstPreview) data.cover_image_url = firstPreview.dataset.url || '';
  }

  if (!window.YYP?.client) {
    showMessage(message, 'error', 'Database connection unavailable. Please try again later.');
    return;
  }

  /* 1. Insert restaurant and get the new UUID back */
  const { data: inserted, error } = await window.YYP.client.from('restaurants').insert([{
    name:              data.name,
    slug:              data.slug,
    description:       data.description || null,
    tagline:           data.tagline     || null,
    cuisine_type:      data.cuisine_type,
    location:          data.location    || null,
    address:           data.address     || null,
    google_rating:     parseFloat(data.google_rating) || null,
    review_count:      parseInt(data.review_count)    || 0,
    website_url:       data.website_url || null,
    has_yumyumpo_site: !!data.has_yumyumpo_site,
    cover_image_url:   data.cover_image_url || null,
    is_featured:       !!data.is_featured,
    is_active:         data.is_active === undefined ? true : !!data.is_active,
    owner_email:       data.owner_email?.trim().toLowerCase() || null,
  }]).select().single();

  if (error) { showMessage(message, 'error', `Error: ${error.message}`); return; }

  /* 2. Insert tags with the real restaurant_id */
  if (inserted?.id && data.tags?.length) {
    const tagRows = data.tags.map(tag_name => ({ restaurant_id: inserted.id, tag_name }));
    const { error: tagErr } = await window.YYP.client.from('restaurant_tags').insert(tagRows);
    if (tagErr) console.warn('[Admin] tag insert failed:', tagErr.message);
  }

  showMessage(message, 'success', `✓ "${data.name}" listed successfully!`);
  form.reset();
  selectedTags.clear();
  const preview = document.getElementById('add-preview-grid');
  if (preview) preview.innerHTML = '';
  renderTagSelector();

  /* 3. Refresh from Supabase so the new row appears with its real UUID */
  await loadAdminFromSupabase();

  if (window.YAn) YAn.track('restaurant_added', { name: data.name, slug: data.slug });
  setTimeout(() => showTab('restaurants'), 1400);
};

function showMessage(el, type, text) {
  if (!el) return;
  el.className = `rounded-xl p-3 text-sm font-semibold ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`;
  el.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}


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

function toSlug(s) {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g,'').replace(/[\s_-]+/g,'-').replace(/^-+|-+$/g,'');
}


/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function getCuisineEmoji(c) {
  const m = { Filipino:'🍛', Japanese:'🍜', Korean:'🥘', Italian:'🍕', Chinese:'🥟', Seafood:'🦞', Café:'☕', 'BBQ & Grill':'🔥', BBQ:'🔥', Vegan:'🥗', Burgers:'🍔', Mexican:'🌮', Desserts:'🍨' };
  return m[c] || '🍽️';
}

