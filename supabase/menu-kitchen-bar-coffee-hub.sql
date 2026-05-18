-- ============================================================
-- YUMYUMPO — Digital Menu import
-- Restaurant: Kitchen, Bar & Coffee Hub  (slug: kitchen-bar-coffee-hub)
-- Extracted from owner-supplied menu photos.
-- Run in the Supabase SQL Editor. Replaces the existing menu.
-- ============================================================
DO $$
DECLARE
  v_rid UUID;
  v_cat UUID;
BEGIN
  SELECT id INTO v_rid FROM restaurants WHERE slug ILIKE 'kitchen-bar-coffee-hub';
  IF v_rid IS NULL THEN
    RAISE EXCEPTION 'Restaurant with slug kitchen-bar-coffee-hub not found';
  END IF;

  /* wipe the current menu, then rebuild */
  DELETE FROM menu_items      WHERE restaurant_id = v_rid;
  DELETE FROM menu_categories WHERE restaurant_id = v_rid;

  -- ── Starters & Snacks ──────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Starters & Snacks', 0) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Fries', 'Golden Fried French Fries, Sriracha Mayonnaise Dip', '₱180', NULL, 0),
    (v_cat, v_rid, 'Vegetable Spring Rolls', 'Sauteed Mixed Vegetables Wrapped in Pastry Wrapper, Sweet Chili Sauce', '₱250', NULL, 1),
    (v_cat, v_rid, 'Beef Spring Rolls', 'Deep Fried Beef Wrapped in Pastry Wrapper, Sweet Chili Sauce', '₱350', NULL, 2),
    (v_cat, v_rid, 'Quesadilla', 'Mozzarella and Cheddar Cheese, Tomato Salsa. Adds On: Beef ₱165 | Chicken ₱145', '₱230', NULL, 3),
    (v_cat, v_rid, 'Fish & Chips', 'Deep Fried Beer Battered Pangasius, Crispy Fries, Tartare Sauce', '₱370', NULL, 4),
    (v_cat, v_rid, 'Hub''s Nachos', 'Spiced Beef, Cheese Sauce, Cilantro, Tomato Salsa, Jalapeno, Pickled Onion and Lettuce', '₱380', NULL, 5),
    (v_cat, v_rid, 'Buffalo Cauliflower', 'Crispy Deep Fried Cauliflower in Beer Batter, Sweet, Tangy & Spicy Buffalo Sauce', '₱340', NULL, 6),
    (v_cat, v_rid, 'Beef Taco', 'Seared Beef, Fresh Lettuce, Cilantro, Tomato Salsa, Seared Pineapple, Homemade Soft Shell Taco', '₱380', NULL, 7),
    (v_cat, v_rid, 'Chicken Kebobs', 'Spiced Chicken Tenders, Capsicum, Onions, Tomatoes, Sour Cream Dip', '₱470', NULL, 8),
    (v_cat, v_rid, 'Calamari Fritti', 'Local Squid Coated with Polenta Flour, Aioli Dip', '₱390', NULL, 9),
    (v_cat, v_rid, 'Chicken Wings', 'Choice of Flavor: Salted Egg | Korean BBQ | Original or Parmesan', '₱430', NULL, 10);

  -- ── Breakfast ──────────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Breakfast', 1) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Hub''s Breakfast', 'Baked beans and Cheese Gratin on Baked Potato, Simple Salad, Seared Tomato Wedges, Eggs Your Way, Bacon, Sliced Tropical Fruit. + Spiced Beef ₱165 | Seared Chicken ₱145', '₱459', NULL, 0),
    (v_cat, v_rid, 'English Breakfast', 'Sausage, Bacon, Seared Tomato, Sauteed Mushroom, Egg your way, Baked Beans, Toast, Water Spinach, Jam and Butter', '₱629', NULL, 1),
    (v_cat, v_rid, 'Vegan Scramble on Toast', 'Sourdough Toast, Sauteed Tofu and Bell Pepper, Seared Tomato Gremolata', '₱280', NULL, 2),
    (v_cat, v_rid, 'Omelette', 'Tomato | Onion | Bell Pepper, Served alongside Sourdough Toast & Butter. Adds On: Bacon ₱199', '₱299', NULL, 3),
    (v_cat, v_rid, 'Ube French Toast', 'Homemade Loaf on Egg Custard Butter, Purple Yum Filling, Fresh Mango, Whipped Cream, Frozen Berries', '₱380', NULL, 4),
    (v_cat, v_rid, 'Vegan English', 'Sourdough Toast, Roasted Tomatoes, Sauteed Onion and Mushrooms, Baked Beans, Roasted Eggplant, Garlic Water Spinach', '₱390', NULL, 5),
    (v_cat, v_rid, 'House Chorizo Shakshuka', 'Egg, House Cured Chorizo, Onions, Spiced Tomato Sauce, Red Beans & Served with Sourdough Toast', '₱470', NULL, 6),
    (v_cat, v_rid, 'Breakfast Burrito', 'Scrambled Eggs, Baked Beans in Tomato Sauce, Potato Hash, Cheddar Cheese in Homemade Flour Tortilla. + Spiced Beef ₱165 | Seared Chicken ₱145', '₱380', NULL, 7),
    (v_cat, v_rid, 'Eggs & Toast', '2 Eggs your way, White Toast, Butter & Jam', '₱250', NULL, 8),
    (v_cat, v_rid, 'Tropical Smoothie Bowl', 'Frozen Pineapple & Banana, Coconut Milk, Granola, Hydrated Chia Seeds', '₱388', NULL, 9),
    (v_cat, v_rid, 'Swirl Smoothie Bowl', 'Granola, Pureed Frozen Mango, Banana, Yogurt, Chia Seeds', '₱388', NULL, 10),
    (v_cat, v_rid, 'Ube Waffles', 'Fluffy Waffle Infused with Purple Yum Topped with Banana Jam & Whipped Cream', '₱390', NULL, 11),
    (v_cat, v_rid, 'Fruit Plate', 'Seasonal Tropical Fruits Platter', '₱410', NULL, 12),
    (v_cat, v_rid, 'Truffle Eggs Benedict', 'Sourdough English Muffin, Truffle Hollandaise, Poached Egg', '₱380', NULL, 13),
    (v_cat, v_rid, 'Salted Egg Chicken and Waffles', 'Classic Waffle, Chicken Tenders Dusted with Salted Egg Powder, Served with Savory Gravy', '₱440', NULL, 14);

  -- ── Breakfast Bagels ───────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Breakfast Bagels', 2) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Vegetarian Bagel', 'Roasted Zucchini, Eggplant, Tomato, Malunggay Gremolata, Pesto', '₱360', NULL, 0),
    (v_cat, v_rid, 'Breakfast Bagel Sandwich', 'Bacon, Fried Egg, Roasted Tomato, Sriracha Mayo, Cream Cheese', '₱390', NULL, 1),
    (v_cat, v_rid, 'Smoked Salmon Bagel', 'Seeded Homemade Bagel, Cream Cheese, Smoked Salmon, Caper, Tomato', '₱410', NULL, 2),
    (v_cat, v_rid, 'Sweet Bagel', 'Peanut Butter & Chocolate | Banana Slices | Frozen Blueberry | Homemade Bagel', '₱340', NULL, 3);

  -- ── Filipino Breakfast ─────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Filipino Breakfast', 3) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Arroz Caldo', 'Tender Chicken, Ginger & Lemon Grass Broth, Poached Egg', '₱280', NULL, 0),
    (v_cat, v_rid, 'Tocilog', 'Fried Sweet Cured Chicken, Fried Egg, Garlic Rice, Tomato Salsa, Vinegar', '₱350', NULL, 1),
    (v_cat, v_rid, 'Longsilog', 'Local Sausage, Fried Egg, Garlic Rice, Pickled Papaya, Vinegar', '₱355', NULL, 2),
    (v_cat, v_rid, 'Tapsilog', 'Seared Marinated Beef in Soy Garlic, Fried Egg, Garlic Rice, Pickled Papaya, Vinegar', '₱360', NULL, 3),
    (v_cat, v_rid, 'Bangsilog', 'Deep Fried Milk Fish, Fried Egg, Garlic Rice, Pickled Papaya, Vinegar', '₱380', NULL, 4),
    (v_cat, v_rid, 'Hotsilog', 'Seared Local Hotdogs, Fried Egg, Garlic Rice, Pickled Papaya', '₱330', NULL, 5);

  -- ── Burger & Sandwich ──────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Burger & Sandwich', 4) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Ham & Cheese Sandwich', 'Pan Grilled with Butter, Cheddar and Mozzarella Cheese, Sweet Pork Ham, Crispy Fries, Sriracha Mayo Dipping Sauce', '₱400', NULL, 0),
    (v_cat, v_rid, 'Hub''s Burger', 'Beef Pattie, Lettuce, Cheddar Cheese, Seared Pineapple, Seared Onion, Egg, Crispy Fries, Sriracha Mayonnaise dip', '₱495', NULL, 1),
    (v_cat, v_rid, 'Adobo Club Sandwich', 'Grilled Chicken Adobo, Bacon, Lettuce, Pesto Sauce, Tomato, Mayonnaise, Egg, Crispy Fries, Sriracha Mayo Dipping Sauce', '₱530', NULL, 2),
    (v_cat, v_rid, 'Caesar Wrap', 'Crispy Local Fish Fingers, Lettuce, Parmesan Cheese, Caesar Dressing', '₱410', NULL, 3),
    (v_cat, v_rid, 'Tuna Sandwich', 'Tuna Spread, Homemade Sourdough, Fries, Sriracha Mayo Dip', '₱360', NULL, 4),
    (v_cat, v_rid, 'Pili Cheese', 'Seared Marinated Beef, Bell Pepper & Onion, Local Cheddar, Fries, Lettuce, Honey Lemon Dressing, Homemade Sourdough', '₱420', NULL, 5);

  -- ── Salads ─────────────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Salads', 5) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Chef''s Salad', 'Balsamic Vinaigrette, Slaw, Lettuce, Onion, Tomatoes, Cucumber', '₱350', NULL, 0),
    (v_cat, v_rid, 'Caesar Salad', 'Fresh Lettuce, Croutons, Bacon Bits, Parmesan, Caesar Dressing. Adds On: Chicken ₱145 | Shrimp ₱195', '₱370', NULL, 1),
    (v_cat, v_rid, 'Mango Cilantro', 'Honey Lemon Dressing, Fresh Lettuce, Diced Mangoes, Goji Berries, Cashew', '₱380', NULL, 2);

  -- ── Mains ──────────────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Mains', 6) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Vegetable Fajitas', 'Stir Fried Vegetables in Spices & Mayonnaise, Lettuce, Warm Tortilla, Tomato Salsa. Adds On: Chicken ₱145 | Shrimp ₱195', '₱320', NULL, 0),
    (v_cat, v_rid, 'Green Thai Curry Vegetables', 'Green Curry Sauce, Coconut Milk, Eggplant, Pumpkin, Chickpea, Served with Rice. Adds On: Chicken ₱145 | Shrimp ₱195', '₱330', NULL, 1),
    (v_cat, v_rid, 'Chicken Tikka Masala', 'Leg & Thigh Fillet Marinated in Spices and Homemade Yogurt, Masala Sauce. Choice of: Turmeric Rice, Plain Rice or Tortilla Bread', '₱590', NULL, 2),
    (v_cat, v_rid, 'Sizzling Beef Braised Pares', 'Braised Beef Chunks in Sweet and Savory Spiced Sauce, Served with Garlic Rice, Egg and Buttered Vegetable', '₱480', NULL, 3),
    (v_cat, v_rid, 'Beef Rendang', 'Slow braised Beef Stew with Fresh Herbs and Spices, Served with Rice or Flat Bread', '₱460', NULL, 4),
    (v_cat, v_rid, 'Hainanese Chicken', 'Poached Chicken in Ginger and Aromatics, Served with Rice, Chili Garlic, and Ginger Leek Paste', '₱490', NULL, 5),
    (v_cat, v_rid, 'Seafood Tom Yum', 'Hot and Sour Broth with Local Mussel, Local caught Fish and Mushrooms', '₱260', NULL, 6),
    (v_cat, v_rid, 'Vegetable Pad Thai', 'Sweet and Savory Stir Fried Noodles Tossed with Crispy Tofu. Adds On: Chicken ₱145 | Shrimp ₱195', '₱380', NULL, 7),
    (v_cat, v_rid, 'Shrimp Laksa', 'Rich Coconut Spiced Broth, Rice Noodles, Local Bokchoy, Tofu, Local Shrimp and served with Local Lime', '₱470', NULL, 8),
    (v_cat, v_rid, 'Ayam Goreng', 'Indonesian Boneless Fried Chicken, Nasi Goreng, Fried Egg, Sambal', '₱460', NULL, 9);

  -- ── Filipino Favourites ────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Filipino Favourites', 7) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Garlic Kangkong', 'Stir Fried in Garlic and Onion, Soy, Tofu', '₱250', NULL, 0),
    (v_cat, v_rid, 'Vegetable Pancit', 'Choice of Canton or Bihon, Stir Fried Mixed Vegetables, Oyster Sauce, Soy Sauce, Tofu. Adds On: Chicken ₱145 | Shrimp ₱195', '₱295', NULL, 1),
    (v_cat, v_rid, 'Chopsuey', 'Stir Fried Mixed Vegetables in Oyster Sauce, Tofu. Adds On: Chicken ₱145 | Shrimp ₱195', '₱370', NULL, 2),
    (v_cat, v_rid, 'Chicken Adobo sa Latik', 'Leg & Thigh Fillet, Soy Garlic Sauce, Coconut Milk', '₱390', NULL, 3),
    (v_cat, v_rid, 'Kare-Kare', 'Peanut and Shrimp Paste Sauce, Banana Blossom, Eggplant, String Beans, Bok choy', '₱420+', 'Beef ₱520 · Shrimp ₱490 · Tofu & Vegetables ₱420', 4),
    (v_cat, v_rid, 'Watermelon Sinigang', 'Tamarind & Watermelon, Water Spinach, Taro, Tomatoes, Radish, Eggplant, Onion, String Beans, Petchay', '₱465+', 'Pork ₱465 · Beef ₱520 · Shrimp ₱570', 5),
    (v_cat, v_rid, 'Chicken Inasal', 'Grilled Bacolod''s Style Leg & Thigh Fillet, Served with Rice, Atchara & Calamansi Soy', '₱470', NULL, 6),
    (v_cat, v_rid, 'Tortang Talong', 'Roasted Eggplant Omelette | Tomato Salsa | Calamansi Soy', '₱350', NULL, 7),
    (v_cat, v_rid, 'Sizzling Sisig', 'Grilled Pork Mask, Onion, Chili, Soy Seasoning, Egg', '₱400', NULL, 8),
    (v_cat, v_rid, 'Chicken Binakol', 'Chicken Breast Boiled in Coconut Ginger Broth, Chayote, Lemon Grass, Coconut Meat, Malunggay Leaves', '₱360', NULL, 9),
    (v_cat, v_rid, 'Sizzling Bangus', 'Seasoned Bangus Meat & Belly, Onion, Chili', '₱440', NULL, 10);

  -- ── Rice Bowls ─────────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Rice Bowls', 8) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Chicken Ala King', 'Deep Fried Chicken Tenders, Creamy Sauce with Carrots, Mushroom, Chayote, Served with Fried Rice', '₱350', NULL, 0),
    (v_cat, v_rid, 'Chicken Salpicao', 'Seared Chicken Tenders Glazed with Garlicky Soy Sauce, Served with Sauteed Vegetable, Egg and Fried Rice', '₱370', NULL, 1),
    (v_cat, v_rid, 'Chicken Teriyaki', 'Seared Chicken Tenders Glazed with Homemade Teriyaki Sauce, Served with Garlic Kangkong, Egg & Fried Rice', '₱370', NULL, 2),
    (v_cat, v_rid, 'Basil Chicken', 'Deep Fried Chicken Tenders Stir Fried with Young Corn, String Beans, Basil and Kra Pao Sauce, Served with Egg and Fried Rice', '₱380', NULL, 3),
    (v_cat, v_rid, 'Creamy Mushroom Pepper Beef', 'Seared Beef Strips Tossed in Creamy Pepper Sauce and Butter, Served with Egg, Sauteed Vegetables and Fried Rice', '₱420', NULL, 4),
    (v_cat, v_rid, 'General Tso', 'Deep Fried Chicken, Sweet Savory Orange Sauce, Buttered Vegetables, Egg Fried Rice', '₱399', NULL, 5),
    (v_cat, v_rid, 'Tofu Bicol Express', 'Crispy Tofu in Spicy Coconut Ginger Sauce, Served with Sauteed Vegetables and Fried Rice', '₱350', NULL, 6),
    (v_cat, v_rid, 'Mushroom Medley', 'Sauteed Local Mushroom in Soy Glaze, Served with Sauteed Vegetables, Fried Banana & Fried Rice', '₱350', NULL, 7),
    (v_cat, v_rid, 'Pork Bacon BBQ', 'Seared Marinated Pork Bacon Strips Tossed in BBQ Sauce, Served with Sauteed Vegetables and Fried Rice', '₱390', NULL, 8),
    (v_cat, v_rid, 'Chao Fan', 'Vegetable Chinese Style Fried Rice, Served with Vegetable or Beef Spring Rolls', '₱395', NULL, 9);

  -- ── Pizza ──────────────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Pizza', 9) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Margherita', 'You guessed it! Mozzarella, Tomato, Basil', '₱550', 'Available 2pm–10pm', 0),
    (v_cat, v_rid, 'Hawaiian', 'Ham, Pepperoni, Pineapple, Onions, Mozzarella', '₱680', 'Available 2pm–10pm', 1),
    (v_cat, v_rid, 'Diavola', 'Pepperoni, Mozzarella, Chili Tomato Sauce', '₱620', 'Available 2pm–10pm', 2),
    (v_cat, v_rid, 'Butcher''s Bounty', 'Ham, Bacon, Pepperoni, White Onions, Mushroom, Mozzarella, Tomato Sauce', '₱790', 'Available 2pm–10pm', 3);

  -- ── Pasta ──────────────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Pasta', 10) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Pomodoro', 'Sweet and Tangy Tomato Sauce, Spaghetti Pasta, Parmesan Cheese and Crusty Focaccia Bread', '₱340', NULL, 0),
    (v_cat, v_rid, 'Alfredo Pasta', 'Creamy Alfredo Sauce, Spaghetti Pasta, Parmesan Cheese, Crusty Focaccia', '₱350', NULL, 1),
    (v_cat, v_rid, 'Pesto', 'Homemade Pesto Sauce with Cashew Nut, Spaghetti, Parmesan Cheese, Crusty Focaccia', '₱360', NULL, 2),
    (v_cat, v_rid, 'Bolognese', 'Braised Minced Beef in Red Wine, Parmesan Cheese, Spaghetti Pasta, Crusty Focaccia Bread', '₱399', NULL, 3),
    (v_cat, v_rid, 'Beef Lasagna', 'Lasagna Pasta Sheet, Layer of Slow Cooked Beef Ragout, Cheesy Bechamel Gratin, Focaccia Bread', '₱440', NULL, 4);

  -- ── Sweet Treats ───────────────────────────────────────────
  INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (v_rid, 'Sweet Treats', 11) RETURNING id INTO v_cat;
  INSERT INTO menu_items (menu_category_id, restaurant_id, name, description, price, price_note, sort_order) VALUES
    (v_cat, v_rid, 'Pizza Au Chocolate', 'Warm Crust Drizzled with Chocolate Sauce, Topped with Tropical Fruits, and Salted Coconut Caramel', '₱460', 'Available 6pm–10:30pm', 0),
    (v_cat, v_rid, 'Banana Split', 'Flambe Sweet Banana, Vanilla Ice Cream, Purple Yum Syrup, Whipped Cream', '₱350', NULL, 1),
    (v_cat, v_rid, 'Brownie Ala Mode', 'Warm Brownie with Cashew, Vanilla Ice Cream, Chocolate Sauce', '₱420', NULL, 2);

  RAISE NOTICE 'Menu imported for restaurant %', v_rid;
END $$;
