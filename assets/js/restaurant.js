/* ============================================================
   YUMYUMPO — Restaurant Profile Page
   Cinematic profile pages for every restaurant on the platform.
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   RESTAURANT DATABASE
   Static fallback — replace with Supabase live queries.
   Each object maps the restaurants table schema exactly.
══════════════════════════════════════════════════════════ */
const RESTAURANTS = {

  'marias-kitchen': {
    id: 1, slug: 'marias-kitchen',
    name: "Maria's Kitchen",
    tagline: 'Home-cooked Filipino food with heart.',
    cuisine_type: 'Filipino · Home-cooked',
    description: "Maria's Kitchen has been at the heart of El Nido's food culture for over 15 years. Every single dish is made from scratch using locally sourced ingredients and treasured family recipes passed down through three generations. Step through our doors and feel instantly at home — this is the kind of food that makes you call your mum after. Regulars swear by the sinigang, first-timers are floored by the lechon kawali, and everyone leaves with the next reservation already in mind.",
    location: 'El Nido, Palawan',
    address: '123 Corong-Corong Road, El Nido, Palawan 5313',
    latitude: 11.174, longitude: 119.407,
    google_rating: 4.8, review_count: 1238,
    cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=85',
    logo_emoji: '🍛',
    gallery: [
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
    ],
    food_gallery: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=75',
    ],
    website_url: null,
    whatsapp_url: 'https://wa.me/639123456789',
    messenger_url: 'https://m.me/mariaskitchenel nido',
    phone: '+63 912 345 6789',
    instagram_url: 'https://instagram.com/mariaskitchen.elnido',
    facebook_url: 'https://facebook.com/mariaskitchen',
    tags: ['Local Favorite', 'Family-Friendly', 'Budget-Friendly', 'Backpacker-Approved', 'Hidden Gem'],
    hours: [
      { day: 'Monday',    open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Tuesday',   open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Wednesday', open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Thursday',  open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Friday',    open: '7:00 AM', close: '10:00 PM', closed: false },
      { day: 'Saturday',  open: '8:00 AM', close: '10:00 PM', closed: false },
      { day: 'Sunday',    open: '8:00 AM', close: '8:00 PM',  closed: false },
    ],
    menu_categories: [
      {
        name: 'Signature Dishes',
        items: [
          {
            name: 'Sinigang na Baboy',
            description: 'Tender pork belly in a tangy tamarind broth with fresh morning vegetables. Served with steamed rice.',
            price: '₱280', price_note: 'good for 2',
            image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=80',
            tags: ['Best Seller', '🔥 Spicy']
          },
          {
            name: 'Crispy Lechon Kawali',
            description: 'Deep-fried pork belly, impossibly crispy outside, meltingly tender inside. Served with house liver sauce.',
            price: '₱320',
            image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=700&auto=format&fit=crop&q=80',
            tags: ['Must Try']
          },
          {
            name: 'Kare-Kare',
            description: 'Oxtail and vegetables braised in rich peanut sauce. Served with fermented shrimp paste on the side.',
            price: '₱350', price_note: 'good for 2',
            image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=700&auto=format&fit=crop&q=80',
            tags: ['Chef Special']
          },
        ]
      },
      {
        name: 'Breakfast Favourites',
        items: [
          {
            name: 'Tapsilog',
            description: 'Cured beef tapa, garlic fried rice, and a sunny-side-up egg. The classic Filipino breakfast.',
            price: '₱180',
            image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&auto=format&fit=crop&q=80',
            tags: ['Morning Staple']
          },
          {
            name: 'Bangsilog',
            description: 'Crispy fried milkfish, garlic fried rice, and egg. A Philippine breakfast institution.',
            price: '₱160',
            image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700&auto=format&fit=crop&q=80',
            tags: ['Popular']
          },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7876.532!2d119.407!3d11.174!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph',
    directions_url: 'https://maps.google.com/?q=El+Nido+Palawan+Philippines',
    similar: ['sunset-grill', 'el-pescador'],
  },

  'sunset-grill': {
    id: 2, slug: 'sunset-grill',
    name: 'Sunset Grill',
    tagline: 'Freshest seafood. Best view in Coron.',
    cuisine_type: 'Seafood · Grill',
    description: "Perched above the water on Coron's famous waterfront, Sunset Grill is the kind of place that ruins all other seafood restaurants for you — permanently. The catch comes straight from the fishermen who dock below the restaurant every morning. Watch the sun melt into the Calamian Sea while grilled lapu-lapu cracks open on your plate. Cold beers. Warm breeze. No reservations needed — just arrive early or miss the best seats.",
    location: 'Coron, Palawan',
    address: 'Waterfront Boulevard, Coron, Palawan 5316',
    latitude: 11.998, longitude: 120.205,
    google_rating: 4.9, review_count: 874,
    cover_image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&auto=format&fit=crop&q=85',
    logo_emoji: '🌅',
    gallery: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
    ],
    food_gallery: [
      'https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1562802378-063ec186a863?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=500&auto=format&fit=crop&q=75',
    ],
    website_url: 'https://example.com/sunset-grill',
    whatsapp_url: 'https://wa.me/639987654321',
    messenger_url: null,
    phone: '+63 998 765 4321',
    instagram_url: 'https://instagram.com/sunsetgrill.coron',
    facebook_url: 'https://facebook.com/sunsetgrillcoron',
    tags: ['Romantic', 'Scenic View', 'Beach Dining', 'Date Spot', 'Sunset Dining'],
    hours: [
      { day: 'Monday',    open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Tuesday',   open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Wednesday', open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Thursday',  open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Friday',    open: '11:00 AM', close: '11:00 PM', closed: false },
      { day: 'Saturday',  open: '10:00 AM', close: '11:00 PM', closed: false },
      { day: 'Sunday',    open: '10:00 AM', close: '10:00 PM', closed: false },
    ],
    menu_categories: [
      {
        name: 'From the Grill',
        items: [
          {
            name: 'Whole Grilled Lapu-Lapu',
            description: 'Fresh grouper grilled whole with calamansi butter, garlic, and herbs. Market weight pricing.',
            price: '₱680', price_note: 'per kg',
            image: 'https://images.unsplash.com/photo-1485921325833-c519793a4f1a?w=700&auto=format&fit=crop&q=80',
            tags: ['Signature', 'Must Try']
          },
          {
            name: 'Grilled Tiger Prawns',
            description: 'Jumbo tiger prawns brushed with garlic butter, grilled over coconut husk coals.',
            price: '₱520',
            image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=700&auto=format&fit=crop&q=80',
            tags: ['Best Seller']
          },
          {
            name: 'Mixed Seafood Platter',
            description: 'Prawns, squid, fish fillet, and clams. Serves 2–3. Best shared at sunset.',
            price: '₱1,200', price_note: 'serves 2-3',
            image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=700&auto=format&fit=crop&q=80',
            tags: ['Group Fave', '🌅 Sunset Special']
          },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7876.532!2d120.205!3d11.998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1700000000001!5m2!1sen!2sph',
    directions_url: 'https://maps.google.com/?q=Coron+Palawan+Philippines',
    similar: ['marias-kitchen', 'el-pescador'],
  },

  'brew-and-bite': {
    id: 3, slug: 'brew-and-bite',
    name: 'Brew & Bite',
    tagline: 'Specialty coffee meets unforgettable brunch.',
    cuisine_type: 'Café · All-day Brunch',
    description: "Brew & Bite started as a tiny hole-in-the-wall in BGC and grew into one of the city's most beloved specialty coffee destinations. The beans are sourced directly from Benguet farmers, roasted in-house every Tuesday, and brewed with obsessive care. The brunch menu is equally serious — everything is made from scratch, from the house-fermented sourdough to the hand-rolled pasta. Whether you're working remotely, catching up with a friend, or just in it for the latte art, you're welcome here.",
    location: 'BGC, Taguig',
    address: '5th Avenue cor. 26th Street, BGC, Taguig 1634',
    latitude: 14.550, longitude: 121.052,
    google_rating: 4.7, review_count: 2104,
    cover_image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&auto=format&fit=crop&q=85',
    logo_emoji: '☕',
    gallery: [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    ],
    food_gallery: [
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1504631567267-f69f3c8bd2a7?w=500&auto=format&fit=crop&q=75',
    ],
    website_url: 'https://example.com/brew-and-bite',
    whatsapp_url: null,
    messenger_url: 'https://m.me/brewandbite.bgc',
    phone: '+63 917 123 4567',
    instagram_url: 'https://instagram.com/brewandbite.bgc',
    facebook_url: 'https://facebook.com/brewandbite',
    tags: ['WiFi-Friendly', 'Instagrammable', 'Backpacker-Approved', 'Hidden Gem', 'Healthy'],
    hours: [
      { day: 'Monday',    open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Tuesday',   open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Wednesday', open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Thursday',  open: '7:00 AM', close: '9:00 PM',  closed: false },
      { day: 'Friday',    open: '7:00 AM', close: '10:00 PM', closed: false },
      { day: 'Saturday',  open: '8:00 AM', close: '10:00 PM', closed: false },
      { day: 'Sunday',    open: '8:00 AM', close: '6:00 PM',  closed: false },
    ],
    menu_categories: [
      {
        name: 'Coffee Bar',
        items: [
          {
            name: 'Benguet Pour Over',
            description: 'Single-origin Benguet Arabica, ground to order and brewed via Hario V60. Citrusy, floral, complex.',
            price: '₱180',
            image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=700&auto=format&fit=crop&q=80',
            tags: ['House Specialty']
          },
          {
            name: 'Brown Butter Latte',
            description: 'Double espresso, steamed oat milk, and a drizzle of house brown butter caramel. Dangerous.',
            price: '₱190',
            image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=700&auto=format&fit=crop&q=80',
            tags: ['Best Seller', '🧡 Fan Fave']
          },
        ]
      },
      {
        name: 'Brunch Plates',
        items: [
          {
            name: 'Smashed Avo Toast',
            description: 'House sourdough, smashed hass avocado, poached egg, pickled red onion, and everything bagel seasoning.',
            price: '₱320',
            image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=700&auto=format&fit=crop&q=80',
            tags: ['Brunch Fave']
          },
          {
            name: 'Full B&B Breakfast',
            description: 'Two eggs your way, rashers, house sausage, grilled tomato, roasted mushrooms, and sourdough toast.',
            price: '₱480',
            image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=700&auto=format&fit=crop&q=80',
            tags: ['Most Popular', 'Must Try']
          },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7876.532!2d121.052!3d14.550!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1700000000002!5m2!1sen!2sph',
    directions_url: 'https://maps.google.com/?q=BGC+Taguig+Philippines',
    similar: ['ramen-tori', 'burger-republic'],
  },

  'ramen-tori': {
    id: 4, slug: 'ramen-tori',
    name: 'Ramen Tori',
    tagline: 'Rich broths simmered 18 hours. Noodles pulled daily.',
    cuisine_type: 'Japanese · Ramen',
    description: "Ramen Tori is serious about broth. The tonkotsu base has been simmered continuously for 18 hours every single day since opening — the same recipe, the same technique, the same obsession. The noodles are pulled fresh each morning. The chashu is braised overnight. Nothing here is rushed, and you can taste it in every spoonful. A line forms before they open on weekends. It moves fast. It is worth it.",
    location: 'Makati City',
    address: 'G/F Salcedo Village, Ayala Ave., Makati, Metro Manila 1224',
    latitude: 14.557, longitude: 121.019,
    google_rating: 4.8, review_count: 3891,
    cover_image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1600&auto=format&fit=crop&q=85',
    logo_emoji: '🍜',
    gallery: [
      'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584737189661-7c63c2bc08ab?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1623341214825-9f4f963727da?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&auto=format&fit=crop&q=80',
    ],
    food_gallery: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1623341214825-9f4f963727da?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1584737189661-7c63c2bc08ab?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1562802378-063ec186a863?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500&auto=format&fit=crop&q=75',
    ],
    website_url: 'https://example.com/ramen-tori',
    whatsapp_url: null,
    messenger_url: 'https://m.me/ramentori',
    phone: '+63 905 678 9012',
    instagram_url: 'https://instagram.com/ramentori.mnl',
    facebook_url: 'https://facebook.com/ramentori',
    tags: ['Late Night', 'Date Spot', 'Must Try', 'Local Favorite', 'Most Loved'],
    hours: [
      { day: 'Monday',    closed: true },
      { day: 'Tuesday',   open: '11:30 AM', close: '10:00 PM', closed: false },
      { day: 'Wednesday', open: '11:30 AM', close: '10:00 PM', closed: false },
      { day: 'Thursday',  open: '11:30 AM', close: '10:00 PM', closed: false },
      { day: 'Friday',    open: '11:30 AM', close: '11:00 PM', closed: false },
      { day: 'Saturday',  open: '11:00 AM', close: '11:00 PM', closed: false },
      { day: 'Sunday',    open: '11:00 AM', close: '10:00 PM', closed: false },
    ],
    menu_categories: [
      {
        name: 'Signature Bowls',
        items: [
          {
            name: 'Tori Tonkotsu',
            description: 'The signature. Milky 18-hour pork bone broth, thin straight noodles, 63°C egg, chashu, bamboo shoots, nori.',
            price: '₱480',
            image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=80',
            tags: ['Must Order', 'Signature']
          },
          {
            name: 'Spicy Tori Miso',
            description: 'House miso tare, chili oil, ground pork, corn, butter, and a soft-boiled egg. Bold and deeply satisfying.',
            price: '₱520',
            image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=700&auto=format&fit=crop&q=80',
            tags: ['🔥 Spicy', 'Fan Fave']
          },
          {
            name: 'Tori Shoyu',
            description: 'Light chicken-based broth with aged shoyu tare, wavy noodles, chicken chashu, menma, and scallions.',
            price: '₱440',
            image: 'https://images.unsplash.com/photo-1623341214825-9f4f963727da?w=700&auto=format&fit=crop&q=80',
            tags: ['Lighter Option']
          },
        ]
      },
      {
        name: 'Sides',
        items: [
          {
            name: 'Karaage Chicken',
            description: 'Double-fried Japanese fried chicken, super crispy, with kewpie mayo and lemon.',
            price: '₱220',
            image: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=700&auto=format&fit=crop&q=80',
            tags: ['Best Side']
          },
          {
            name: 'Extra Chashu (3pc)',
            description: 'Melt-in-your-mouth braised pork belly slices. Caramelized, soy-glazed, perfect.',
            price: '₱120',
            image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=700&auto=format&fit=crop&q=80',
            tags: []
          },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7876.532!2d121.019!3d14.557!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1700000000003!5m2!1sen!2sph',
    directions_url: 'https://maps.google.com/?q=Makati+City+Metro+Manila+Philippines',
    similar: ['izakaya-nori', 'brew-and-bite'],
  },

  'izakaya-nori': {
    id: 5, slug: 'izakaya-nori',
    name: 'Izakaya Nori',
    tagline: 'Skewers, sake, and good vibes until 2am.',
    cuisine_type: 'Japanese · Izakaya',
    description: "Izakaya Nori is the kind of bar that becomes your second home after midnight. The yakitori skewers come off the Binchotan charcoal grill in a steady rhythm, the sake is cold, and the music is exactly loud enough. Backpackers, suits, and locals all sit elbow-to-elbow at the long communal counter — that's the whole point. No VIP section, no dress code, just great food and genuine hospitality until the last train runs out of excuses.",
    location: 'Quezon City',
    address: 'Tomas Morato Ave, Quezon City, Metro Manila',
    latitude: 14.637, longitude: 121.040,
    google_rating: 4.9, review_count: 2210,
    cover_image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=85',
    logo_emoji: '🍶',
    gallery: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1437184956684-5e7dd0a9f552?w=600&auto=format&fit=crop&q=80',
    ],
    food_gallery: [
      'https://images.unsplash.com/photo-1562802378-063ec186a863?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=75',
    ],
    website_url: null,
    whatsapp_url: 'https://wa.me/639505678901',
    messenger_url: 'https://m.me/izakayanori',
    phone: '+63 950 567 8901',
    instagram_url: 'https://instagram.com/izakaya.nori',
    facebook_url: 'https://facebook.com/izakayanori',
    tags: ['Late Night', 'Backpacker-Approved', 'Hidden Gem', 'Date Spot', 'Instagrammable'],
    hours: [
      { day: 'Monday',    open: '5:00 PM', close: '1:00 AM', closed: false },
      { day: 'Tuesday',   open: '5:00 PM', close: '1:00 AM', closed: false },
      { day: 'Wednesday', open: '5:00 PM', close: '1:00 AM', closed: false },
      { day: 'Thursday',  open: '5:00 PM', close: '2:00 AM', closed: false },
      { day: 'Friday',    open: '5:00 PM', close: '3:00 AM', closed: false },
      { day: 'Saturday',  open: '4:00 PM', close: '3:00 AM', closed: false },
      { day: 'Sunday',    open: '4:00 PM', close: '12:00 AM', closed: false },
    ],
    menu_categories: [
      {
        name: 'Yakitori (per stick)',
        items: [
          {
            name: 'Negima (Chicken & Leek)',
            description: 'Juicy thigh meat alternated with spring onion, brushed with house tare. The izakaya essential.',
            price: '₱75',
            image: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=700&auto=format&fit=crop&q=80',
            tags: ['Most Popular']
          },
          {
            name: 'Wagyu Beef Skewer',
            description: 'Wagyu short rib, marinated in shoyu and mirin, chargrilled over Binchotan charcoal.',
            price: '₱180',
            image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=700&auto=format&fit=crop&q=80',
            tags: ['Premium', 'Must Try']
          },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7876.532!2d121.040!3d14.637!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1700000000004!5m2!1sen!2sph',
    directions_url: 'https://maps.google.com/?q=Tomas+Morato+Quezon+City+Philippines',
    similar: ['ramen-tori', 'korean-bbq-house'],
  },

  'siargao-surf-kitchen': {
    id: 6, slug: 'siargao-surf-kitchen',
    name: 'Siargao Surf Kitchen',
    tagline: 'Fuel for surfers. Vibes for everyone.',
    cuisine_type: 'Café · Healthy Eats',
    description: "Right next to Cloud 9, Surf Kitchen feeds the island's best athletes and laziest hammock-sitters with equal enthusiasm. The acai bowls are loaded, the smoothies are thick, and the eggs Benedict have a calamansi hollandaise that shouldn't work but absolutely does. WiFi is strong, the outdoor seating is shaded, and the music is always right. Come for a quick post-surf bite, stay for three hours.",
    location: 'General Luna, Siargao',
    address: 'Cloud 9 Road, General Luna, Siargao Island, Surigao del Norte',
    latitude: 9.856, longitude: 126.046,
    google_rating: 4.8, review_count: 743,
    cover_image_url: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1600&auto=format&fit=crop&q=85',
    logo_emoji: '🌊',
    gallery: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
    ],
    food_gallery: [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=500&auto=format&fit=crop&q=75',
    ],
    website_url: 'https://example.com/surf-kitchen',
    whatsapp_url: 'https://wa.me/639612345678',
    messenger_url: null,
    phone: '+63 961 234 5678',
    instagram_url: 'https://instagram.com/surfkitchen.siargao',
    facebook_url: 'https://facebook.com/surfkitchensiargao',
    tags: ['Beach Dining', 'Healthy', 'Backpacker-Approved', 'Instagrammable', 'WiFi-Friendly'],
    hours: [
      { day: 'Monday',    open: '7:00 AM', close: '8:00 PM', closed: false },
      { day: 'Tuesday',   open: '7:00 AM', close: '8:00 PM', closed: false },
      { day: 'Wednesday', open: '7:00 AM', close: '8:00 PM', closed: false },
      { day: 'Thursday',  open: '7:00 AM', close: '8:00 PM', closed: false },
      { day: 'Friday',    open: '7:00 AM', close: '9:00 PM', closed: false },
      { day: 'Saturday',  open: '6:30 AM', close: '9:00 PM', closed: false },
      { day: 'Sunday',    open: '6:30 AM', close: '7:00 PM', closed: false },
    ],
    menu_categories: [
      {
        name: 'Power Bowls',
        items: [
          {
            name: 'Cloud 9 Açaí Bowl',
            description: 'Organic açaí base, banana, granola, goji berries, coconut flakes, honey drizzle. Surfer fuel.',
            price: '₱320',
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&auto=format&fit=crop&q=80',
            tags: ['Best Seller', 'Vegan']
          },
          {
            name: 'Salmon Poke Bowl',
            description: 'Sushi rice, fresh salmon, edamame, cucumber, pickled ginger, sesame, spicy mayo.',
            price: '₱480',
            image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=700&auto=format&fit=crop&q=80',
            tags: ['Fresh', 'Must Try']
          },
        ]
      },
    ],
    map_embed: 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d7876.532!2d126.046!3d9.856!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1700000000005!5m2!1sen!2sph',
    directions_url: 'https://maps.google.com/?q=Cloud+9+Siargao+Philippines',
    similar: ['brew-and-bite', 'marias-kitchen'],
  },

};

/* Aliases — all discover.js slugs that might be clicked */
RESTAURANTS['el-nido-eats']         = RESTAURANTS['marias-kitchen'];
RESTAURANTS['bohol-bites']          = RESTAURANTS['marias-kitchen'];
RESTAURANTS['fishermans-wharf']     = RESTAURANTS['sunset-grill'];
RESTAURANTS['el-pescador']          = RESTAURANTS['sunset-grill'];
RESTAURANTS['korean-bbq-house']     = RESTAURANTS['izakaya-nori'];
RESTAURANTS['la-mesa-verde']        = RESTAURANTS['siargao-surf-kitchen'];
RESTAURANTS['the-smokehouse']       = RESTAURANTS['ramen-tori'];
RESTAURANTS['paluto-na']            = RESTAURANTS['marias-kitchen'];
RESTAURANTS['creperie-manila']      = RESTAURANTS['brew-and-bite'];
RESTAURANTS['pizzeria-roma']        = RESTAURANTS['brew-and-bite'];
RESTAURANTS['burger-republic']      = RESTAURANTS['ramen-tori'];
RESTAURANTS['tacos-del-sol']        = RESTAURANTS['izakaya-nori'];
RESTAURANTS['halo-halo-ni-lola']    = RESTAURANTS['marias-kitchen'];
RESTAURANTS['canton-empire']        = RESTAURANTS['ramen-tori'];


/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const slug = (params.get('slug') || params.get('id') || '').trim();

  if (!slug) {
    showNotFound(null);
    return;
  }

  /* Wait for the Supabase client to be ready, otherwise the fetch
     returns null and the page falsely shows "not found." */
  if (window.YYP?.ready) {
    boot(slug);
  } else {
    document.addEventListener('yyp:ready', () => boot(slug), { once: true });
    /* Hard timeout — if the SDK never loads, fall back to static dataset */
    setTimeout(() => { if (!window.__yypRestaurant) boot(slug); }, 6000);
  }
});

async function boot(slug) {
  let r = null;
  if (window.db) r = await window.db.getRestaurantBySlug(slug).catch(() => null);
  if (!r) r = RESTAURANTS[slug] || null;

  if (!r) {
    showNotFound(slug);
    return;
  }

  renderPage(r);
  initNavScroll();
  initReveal();
  initParallax();
  trackPageView(r);

  /* Record into user's discovery history (no-op if signed out) */
  if (window.YYP?.account?.isSignedIn) {
    window.YYP.account.recordView(r.slug);
  } else {
    document.addEventListener('yyp:account-ready', () => {
      if (window.YYP?.account?.isSignedIn) window.YYP.account.recordView(r.slug);
    }, { once: true });
  }

  /* Social discovery: reactions + "people also saved" */
  initReactions(r.slug);
  loadPeopleAlsoSaved(r.slug);
}


/* ══════════════════════════════════════════════════════════
   REACTIONS — love / want-to-go / been-there
══════════════════════════════════════════════════════════ */
function initReactions(slug) {
  const buttons = document.querySelectorAll('#reaction-buttons .reaction-btn');
  if (!buttons.length) return;

  async function paint() {
    if (!window.YYP?.account?.getReactions) return;
    const data = await window.YYP.account.getReactions(slug);
    if (!data) return;
    const mine = new Set(Array.isArray(data.my_reactions) ? data.my_reactions : []);
    document.querySelector('[data-count="love"]').textContent       = data.love       || 0;
    document.querySelector('[data-count="want_to_go"]').textContent = data.want_to_go || 0;
    document.querySelector('[data-count="been_there"]').textContent = data.been_there || 0;
    buttons.forEach(b => b.classList.toggle('is-active', mine.has(b.dataset.reaction)));
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const reaction = btn.dataset.reaction;
      btn.classList.add('just-tapped');
      setTimeout(() => btn.classList.remove('just-tapped'), 350);
      const data = await window.YYP.account.setReaction(slug, reaction);
      if (data) {
        const mine = new Set(Array.isArray(data.my_reactions) ? data.my_reactions : []);
        document.querySelector('[data-count="love"]').textContent       = data.love       || 0;
        document.querySelector('[data-count="want_to_go"]').textContent = data.want_to_go || 0;
        document.querySelector('[data-count="been_there"]').textContent = data.been_there || 0;
        buttons.forEach(b => b.classList.toggle('is-active', mine.has(b.dataset.reaction)));
        if (mine.has(reaction)) {
          window.YYP?.toast?.(
            reaction === 'love'      ? 'Loved! ❤️' :
            reaction === 'want-to-go'? 'Added to your wishlist 🌟' :
                                       'Marked as been there ✓',
            { duration: 2200 }
          );
        }
      }
    });
  });

  paint();
  document.addEventListener('yyp:account-ready', paint);
}


/* ══════════════════════════════════════════════════════════
   PEOPLE ALSO SAVED — collaborative recommendations
══════════════════════════════════════════════════════════ */
async function loadPeopleAlsoSaved(slug) {
  if (!window.YYP?.account?.getPeopleAlsoSaved) return;
  const section = document.getElementById('also-saved-section');
  const grid    = document.getElementById('also-saved-grid');
  if (!section || !grid) return;

  const rows = await window.YYP.account.getPeopleAlsoSaved(slug, 4);
  if (!rows.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fallback = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75';

  grid.innerHTML = rows.map(r => `
    <a href="restaurant.html?slug=${esc(r.slug)}" class="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-brand-yellow hover:-translate-y-1 transition-all" style="text-decoration:none">
      <div class="aspect-square overflow-hidden bg-gray-100">
        <img src="${esc(r.cover_image_url || fallback)}" alt="${esc(r.name)}"
             class="w-full h-full object-cover" loading="lazy"
             onerror="this.src='${fallback}'"/>
      </div>
      <div class="p-3">
        <p class="font-display font-black text-sm text-brand-black truncate">${esc(r.name)}</p>
        <p class="text-xs text-gray-500 truncate">${esc(r.cuisine_type || '')} · ${esc(r.location || '')}</p>
        <p class="text-xs text-yellow-700 font-bold mt-1.5">★ ${r.google_rating || '—'} · ${r.co_save_count} co-save${r.co_save_count === 1 ? '' : 's'}</p>
      </div>
    </a>
  `).join('');
}


/* ── Empty / not-found state ─────────────────────────────
   Completely replaces the page body (except nav) with a friendly empty state.
   This is simpler and more reliable than hiding each dynamic section by ID. */
function showNotFound(slug) {
  document.title = 'Restaurant Not Found — YUMYUMPO';

  /* Remove every <section> on the page (hero, gallery, content, similar, etc.)
     plus the desktop sticky sidebar and mobile action bar. The nav stays. */
  document.querySelectorAll('section, aside, .r-mobile-bar, #r-mobile-bar')
    .forEach(el => el.remove());

  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const safeSlug = slug ? esc(slug) : '';

  /* Restore body so it isn't constrained by the cinematic layout */
  document.body.style.background = '#FAFAFA';
  document.body.style.minHeight  = '100vh';

  const wrap = document.createElement('main');
  wrap.style.cssText = 'min-height:calc(100vh - 80px);display:flex;align-items:center;justify-content:center;padding:6rem 1.5rem 4rem;';
  wrap.innerHTML = `
    <div style="max-width:36rem;width:100%;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:28px;background:#FFD000;margin-bottom:1.5rem;font-size:2.75rem;box-shadow:0 20px 50px rgba(255,208,0,0.35);">🤔</div>
      <p style="font-size:0.7rem;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#E6BB00;margin-bottom:0.75rem;font-family:'Space Grotesk',sans-serif;">Restaurant not found</p>
      <h1 style="font-family:'Space Grotesk',sans-serif;font-weight:900;font-size:clamp(2rem,5vw,3rem);color:#111;line-height:1.1;letter-spacing:-0.02em;margin-bottom:1rem;">
        We couldn't find<br />that restaurant.
      </h1>
      <p style="color:#6B6B6B;font-size:1rem;line-height:1.6;margin-bottom:2rem;max-width:28rem;margin-left:auto;margin-right:auto;">
        ${safeSlug
          ? `<code style="background:#F3F3F3;padding:2px 8px;border-radius:6px;font-size:0.875rem;">${safeSlug}</code> doesn't match anything in our directory yet. It may have been removed, or the URL might be mistyped.`
          : 'No restaurant was specified in the URL.'}
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
        <a href="discover.html" style="display:inline-flex;align-items:center;gap:8px;background:#111;color:#fff;font-weight:700;font-size:0.875rem;padding:14px 24px;border-radius:16px;text-decoration:none;font-family:'Space Grotesk',sans-serif;">
          Browse All Restaurants
        </a>
        <a href="ai-search.html" style="display:inline-flex;align-items:center;gap:8px;background:#FFD000;color:#111;font-weight:700;font-size:0.875rem;padding:14px 24px;border-radius:16px;text-decoration:none;font-family:'Space Grotesk',sans-serif;">
          🍽️ Ask Fred
        </a>
        <a href="index.html" style="display:inline-flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E8E8;color:#111;font-weight:700;font-size:0.875rem;padding:12px 24px;border-radius:16px;text-decoration:none;font-family:'Space Grotesk',sans-serif;">
          Home
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
}


/* ══════════════════════════════════════════════════════════
   RENDER ORCHESTRATOR
══════════════════════════════════════════════════════════ */
function renderPage(r) {
  window.__yypRestaurant = r;
  document.dispatchEvent(new CustomEvent('yyp:restaurant-loaded', { detail: r }));
  updateSEO(r);
  renderHero(r);
  renderGalleryMosaic(r);
  renderAbout(r);
  renderHours(r);
  renderMenu(r);
  renderFoodGallery(r);
  renderMap(r);
  renderSimilar(r);
  renderActionCard(r);
  renderInfoCard(r);
  renderSocialCard(r);
  renderMobileBar(r);
}


/* ══════════════════════════════════════════════════════════
   SEO + STRUCTURED DATA
══════════════════════════════════════════════════════════ */
function updateSEO(r) {
  const title = `${r.name} — YUMYUMPO`;
  const desc  = r.description?.substring(0, 160) || `${r.name} on YUMYUMPO`;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setAttr = (id, val) => { const el = document.getElementById(id); if (el) el.content = val; };

  setText('page-title', title);
  setAttr('meta-desc',  desc);
  setAttr('og-title',   title);
  setAttr('og-desc',    desc);
  setAttr('og-image',   r.cover_image_url || '');
  setAttr('og-url',     window.location.href);
  document.title = title;

  // JSON-LD structured data for Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Restaurant',
    name:       r.name,
    description: r.description,
    image:       r.cover_image_url,
    url:         window.location.href,
    address: r.address ? {
      '@type':         'PostalAddress',
      streetAddress:   r.address,
      addressLocality: r.location,
      addressCountry:  'PH',
    } : undefined,
    telephone:   r.phone,
    servesCuisine: r.cuisine_type,
    aggregateRating: r.google_rating ? {
      '@type':       'AggregateRating',
      ratingValue:   r.google_rating,
      reviewCount:   r.review_count,
      bestRating:    5,
      worstRating:   1,
    } : undefined,
  };
  document.getElementById('structured-data').textContent = JSON.stringify(jsonLd);
}


/* ══════════════════════════════════════════════════════════
   CINEMATIC HERO
══════════════════════════════════════════════════════════ */
function renderHero(r) {
  // Set background image
  const bg = document.getElementById('r-hero-bg');
  if (bg) bg.style.backgroundImage = `url('${r.cover_image_url}')`;

  const today      = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayHrs   = r.hours?.find(h => h.day === today);
  const isOpen     = todayHrs && !todayHrs.closed;
  const openBadge  = isOpen
    ? `<span class="open-badge"><span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Open now · closes ${todayHrs.close}</span>`
    : `<span class="closed-badge">Closed today</span>`;

  const tagsHTML = (r.tags || []).slice(0, 4).map(t =>
    `<span class="r-tag white">${t}</span>`
  ).join('');

  const content = document.getElementById('r-hero-content');
  if (!content) return;

  const logoHTML = r.logo_image_url
    ? `<div style="position:absolute; top:max(80px, calc(env(safe-area-inset-top,0) + 80px)); right:1.5rem; width:84px; height:84px; border-radius:50%; overflow:hidden; border:3px solid rgba(255,255,255,0.85); box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#fff; z-index:5;">
         <img src="${r.logo_image_url}" alt="${r.name} logo" style="width:100%; height:100%; object-fit:cover; display:block;" />
       </div>`
    : '';

  content.innerHTML = `
    ${logoHTML}
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a>
      <span>›</span>
      <a href="discover.html">Discover</a>
      <span>›</span>
      <span style="color:rgba(255,255,255,0.7)">${r.name}</span>
    </nav>

    <!-- Cuisine + open status -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <span class="r-tag white text-xs" style="background:rgba(255,208,0,0.18); border-color:rgba(255,208,0,0.45); color:#FFE066">
        ${r.cuisine_type}
      </span>
      ${openBadge}
    </div>

    <!-- Restaurant name -->
    <h1 class="font-display font-black text-white leading-none tracking-tight mb-3"
        style="font-size: clamp(2.5rem, 7vw, 5rem); letter-spacing: -0.03em; text-shadow: 0 4px 40px rgba(0,0,0,0.5)">
      ${r.name}
    </h1>

    <!-- Tagline -->
    ${r.tagline ? `<p class="text-white/70 font-medium mb-5" style="font-size:1.125rem; max-width:540px">${r.tagline}</p>` : ''}

    <!-- Rating + location row -->
    <div class="flex flex-wrap items-center gap-5 mb-5">
      <div class="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full">
        <span class="text-yellow-400 text-lg leading-none">★</span>
        <span class="font-black text-white">${r.google_rating}</span>
        <span class="text-white/55 text-sm">${(r.review_count || 0).toLocaleString()} Google Reviews</span>
      </div>
      ${r.location ? `
      <div class="flex items-center gap-2 text-white/65 text-sm font-medium">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        </svg>
        ${r.location}
      </div>` : ''}
    </div>

    <!-- Tags -->
    <div class="flex flex-wrap gap-2 mb-6">${tagsHTML}</div>

    <!-- Primary action — single CTA: external website OR get listed funnel -->
    <div class="hero-action-row">
      ${r.website_url
        ? `<a href="${r.website_url}" target="_blank" rel="noopener noreferrer" onclick="trackAction('website_click','${r.id}')" class="hero-btn yellow">${webIcon()} Visit Official Website</a>`
        : `<a href="admin/apply.html?ref=get-listed&restaurant=${encodeURIComponent(r.name || '')}" class="hero-btn yellow">Get this restaurant a website</a>`}
    </div>
  `;

  // Remove skeleton
  const skel = document.getElementById('hero-skeleton');
  if (skel) skel.remove();
}


/* ══════════════════════════════════════════════════════════
   PHOTO GALLERY MOSAIC
══════════════════════════════════════════════════════════ */
function renderGalleryMosaic(r) {
  const mosaic = document.getElementById('gallery-mosaic');
  if (!mosaic) return;

  const imgs = [r.cover_image_url, ...(r.gallery || [])].filter(Boolean).slice(0, 5);
  if (imgs.length < 2) { mosaic.parentElement?.classList.add('hidden'); return; }

  const fallback = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&auto=format&fit=crop&q=80';
  const extra    = imgs.length > 4 ? imgs.length - 4 : 0;

  mosaic.innerHTML = imgs.map((src, i) => {
    if (i === 0) {
      return `
        <div class="gm-photo gm-main" onclick="openGallery(0)">
          <img src="${src}" alt="${r.name}" loading="eager" onerror="this.src='${fallback}'" />
        </div>`;
    }
    if (i === 4 && extra > 0) {
      return `
        <div class="gm-more gm-photo" onclick="openGallery(${i})">
          <img src="${src}" alt="More photos" loading="lazy" onerror="this.src='${fallback}'" />
          <div class="gm-more-overlay">
            <span class="text-white font-black text-2xl">+${extra}</span>
            <span class="text-white/70 text-xs font-semibold">more photos</span>
          </div>
        </div>`;
    }
    return `
      <div class="gm-photo" onclick="openGallery(${i})">
        <img src="${src}" alt="${r.name} gallery ${i}" loading="lazy" onerror="this.src='${fallback}'" />
      </div>`;
  }).join('');
}

window.openGallery = function(idx) {
  /* Lightbox — to be implemented; for now scroll to the gallery section */
  document.getElementById('gallery-section')?.scrollIntoView({ behavior: 'smooth' });
};


/* ══════════════════════════════════════════════════════════
   ABOUT
══════════════════════════════════════════════════════════ */
function renderAbout(r) {
  if (!r.description) return;
  const section  = document.getElementById('about-section');
  const text     = document.getElementById('about-text');
  const toggle   = document.getElementById('about-toggle');
  if (!section || !text) return;

  section.classList.remove('hidden');
  text.textContent = r.description;

  // Show "read more" for long descriptions
  if (r.description.length > 300) {
    text.classList.add('line-clamp-4');
    toggle?.classList.remove('hidden');
  }
}


/* ══════════════════════════════════════════════════════════
   HOURS + OPEN/CLOSED STATUS
══════════════════════════════════════════════════════════ */
function renderHours(r) {
  if (!r.hours?.length) return;
  const section = document.getElementById('hours-section');
  const grid    = document.getElementById('hours-grid');
  const status  = document.getElementById('open-status');
  if (!section || !grid) return;

  section.classList.remove('hidden');

  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayHrs = r.hours.find(h => h.day === today);
  const isOpen   = todayHrs && !todayHrs.closed;

  if (status) {
    status.innerHTML = isOpen
      ? `<span class="open-badge"><span style="width:6px;height:6px;border-radius:50%;background:#22C55E;display:inline-block;margin-right:4px"></span>Open now · closes ${todayHrs.close}</span>`
      : `<span class="closed-badge">Closed today</span>`;
  }

  grid.innerHTML = r.hours.map(h => `
    <div class="hours-row ${h.day === today ? 'today' : ''}">
      <span class="text-sm font-bold text-brand-black">
        ${h.day}
        ${h.day === today ? '<span class="text-xs font-semibold ml-1" style="color:#8A6900">(Today)</span>' : ''}
      </span>
      <span class="text-sm font-semibold ${h.closed ? 'text-red-400' : 'text-gray-400'}">
        ${h.closed ? 'Closed' : `${h.open} – ${h.close}`}
      </span>
    </div>
  `).join('');
}


/* ══════════════════════════════════════════════════════════
   MENU
══════════════════════════════════════════════════════════ */
function renderMenu(r) {
  if (!r.menu_categories?.length) return;
  const section   = document.getElementById('menu-section');
  const container = document.getElementById('menu-container');
  if (!section || !container) return;
  section.classList.remove('hidden');

  container.innerHTML = r.menu_categories.map(cat => `
    <div>
      <div class="flex items-center gap-3 mb-5">
        <h3 class="r-section-title text-lg">${cat.name}</h3>
        <div class="flex-1 h-px bg-gray-100"></div>
        <span class="text-xs font-bold text-gray-400">${cat.items.length} items</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${cat.items.map(item => menuCard(item)).join('')}
      </div>
    </div>
  `).join('');
}

function menuCard(item) {
  const tagsHTML = (item.tags || []).filter(t => t).map(t =>
    `<span class="menu-tag">${t}</span>`
  ).join('');

  const priceNote = item.price_note
    ? `<span class="text-xs text-gray-400 font-medium ml-1">/ ${item.price_note}</span>`
    : '';

  return `
    <div class="menu-card">
      <div class="menu-card-image">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" loading="lazy"
               onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#F3F3F3;font-size:2.5rem\\'>🍽️</div>'" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#F3F3F3;font-size:2.5rem">🍽️</div>`
        }
        ${tagsHTML.length ? `<div style="position:absolute;top:10px;left:10px;display:flex;gap:5px;flex-wrap:wrap">${tagsHTML}</div>` : ''}
      </div>
      <div class="menu-card-body">
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <h4 class="font-bold text-brand-black text-sm leading-tight">${item.name}</h4>
          <div class="shrink-0 text-right">
            <span class="menu-price">${item.price}</span>
            ${priceNote}
          </div>
        </div>
        <p class="text-gray-400 text-xs leading-relaxed line-clamp-2">${item.description || ''}</p>
      </div>
    </div>
  `;
}


/* ══════════════════════════════════════════════════════════
   FOOD GALLERY
══════════════════════════════════════════════════════════ */
function renderFoodGallery(r) {
  if (!r.food_gallery?.length) return;
  const section = document.getElementById('food-gallery-section');
  const grid    = document.getElementById('food-gallery-grid');
  if (!section || !grid) return;

  section.classList.remove('hidden');
  const photos = r.food_gallery.slice(0, 6);

  grid.innerHTML = photos.map((src, i) => `
    <div class="fg-photo" onclick="openGallery(${i})" title="View photo">
      <img src="${src}" alt="Food photo ${i + 1}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&auto=format&fit=crop&q=75'" />
    </div>
  `).join('');
}


/* ══════════════════════════════════════════════════════════
   MAP + LOCATION
══════════════════════════════════════════════════════════ */
function renderMap(r) {
  const section = document.getElementById('map-section');
  const embed   = document.getElementById('map-embed');
  const addrEl  = document.getElementById('address-text');
  const dirLink = document.getElementById('directions-link');
  if (!section) return;

  /* Derive a query for embed / directions from coords or address. */
  let mapQuery = '';
  if (r.latitude && r.longitude)  mapQuery = `${r.latitude},${r.longitude}`;
  else if (r.address)              mapQuery = r.address;
  else if (r.location)             mapQuery = `${r.name || ''} ${r.location}`.trim();

  const embedUrl =
    r.map_embed ||
    (mapQuery ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed` : '');
  const dirUrl =
    r.directions_url ||
    (mapQuery ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}` : '');

  if (embedUrl || r.address) section.classList.remove('hidden');

  if (embedUrl && embed) {
    embed.style.padding = '0';
    embed.innerHTML = `
      <iframe
        src="${embedUrl}"
        width="100%" height="320"
        style="border:0; display:block; border-radius: 1rem;"
        allowfullscreen loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>`;
  }

  if (r.address && addrEl) addrEl.textContent = r.address;

  if (dirUrl && dirLink) {
    dirLink.href = dirUrl;
    dirLink.classList.remove('hidden');
  }
}


/* ══════════════════════════════════════════════════════════
   SIMILAR RESTAURANTS
══════════════════════════════════════════════════════════ */
function renderSimilar(r) {
  if (!r.similar?.length) return;
  const section = document.getElementById('similar-section');
  const grid    = document.getElementById('similar-grid');
  if (!section || !grid) return;

  const cards = r.similar
    .map(slug => RESTAURANTS[slug])
    .filter(Boolean)
    .slice(0, 3);

  if (!cards.length) return;
  section.classList.remove('hidden');

  grid.innerHTML = cards.map(s => `
    <div class="similar-card" onclick="window.location.href='restaurant.html?slug=${s.slug}'">
      <div class="similar-card-image">
        <img src="${s.cover_image_url}" alt="${s.name}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=75'" />
      </div>
      <div class="p-3">
        <p class="text-xs font-bold text-gray-400 mb-0.5">${s.cuisine_type}</p>
        <h4 class="font-display font-black text-brand-black text-sm leading-tight mb-1">${s.name}</h4>
        <div class="flex items-center gap-1">
          <span class="text-yellow-400 text-sm">★</span>
          <span class="text-xs font-black text-brand-black">${s.google_rating}</span>
          <span class="text-xs text-gray-400">· ${s.location}</span>
        </div>
      </div>
    </div>
  `).join('');
}


/* ══════════════════════════════════════════════════════════
   SIDEBAR — ACTION CARD
══════════════════════════════════════════════════════════ */
function renderActionCard(r) {
  const card    = document.getElementById('action-card');
  const buttons = document.getElementById('action-buttons');
  if (!card || !buttons) return;

  card.classList.remove('hidden');

  const websiteBtn = r.website_url
    ? `<a href="${r.website_url}" target="_blank" rel="noopener noreferrer"
         onclick="trackAction('website_click','${r.id}')"
         class="r-action-btn yellow">
        ${webIcon()}
        Visit Official Website
      </a>`
    : `<a href="admin/apply.html?ref=get-listed&restaurant=${encodeURIComponent(r.name || '')}"
         class="r-action-btn yellow">
        Get this restaurant a website
      </a>`;

  if (!r.website_url) {
    const heading = card.querySelector('h3');
    const sub     = card.querySelector('p');
    if (heading) heading.textContent = 'No website yet?';
    if (sub)     sub.textContent     = 'YUMYUMPO can build and host a website for this restaurant.';
  }

  /* Follow button — only renders when account.js is on the page. */
  const followBtn = `
    <button type="button" class="r-action-btn outline" id="follow-btn" data-slug="${r.slug}">
      <span class="follow-icon">+</span>
      <span class="follow-label">Follow</span>
    </button>
  `;

  buttons.innerHTML = websiteBtn + followBtn;
  wireFollowButton(r.slug);
}

function wireFollowButton(slug) {
  const btn = document.getElementById('follow-btn');
  if (!btn) return;

  function paint() {
    const isFol = window.YYP?.account?.isFollowing?.(slug);
    btn.classList.toggle('is-following', !!isFol);
    btn.querySelector('.follow-icon').textContent  = isFol ? '✓' : '+';
    btn.querySelector('.follow-label').textContent = isFol ? 'Following' : 'Follow updates';
  }

  paint();
  document.addEventListener('yyp:account-ready',   paint);
  document.addEventListener('yyp:follows-changed', paint);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const wasFollowing = window.YYP?.account?.isFollowing?.(slug);
    await window.YYP?.account?.toggleFollow?.(slug);
    paint();
    btn.disabled = false;
    if (!wasFollowing && window.YYP?.account?.isFollowing?.(slug)) {
      window.YYP?.toast?.('Following — you\'ll see their updates in your feed', { duration: 3500 });
    }
  });
}


/* ══════════════════════════════════════════════════════════
   SIDEBAR — INFO CARD
══════════════════════════════════════════════════════════ */
function renderInfoCard(r) {
  const card = document.getElementById('info-card');
  const list = document.getElementById('info-list');
  if (!card || !list) return;

  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayHrs = r.hours?.find(h => h.day === today);
  const rows = [
    r.cuisine_type && { icon: '🍽️', label: 'Cuisine',       value: r.cuisine_type },
    r.location     && { icon: '📍', label: 'Location',      value: r.location },
    todayHrs       && { icon: '🕐', label: "Today's Hours", value: todayHrs.closed ? 'Closed today' : `${todayHrs.open} – ${todayHrs.close}` },
    r.website_url  && { icon: '🌐', label: 'Website',       value: 'View website →', href: r.website_url },
  ].filter(Boolean);

  if (!rows.length) return;
  card.classList.remove('hidden');

  list.innerHTML = rows.map(row => `
    <div class="info-row border-b border-gray-100 last:border-0">
      <div class="info-icon">${row.icon}</div>
      <div class="py-1">
        <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">${row.label}</p>
        ${row.href
          ? `<a href="${row.href}" target="_blank" rel="noopener" class="text-sm font-bold text-brand-black underline underline-offset-2">${row.value}</a>`
          : `<p class="text-sm font-bold text-brand-black">${row.value}</p>`
        }
      </div>
    </div>
  `).join('');
}


/* ══════════════════════════════════════════════════════════
   SIDEBAR — SOCIAL CARD
══════════════════════════════════════════════════════════ */
/* renderSocialCard intentionally removed — YUMYUMPO is a discovery + website
   platform; we don't redirect users to third-party social profiles. */
function renderSocialCard() {}


/* ══════════════════════════════════════════════════════════
   MOBILE BAR
══════════════════════════════════════════════════════════ */
function renderMobileBar(r) {
  const website = document.getElementById('m-website');
  const claim   = document.getElementById('m-claim');

  if (r.website_url) {
    if (website) {
      website.classList.remove('hidden');
      website.onclick = () => {
        trackAction('website_click', r.id);
        window.open(r.website_url, '_blank');
      };
    }
  } else if (claim) {
    claim.classList.remove('hidden');
    claim.href = `admin/apply.html?ref=get-listed&restaurant=${encodeURIComponent(r.name || '')}`;
  }
}


/* ══════════════════════════════════════════════════════════
   NAV SCROLL EFFECT
══════════════════════════════════════════════════════════ */
function initNavScroll() {
  const nav = document.getElementById('r-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('solid', window.scrollY > 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


/* ══════════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════════ */
function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.r-reveal').forEach(el => observer.observe(el));
}


/* ══════════════════════════════════════════════════════════
   SUBTLE PARALLAX ON HERO
══════════════════════════════════════════════════════════ */
function initParallax() {
  const bg = document.getElementById('r-hero-bg');
  if (!bg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) bg.style.transform = `translateY(${y * 0.3}px)`;
  }, { passive: true });
}


/* ══════════════════════════════════════════════════════════
   SVG ICON LIBRARY
══════════════════════════════════════════════════════════ */
const webIcon = () => `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>`;
const phoneIcon = () => `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/></svg>`;
const waIcon = () => `<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const messengerIcon = () => `<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/></svg>`;
const igIcon = () => `<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>`;
const fbIcon = () => `<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;


/* ══════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════ */
function trackPageView(r) {
  window.db?.trackAnalyticsEvent('profile_view', r.id, { slug: r.slug });
}

window.trackAction = function (eventType, restaurantId) {
  window.db?.trackAnalyticsEvent(eventType, restaurantId);
};
