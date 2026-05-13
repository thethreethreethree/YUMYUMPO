-- ============================================================
-- YUMYUMPO — Seed: Maria's Kitchen (reference / demo)
-- Restores Maria's Kitchen to its canonical "Maria's Kitchen demo"
-- state so it can be used as the template every other restaurant
-- aspires to match. Idempotent — re-running wipes & rewrites.
-- ============================================================

DO $$
DECLARE v_rest UUID;
        v_cat_sig UUID;
        v_cat_fav UUID;
        v_cat_breakfast UUID;
BEGIN
  /* 1. Upsert the restaurant row by slug ---------------------- */
  INSERT INTO restaurants (
    slug, name, tagline, description, cuisine_type, location, address,
    latitude, longitude, google_rating, review_count,
    cover_image_url, logo_image_url, website_url,
    phone, whatsapp_url, messenger_url, instagram_url, facebook_url,
    has_yumyumpo_site, is_featured, is_active,
    ai_summary,
    gallery_urls, food_gallery_urls
  ) VALUES (
    'marias-kitchen', 'Maria''s Kitchen',
    'Filipino comfort food, made with heart.',
    'Maria''s Kitchen has been at the heart of El Nido''s food culture for over 15 years. Every single dish is made from scratch using locally sourced ingredients and treasured family recipes passed down through three generations. Step through our doors and feel instantly at home — this is the kind of food that makes you call your mum after. Regulars swear by the sinigang, first-timers are floored by the lechon kawali, and everyone leaves with the next reservation already in mind.',
    'Filipino', 'El Nido, Palawan',
    '123 Corong-Corong Road, El Nido, Palawan 5313',
    11.174, 119.407, 4.8, 1238,
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=85',
    NULL, NULL,
    '+63 912 345 6789', 'https://wa.me/639123456789', 'https://m.me/mariaskitchenelnido',
    'https://instagram.com/mariaskitchen.elnido', 'https://facebook.com/mariaskitchen',
    TRUE, TRUE, TRUE,
    'Beloved local haunt serving authentic Filipino comfort food. A go-to for backpackers and families — the kind of place that feels like home.',
    ARRAY[
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80'
    ],
    ARRAY[
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=500&auto=format&fit=crop&q=75',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=75'
    ]
  )
  ON CONFLICT (slug) DO UPDATE SET
    name              = EXCLUDED.name,
    tagline           = EXCLUDED.tagline,
    description       = EXCLUDED.description,
    cuisine_type      = EXCLUDED.cuisine_type,
    location          = EXCLUDED.location,
    address           = EXCLUDED.address,
    latitude          = EXCLUDED.latitude,
    longitude         = EXCLUDED.longitude,
    google_rating     = EXCLUDED.google_rating,
    review_count      = EXCLUDED.review_count,
    cover_image_url   = EXCLUDED.cover_image_url,
    phone             = EXCLUDED.phone,
    whatsapp_url      = EXCLUDED.whatsapp_url,
    messenger_url     = EXCLUDED.messenger_url,
    instagram_url     = EXCLUDED.instagram_url,
    facebook_url      = EXCLUDED.facebook_url,
    has_yumyumpo_site = EXCLUDED.has_yumyumpo_site,
    is_featured       = EXCLUDED.is_featured,
    is_active         = EXCLUDED.is_active,
    ai_summary        = EXCLUDED.ai_summary,
    gallery_urls      = EXCLUDED.gallery_urls,
    food_gallery_urls = EXCLUDED.food_gallery_urls,
    updated_at        = NOW()
  RETURNING id INTO v_rest;

  /* 2. Wipe and reseed child data ------------------------------ */
  DELETE FROM menu_items       WHERE restaurant_id = v_rest;
  DELETE FROM menu_categories  WHERE restaurant_id = v_rest;
  DELETE FROM operating_hours  WHERE restaurant_id = v_rest;
  DELETE FROM restaurant_tags  WHERE restaurant_id = v_rest;

  /* 3. Vibe tags ----------------------------------------------- */
  INSERT INTO restaurant_tags (restaurant_id, tag_name) VALUES
    (v_rest, 'Local Favorite'),
    (v_rest, 'Family-Friendly'),
    (v_rest, 'Budget-Friendly'),
    (v_rest, 'Backpacker-Approved'),
    (v_rest, 'Hidden Gem');

  /* 4. Hours --------------------------------------------------- */
  INSERT INTO operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed) VALUES
    (v_rest, 'Monday',    '07:00', '21:00', FALSE),
    (v_rest, 'Tuesday',   '07:00', '21:00', FALSE),
    (v_rest, 'Wednesday', '07:00', '21:00', FALSE),
    (v_rest, 'Thursday',  '07:00', '21:00', FALSE),
    (v_rest, 'Friday',    '07:00', '22:00', FALSE),
    (v_rest, 'Saturday',  '08:00', '22:00', FALSE),
    (v_rest, 'Sunday',    '08:00', '20:00', FALSE);

  /* 5. Menu categories + items --------------------------------- */
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rest, 'Signature Dishes', 0) RETURNING id INTO v_cat_sig;

  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rest, 'Crowd Favourites', 1) RETURNING id INTO v_cat_fav;

  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rest, 'Breakfast Favourites', 2) RETURNING id INTO v_cat_breakfast;

  /* — Signature Dishes — */
  INSERT INTO menu_items (restaurant_id, menu_category_id, name, description, price, price_note, image_url, gallery_urls, tags, sort_order) VALUES
    (v_rest, v_cat_sig, 'Sinigang na Baboy',
     'Tender pork belly in a tangy tamarind broth with fresh morning vegetables. Served with steamed rice.',
     '₱280', 'good for 2',
     'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Best Seller','Spicy'], 0),
    (v_rest, v_cat_sig, 'Crispy Lechon Kawali',
     'Deep-fried pork belly, impossibly crispy outside, meltingly tender inside. Served with house liver sauce.',
     '₱320', NULL,
     'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Must Try'], 1),
    (v_rest, v_cat_sig, 'Kare-Kare',
     'Oxtail and vegetables braised in rich peanut sauce. Served with fermented shrimp paste on the side.',
     '₱350', 'good for 2',
     'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1516684732162-798a0062be99?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Chef Special'], 2);

  /* — Crowd Favourites — */
  INSERT INTO menu_items (restaurant_id, menu_category_id, name, description, price, price_note, image_url, gallery_urls, tags, sort_order) VALUES
    (v_rest, v_cat_fav, 'Adobo Manok',
     'Chicken slow-braised in soy, vinegar, garlic and bay leaf. Served with garlic rice.',
     '₱220', NULL,
     'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Crowd Pleaser'], 0),
    (v_rest, v_cat_fav, 'Pancit Bihon',
     'Stir-fried thin rice noodles with chicken, shrimp, and a confetti of vegetables.',
     '₱200', 'good for 2',
     'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Family Pick'], 1),
    (v_rest, v_cat_fav, 'Halo-Halo',
     'A tropical festival in a glass — shaved ice, beans, ube ice cream, leche flan, and a rainbow of fruits.',
     '₱180', NULL,
     'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Refreshing'], 2);

  /* — Breakfast Favourites — */
  INSERT INTO menu_items (restaurant_id, menu_category_id, name, description, price, price_note, image_url, gallery_urls, tags, sort_order) VALUES
    (v_rest, v_cat_breakfast, 'Tapsilog',
     'Cured beef tapa, garlic fried rice, and a sunny-side-up egg. The classic Filipino breakfast.',
     '₱180', NULL,
     'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Morning Staple'], 0),
    (v_rest, v_cat_breakfast, 'Bangsilog',
     'Crispy fried milkfish, garlic fried rice, and egg. A Philippine breakfast institution.',
     '₱160', NULL,
     'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700&auto=format&fit=crop&q=80',
     ARRAY['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=700&auto=format&fit=crop&q=80'],
     ARRAY['Popular'], 1);
END $$;

SELECT pg_notify('pgrst', 'reload schema');
