-- The Store: starter seed data
-- Run this AFTER schema.sql, while signed in as your own user (it looks up
-- your own household automatically). Prices are rough national-average
-- estimates, NOT verified at Harmons — that's intentional. Edit freely,
-- delete what doesn't apply, and the app will nudge you to correct stale
-- ones over time.

do $$
declare
  hh_id uuid;
  sec_produce uuid;
  sec_bakery uuid;
  sec_deli uuid;
  sec_meat uuid;
  sec_dairy uuid;
  sec_frozen uuid;
  sec_pantry uuid;
  sec_canned uuid;
  sec_snacks uuid;
  sec_beverages uuid;
  sec_household uuid;
  sec_personal_care uuid;
begin
  -- Find the household for the currently signed-in user.
  select household_id into hh_id
  from household_members
  where user_id = auth.uid()
  limit 1;

  if hh_id is null then
    raise exception 'No household found for current user — make sure you are signed in and have run schema.sql first.';
  end if;

  -- ── Sections, in a typical Harmons walking order ──
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Produce', 1) returning id into sec_produce;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Bakery', 2) returning id into sec_bakery;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Deli', 3) returning id into sec_deli;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Meat & Seafood', 4) returning id into sec_meat;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Dairy & Eggs', 5) returning id into sec_dairy;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Frozen', 6) returning id into sec_frozen;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Pantry & Dry Goods', 7) returning id into sec_pantry;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Canned & Jarred', 8) returning id into sec_canned;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Snacks', 9) returning id into sec_snacks;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Beverages', 10) returning id into sec_beverages;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Household & Paper', 11) returning id into sec_household;
  insert into store_sections (household_id, name, sort_order) values (hh_id, 'Personal Care', 12) returning id into sec_personal_care;

  -- ── Produce ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Bananas', sec_produce, 1.50, now(), true),
    (hh_id, 'Apples', sec_produce, 4.00, now(), false),
    (hh_id, 'Avocados', sec_produce, 1.25, now(), true),
    (hh_id, 'Spinach', sec_produce, 3.50, now(), false),
    (hh_id, 'Romaine Lettuce', sec_produce, 2.50, now(), false),
    (hh_id, 'Tomatoes', sec_produce, 3.00, now(), false),
    (hh_id, 'Carrots', sec_produce, 2.00, now(), false),
    (hh_id, 'Onions', sec_produce, 2.50, now(), true),
    (hh_id, 'Garlic', sec_produce, 1.00, now(), false),
    (hh_id, 'Bell Peppers', sec_produce, 4.00, now(), false),
    (hh_id, 'Broccoli', sec_produce, 2.75, now(), false),
    (hh_id, 'Lemons', sec_produce, 2.00, now(), false),
    (hh_id, 'Limes', sec_produce, 2.00, now(), false),
    (hh_id, 'Potatoes', sec_produce, 5.00, now(), false),
    (hh_id, 'Strawberries', sec_produce, 4.50, now(), false),
    (hh_id, 'Blueberries', sec_produce, 4.50, now(), false);

  -- ── Bakery ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Sandwich Bread', sec_bakery, 3.50, now(), true),
    (hh_id, 'Bagels', sec_bakery, 4.00, now(), false),
    (hh_id, 'Tortillas', sec_bakery, 3.50, now(), false),
    (hh_id, 'Dinner Rolls', sec_bakery, 3.50, now(), false),
    (hh_id, 'English Muffins', sec_bakery, 3.75, now(), false);

  -- ── Deli ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Sliced Turkey', sec_deli, 7.50, now(), false),
    (hh_id, 'Sliced Ham', sec_deli, 6.50, now(), false),
    (hh_id, 'Sliced Cheese', sec_deli, 5.50, now(), false),
    (hh_id, 'Rotisserie Chicken', sec_deli, 8.00, now(), true);

  -- ── Meat & Seafood ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Chicken Breast', sec_meat, 8.00, now(), true),
    (hh_id, 'Ground Beef', sec_meat, 7.00, now(), true),
    (hh_id, 'Bacon', sec_meat, 6.50, now(), false),
    (hh_id, 'Salmon Filets', sec_meat, 11.00, now(), false),
    (hh_id, 'Pork Chops', sec_meat, 7.50, now(), false),
    (hh_id, 'Ground Turkey', sec_meat, 6.50, now(), false);

  -- ── Dairy & Eggs ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Milk', sec_dairy, 4.00, now(), true),
    (hh_id, 'Eggs', sec_dairy, 5.00, now(), true),
    (hh_id, 'Butter', sec_dairy, 5.00, now(), true),
    (hh_id, 'Shredded Cheese', sec_dairy, 5.50, now(), true),
    (hh_id, 'Greek Yogurt', sec_dairy, 5.50, now(), false),
    (hh_id, 'Sour Cream', sec_dairy, 3.00, now(), false),
    (hh_id, 'Cream Cheese', sec_dairy, 3.50, now(), false),
    (hh_id, 'Cottage Cheese', sec_dairy, 4.50, now(), false),
    (hh_id, 'Orange Juice', sec_dairy, 5.00, now(), false);

  -- ── Frozen ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Frozen Mixed Vegetables', sec_frozen, 3.00, now(), false),
    (hh_id, 'Frozen Berries', sec_frozen, 5.00, now(), false),
    (hh_id, 'Frozen Pizza', sec_frozen, 6.00, now(), false),
    (hh_id, 'Ice Cream', sec_frozen, 6.50, now(), false),
    (hh_id, 'Frozen Waffles', sec_frozen, 4.00, now(), false),
    (hh_id, 'Frozen Chicken Nuggets', sec_frozen, 7.00, now(), false);

  -- ── Pantry & Dry Goods ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Rice', sec_pantry, 4.50, now(), true),
    (hh_id, 'Pasta', sec_pantry, 2.00, now(), true),
    (hh_id, 'Olive Oil', sec_pantry, 9.00, now(), false),
    (hh_id, 'Flour', sec_pantry, 4.00, now(), false),
    (hh_id, 'Sugar', sec_pantry, 4.00, now(), false),
    (hh_id, 'Peanut Butter', sec_pantry, 5.00, now(), true),
    (hh_id, 'Cereal', sec_pantry, 4.50, now(), true),
    (hh_id, 'Oats', sec_pantry, 4.00, now(), false),
    (hh_id, 'Honey', sec_pantry, 6.00, now(), false),
    (hh_id, 'Salt', sec_pantry, 2.00, now(), false),
    (hh_id, 'Black Pepper', sec_pantry, 4.00, now(), false);

  -- ── Canned & Jarred ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Canned Black Beans', sec_canned, 1.25, now(), false),
    (hh_id, 'Canned Diced Tomatoes', sec_canned, 1.50, now(), false),
    (hh_id, 'Marinara Sauce', sec_canned, 3.50, now(), false),
    (hh_id, 'Canned Corn', sec_canned, 1.25, now(), false),
    (hh_id, 'Chicken Broth', sec_canned, 2.50, now(), false),
    (hh_id, 'Salsa', sec_canned, 4.00, now(), false);

  -- ── Snacks ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Tortilla Chips', sec_snacks, 3.50, now(), false),
    (hh_id, 'Crackers', sec_snacks, 4.00, now(), false),
    (hh_id, 'Granola Bars', sec_snacks, 5.00, now(), false),
    (hh_id, 'Popcorn', sec_snacks, 4.00, now(), false),
    (hh_id, 'Pretzels', sec_snacks, 3.50, now(), false);

  -- ── Beverages ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Coffee', sec_beverages, 9.00, now(), true),
    (hh_id, 'Sparkling Water', sec_beverages, 5.00, now(), false),
    (hh_id, 'Soda', sec_beverages, 5.50, now(), false),
    (hh_id, 'Bottled Water Case', sec_beverages, 5.00, now(), false);

  -- ── Household & Paper ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Paper Towels', sec_household, 9.00, now(), true),
    (hh_id, 'Toilet Paper', sec_household, 10.00, now(), true),
    (hh_id, 'Dish Soap', sec_household, 4.00, now(), false),
    (hh_id, 'Laundry Detergent', sec_household, 12.00, now(), false),
    (hh_id, 'Trash Bags', sec_household, 8.00, now(), false),
    (hh_id, 'Paper Napkins', sec_household, 3.00, now(), false);

  -- ── Personal Care ──
  insert into inventory_items (household_id, name, section_id, est_price, price_updated_at, is_staple) values
    (hh_id, 'Shampoo', sec_personal_care, 7.00, now(), false),
    (hh_id, 'Toothpaste', sec_personal_care, 4.00, now(), false),
    (hh_id, 'Deodorant', sec_personal_care, 6.00, now(), false),
    (hh_id, 'Body Wash', sec_personal_care, 6.50, now(), false);

end $$;
