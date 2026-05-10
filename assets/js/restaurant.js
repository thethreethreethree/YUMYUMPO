/* ============================================================
   YUMYUMPO — Restaurant Profile Page JS
   ============================================================ */

'use strict';

/* ── STATIC FALLBACK DATA ── */
const RESTAURANT_DATA = {
  'marias-kitchen': {
    id: 1, slug: 'marias-kitchen',
    name: "Maria's Kitchen",
    tagline: 'Home-cooked Filipino food with heart.',
    cuisine_type: 'Filipino · Home-cooked',
    description: "Maria's Kitchen has been serving the El Nido community for over 15 years. Every dish is made from scratch using locally sourced ingredients and treasured family recipes. Step through our doors and feel instantly at home.",
    location: 'El Nido, Palawan, Philippines',
    address: '123 Corong-Corong Road, El Nido, Palawan 5313',
    google_rating: 4.8, review_count: 1238,
    is_featured: true,
    cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=75',
    ],
    website_url: 'https://example.com',
    whatsapp_url: 'https://wa.me/639123456789',
    phone: '+63 912 345 6789',
    instagram_url: 'https://instagram.com',
    facebook_url: 'https://facebook.com',
    hours: [
      { day: 'Monday',    open: '7:00 AM', close: '9:00 PM', closed: false },
      { day: 'Tuesday',   open: '7:00 AM', close: '9:00 PM', closed: false },
      { day: 'Wednesday', open: '7:00 AM', close: '9:00 PM', closed: false },
      { day: 'Thursday',  open: '7:00 AM', close: '9:00 PM', closed: false },
      { day: 'Friday',    open: '7:00 AM', close: '10:00 PM', closed: false },
      { day: 'Saturday',  open: '8:00 AM', close: '10:00 PM', closed: false },
      { day: 'Sunday',    open: '8:00 AM', close: '8:00 PM', closed: false },
    ],
    tags: ['Local Favorite', 'Family-Friendly', 'Affordable', 'Breakfast', 'Lunch', 'Dinner'],
    menu_categories: [
      {
        name: 'Signature Dishes',
        items: [
          { name: 'Sinigang na Baboy', description: 'Tender pork belly in a tangy tamarind broth with fresh vegetables.', price: '₱280', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=75', tags: ['Best Seller', 'Spicy'] },
          { name: 'Crispy Lechon Kawali', description: 'Deep-fried pork belly, impossibly crispy outside, meltingly tender inside. Served with liver sauce.', price: '₱320', image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&auto=format&fit=crop&q=75', tags: ['Must Try'] },
          { name: 'Kare-Kare', description: 'Oxtail and vegetables in rich peanut sauce. Served with bagoong on the side.', price: '₱350', image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&auto=format&fit=crop&q=75', tags: ['Chef Special'] },
        ]
      },
      {
        name: 'Breakfast Favourites',
        items: [
          { name: 'Tapsilog', description: 'Cured beef tapa, garlic fried rice, and a fried egg. The perfect Filipino breakfast.', price: '₱180', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&auto=format&fit=crop&q=75', tags: ['Morning Staple'] },
          { name: 'Longsilog', description: 'Sweet garlic longganisa sausage with garlic rice and egg.', price: '₱160', image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&auto=format&fit=crop&q=75', tags: ['Popular'] },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3938.0!2d119.4!3d11.18!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTHCsDA5JzQ3LjQiTiAxMTnCsDI0JzAwLjAiRQ!5e0!3m2!1sen!2sph!4v1600000000000!5m2!1sen!2sph',
  },
};


/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  const slug = new URLSearchParams(window.location.search).get('slug') || 'marias-kitchen';

  // Try Supabase first, fall back to static
  let restaurant = null;
  if (window.supabase) {
    restaurant = await window.db?.getRestaurantBySlug(slug);
  }
  if (!restaurant) {
    restaurant = RESTAURANT_DATA[slug] || RESTAURANT_DATA['marias-kitchen'];
  }

  renderPage(restaurant);
  trackPageView(restaurant);
});


/* ── RENDER PAGE ── */
function renderPage(r) {
  updateSEO(r);
  renderGallery(r);
  renderHeader(r);
  renderAbout(r);
  renderHours(r);
  renderMenu(r);
  renderMap(r);
  renderActionCard(r);
  renderInfoCard(r);
  renderSocialCard(r);
  renderMobileBar(r);
}


/* ── SEO ── */
function updateSEO(r) {
  document.getElementById('page-title').textContent   = `${r.name} — YUMYUMPO`;
  document.getElementById('meta-desc').content        = r.description?.substring(0, 160) || '';
  document.getElementById('og-title').content         = `${r.name} — YUMYUMPO`;
  document.getElementById('og-desc').content          = r.description?.substring(0, 200) || '';
  document.getElementById('og-image').content         = r.cover_image_url || '';
}


/* ── GALLERY ── */
function renderGallery(r) {
  const cover = document.getElementById('hero-cover');
  const g2    = document.getElementById('gallery-2');
  const g3    = document.getElementById('gallery-3');

  if (cover) { cover.src = r.cover_image_url; cover.alt = r.name; }
  if (g2 && r.gallery?.[0]) g2.src = r.gallery[0];
  if (g3 && r.gallery?.[1]) g3.src = r.gallery[1];
}


/* ── HEADER ── */
function renderHeader(r) {
  const container = document.getElementById('restaurant-header');
  if (!container) return;

  const stars = renderStars(r.google_rating || 0);
  const tagsHTML = (r.tags || []).slice(0, 5).map((t, i) =>
    `<span class="r-tag ${i === 0 ? 'yellow' : 'gray'}">${t}</span>`
  ).join('');

  container.innerHTML = `
    <div class="flex items-start gap-4 mb-6">
      <div class="w-16 h-16 rounded-2xl bg-yellow-light border-2 border-white shadow-lg flex items-center justify-center text-3xl shrink-0">
        🍛
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-black text-brand-yellow uppercase tracking-widest mb-1" style="color:#B8960A">${r.cuisine_type || 'Restaurant'}</p>
        <h1 class="font-display text-3xl sm:text-4xl font-black text-brand-black leading-tight tracking-tight">${r.name}</h1>
        ${r.tagline ? `<p class="text-gray-400 mt-1 font-medium">${r.tagline}</p>` : ''}
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4 mb-5">
      <div class="flex items-center gap-2 bg-yellow-light px-3 py-1.5 rounded-full">
        <span class="text-yellow-500 text-base leading-none">★</span>
        <span class="font-black text-brand-black text-sm">${r.google_rating}</span>
        <span class="text-gray-400 text-sm">(${(r.review_count || 0).toLocaleString()} reviews)</span>
      </div>
      ${r.location ? `
      <div class="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        ${r.location}
      </div>` : ''}
    </div>

    <div class="flex flex-wrap gap-2">${tagsHTML}</div>

    <!-- Divider -->
    <div class="mt-6 pt-6 border-t border-gray-100"></div>
  `;
}


/* ── ABOUT ── */
function renderAbout(r) {
  if (!r.description) return;
  const section = document.getElementById('about-section');
  const text    = document.getElementById('about-text');
  if (section) section.classList.remove('hidden');
  if (text)    text.textContent = r.description;
}


/* ── HOURS ── */
function renderHours(r) {
  if (!r.hours?.length) return;
  const section = document.getElementById('hours-section');
  const grid    = document.getElementById('hours-grid');
  if (!section || !grid) return;
  section.classList.remove('hidden');

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  grid.innerHTML = r.hours.map(h => `
    <div class="hours-row ${h.day === today ? 'today' : ''}">
      <span class="text-sm font-bold ${h.day === today ? 'text-brand-black' : 'text-gray-800'}">
        ${h.day}${h.day === today ? ' <span class="text-xs font-semibold text-yellow-600 ml-1">(Today)</span>' : ''}
      </span>
      <span class="text-sm font-semibold ${h.closed ? 'text-red-400' : 'text-gray-400'}">${h.closed ? 'Closed' : `${h.open} – ${h.close}`}</span>
    </div>
  `).join('');
}


/* ── MENU ── */
function renderMenu(r) {
  if (!r.menu_categories?.length) return;
  const section   = document.getElementById('menu-section');
  const container = document.getElementById('menu-container');
  if (!section || !container) return;
  section.classList.remove('hidden');

  container.innerHTML = r.menu_categories.map(cat => `
    <div>
      <div class="flex items-center gap-3 mb-4">
        <h3 class="r-section-title text-lg">${cat.name}</h3>
        <div class="flex-1 h-px bg-gray-100"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${cat.items.map(item => menuItemCard(item)).join('')}
      </div>
    </div>
  `).join('');
}

function menuItemCard(item) {
  const tagsHTML = (item.tags || []).map(t =>
    `<span class="r-tag yellow text-xs">${t}</span>`
  ).join('');

  return `
    <div class="menu-item-card">
      <div class="w-24 h-auto shrink-0 bg-gray-100" style="min-height:96px">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" style="min-height:96px" loading="lazy" />`
          : `<div class="w-full h-24 flex items-center justify-center text-3xl">🍽️</div>`
        }
      </div>
      <div class="flex-1 min-w-0 p-3">
        <div class="flex items-start justify-between gap-2 mb-1">
          <h4 class="font-bold text-brand-black text-sm leading-tight">${item.name}</h4>
          <span class="font-black text-brand-black text-sm whitespace-nowrap" style="color:#8A6900">${item.price}</span>
        </div>
        <p class="text-gray-400 text-xs leading-relaxed mb-2 line-clamp-2">${item.description || ''}</p>
        <div class="flex flex-wrap gap-1">${tagsHTML}</div>
      </div>
    </div>
  `;
}


/* ── MAP ── */
function renderMap(r) {
  const section = document.getElementById('map-section');
  const embed   = document.getElementById('map-embed');
  const addr    = document.getElementById('address-text');
  if (!section || !embed) return;

  if (r.map_embed || r.address) {
    section.classList.remove('hidden');
  }

  if (r.map_embed) {
    embed.innerHTML = `<iframe src="${r.map_embed}" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }

  if (r.address && addr) {
    addr.textContent = r.address;
  }
}


/* ── ACTION CARD (desktop sidebar) ── */
function renderActionCard(r) {
  const card    = document.getElementById('action-card');
  const buttons = document.getElementById('action-buttons');
  if (!card || !buttons) return;

  const actions = [];

  if (r.whatsapp_url) {
    actions.push({ label: 'Order via WhatsApp', href: r.whatsapp_url, icon: waIcon(), cls: 'green', track: 'whatsapp_click' });
  }
  if (r.website_url) {
    actions.push({ label: 'Visit Website', href: r.website_url, icon: webIcon(), cls: 'yellow', track: 'website_click' });
  }
  if (r.messenger_url) {
    actions.push({ label: 'Open Messenger', href: r.messenger_url, icon: messengerIcon(), cls: 'black', track: 'messenger_click' });
  }
  if (r.phone) {
    actions.push({ label: `Call: ${r.phone}`, href: `tel:${r.phone}`, icon: phoneIcon(), cls: 'outline', track: 'call_click' });
  }

  if (!actions.length) return;
  card.classList.remove('hidden');
  buttons.innerHTML = actions.map(a => `
    <a href="${a.href}" target="_blank" rel="noopener noreferrer"
       onclick="trackAction('${a.track}', '${r.id}')"
       class="action-btn ${a.cls}">
      ${a.icon}
      ${a.label}
    </a>
  `).join('');
}


/* ── INFO CARD ── */
function renderInfoCard(r) {
  const card = document.getElementById('info-card');
  const list = document.getElementById('info-list');
  if (!card || !list) return;

  const rows = [];
  if (r.cuisine_type) rows.push({ icon: '🍽️', label: 'Cuisine', value: r.cuisine_type });
  if (r.location)     rows.push({ icon: '📍', label: 'Location', value: r.location });
  if (r.phone)        rows.push({ icon: '📞', label: 'Phone',    value: r.phone });
  if (r.hours?.find(h => !h.closed)) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayHours = r.hours.find(h => h.day === today);
    if (todayHours) rows.push({ icon: '🕐', label: "Today's Hours", value: todayHours.closed ? 'Closed' : `${todayHours.open} – ${todayHours.close}` });
  }

  if (!rows.length) return;
  card.classList.remove('hidden');
  list.innerHTML = rows.map(row => `
    <div class="info-row">
      <div class="info-icon">${row.icon}</div>
      <div>
        <p class="text-xs text-gray-400 font-medium mb-0.5">${row.label}</p>
        <p class="text-sm text-brand-black font-bold">${row.value}</p>
      </div>
    </div>
  `).join('');
}


/* ── SOCIAL CARD ── */
function renderSocialCard(r) {
  const card  = document.getElementById('social-card');
  const links = document.getElementById('social-links');
  if (!card || !links) return;

  const socials = [];
  if (r.instagram_url) socials.push({ href: r.instagram_url, icon: '📸', label: 'Instagram' });
  if (r.facebook_url)  socials.push({ href: r.facebook_url,  icon: '👍', label: 'Facebook' });

  if (!socials.length) return;
  card.classList.remove('hidden');
  links.innerHTML = socials.map(s => `
    <a href="${s.href}" target="_blank" rel="noopener noreferrer"
       class="action-btn outline flex-1 justify-center text-sm py-2.5 px-4" style="width:auto">
      <span class="text-base">${s.icon}</span>${s.label}
    </a>
  `).join('');
}


/* ── MOBILE ACTION BAR ── */
function renderMobileBar(r) {
  const wa      = document.getElementById('m-whatsapp');
  const call    = document.getElementById('m-call');
  const website = document.getElementById('m-website');

  if (wa && r.whatsapp_url) {
    wa.classList.remove('hidden');
    wa.onclick = () => { trackAction('whatsapp_click', r.id); window.open(r.whatsapp_url, '_blank'); };
  }
  if (call && r.phone) {
    call.classList.remove('hidden');
    call.onclick = () => { trackAction('call_click', r.id); window.location.href = `tel:${r.phone}`; };
  }
  if (website && r.website_url) {
    website.classList.remove('hidden');
    website.onclick = () => { trackAction('website_click', r.id); window.open(r.website_url, '_blank'); };
  }
}


/* ── SVG ICONS ── */
const webIcon      = () => `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>`;
const waIcon       = () => `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const messengerIcon = () => `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg>`;
const phoneIcon    = () => `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>`;


/* ── STAR RENDERER ── */
function renderStars(rating) {
  const full = Math.floor(rating);
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += `<span style="opacity:${i < full ? 1 : 0.25}">★</span>`;
  }
  return html;
}


/* ── ANALYTICS ── */
function trackPageView(r) {
  window.db?.trackAnalyticsEvent('profile_view', r.id, { slug: r.slug });
}

window.trackAction = function (eventType, restaurantId) {
  window.db?.trackAnalyticsEvent(eventType, restaurantId);
};
