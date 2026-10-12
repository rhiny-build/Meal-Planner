/**
 * SYNTHETIC DATA. Not Ronen's real recipe book.
 *
 * S07 needs something shaped like the real 78-recipe book to rehearse the backfill on, because a build
 * session only has the 11 seed recipes and cannot reach recipe sites. This file invents:
 *   - 46 recipes with a source link, pointing at local fixture pages (see fixtureServer.ts)
 *   - 16 "quick-looking" items (Simple Fries, ...)
 *   - 16 family recipes with no link (Shini's ..., Rhiny's Schnitzels, ...)
 * including the two duplicate pairs named in the S07 prompt. 46 + 16 + 16 = 78.
 *
 * Page kinds decide what the fixture server returns, so every outcome the backfill can meet is covered:
 *   jsonld     a normal page with schema.org Recipe data
 *   messy      a blog post: ads, a long essay, comments, method in prose, no structured data
 *   nomethod   ingredients only, no method
 *   404        the link is dead
 *   blocked    403 with a subscribe wall
 *   notrecipe  a "this page has moved" page
 */

export type PageKind = 'jsonld' | 'messy' | 'nomethod' | '404' | 'blocked' | 'notrecipe'

export interface UrlRecipe {
  name: string
  slug: string
  page: PageKind
  /** What the page says (ingredient lines, "qty unit name") */
  ingredients: string[]
  /** What the page says (method). Empty for pages without a method. */
  steps: string[]
  /** The page's servings and total minutes, when it states them */
  yieldServings?: number
  minutes?: number
  protein?: string
  carb?: string
  /** Ronen's copy in the book */
  book?: {
    servings?: number
    notes?: string
    /** Steps Ronen already wrote (must never be replaced) */
    steps?: string[]
    /** Leave out the last ingredient (the page has one more than the book) */
    dropLastIngredient?: boolean
    /** Book ingredients have no quantities (just names) */
    noQuantities?: boolean
  }
}

const list = (s: string) => s.split(';').map((x) => x.trim()).filter(Boolean)
const steps = (s: string) => s.split('|').map((x) => x.trim()).filter(Boolean)

function u(
  page: PageKind,
  name: string,
  ing: string,
  method: string,
  extra: Partial<Omit<UrlRecipe, 'name' | 'slug' | 'page' | 'ingredients' | 'steps'>> = {}
): UrlRecipe {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return { name, slug, page, ingredients: list(ing), steps: steps(method), ...extra }
}

export const URL_RECIPES: UrlRecipe[] = [
  // ---- jsonld (28) ----
  u('jsonld', 'Lemon Garlic Chicken Thighs', '8 chicken thighs; 4 cloves garlic; 1 lemon; 2 tbsp olive oil; 1 tsp oregano; salt and pepper', 'Heat the oven to 200C.|Toss the chicken thighs with garlic, lemon juice, oil and oregano.|Roast 40 minutes until golden.', { yieldServings: 4, minutes: 55, protein: 'chicken', book: { servings: 4, notes: 'Family favourite, use skin on' } }),
  u('jsonld', 'Easy Asian Cucumber Salad', '2 cucumbers; 2 tbsp rice vinegar; 1 tbsp soy sauce; 1 tsp sesame oil; 1 tsp sugar; 1 tbsp sesame seeds', 'Smash and slice the cucumbers.|Mix vinegar, soy, oil and sugar.|Toss together and sprinkle with sesame seeds.', { yieldServings: 4, minutes: 10 }),
  u('jsonld', 'Pan Fried Sea Bass with Lemon Garlic Herb Sauce', '4 sea bass fillets; 2 tbsp butter; 3 cloves garlic; 1 lemon; 2 tbsp parsley; 1 tbsp olive oil', 'Pat the fillets dry and season.|Fry skin side down 4 minutes, flip, 2 minutes more.|Melt butter with garlic and lemon, stir in parsley and spoon over.', { yieldServings: 4, minutes: 20, protein: 'fish' }),
  u('jsonld', 'Pan Fried Sea Bass with Lemon Garlic Herb Sauce', '4 sea bass fillets; 2 tbsp butter; 3 cloves garlic; 1 lemon; 2 tbsp parsley; 1 tbsp olive oil', 'Pat the fillets dry and season.|Fry skin side down 4 minutes, flip, 2 minutes more.|Melt butter with garlic and lemon, stir in parsley and spoon over.', { yieldServings: 4, minutes: 20, protein: 'fish', book: { dropLastIngredient: true, noQuantities: true } }),
  u('jsonld', 'Creamy Mushroom Pasta', '300 g penne; 250 g mushrooms; 200 ml double cream; 2 cloves garlic; 30 g parmesan; 1 tbsp butter', 'Boil the pasta.|Fry mushrooms in butter 6 minutes with garlic.|Add cream and simmer 3 minutes.|Toss with pasta and parmesan.', { yieldServings: 4, minutes: 25, carb: 'pasta' }),
  u('jsonld', 'Sheet Pan Salmon and Broccoli', '4 salmon fillets; 1 head broccoli; 2 tbsp olive oil; 1 lemon; 1 tsp paprika', 'Heat the oven to 200C.|Spread broccoli and salmon on a tray with oil and paprika.|Roast 15 minutes.|Squeeze lemon over.', { yieldServings: 4, minutes: 25, protein: 'fish' }),
  u('jsonld', 'Chicken Tikka Masala', '600 g chicken breast; 150 g yoghurt; 2 tbsp tikka paste; 1 onion; 400 g chopped tomatoes; 100 ml cream', 'Marinate the chicken in yoghurt and paste for 30 minutes.|Grill the chicken until charred.|Soften the onion, add tomatoes and simmer 15 minutes.|Add chicken and cream, simmer 10 minutes.', { yieldServings: 6, minutes: 75, protein: 'chicken', book: { servings: 4 } }),
  u('jsonld', 'Beef Ragu', '500 g beef shin; 1 onion; 2 carrots; 400 g tomatoes; 200 ml red wine; 300 g pappardelle', 'Brown the beef.|Add vegetables, wine and tomatoes.|Cook gently for 3 hours until it falls apart.|Serve over pappardelle.', { yieldServings: 6, minutes: 220, protein: 'red-meat', carb: 'pasta' }),
  u('jsonld', 'Honey Soy Chicken Drumsticks', '8 chicken drumsticks; 3 tbsp honey; 3 tbsp soy sauce; 2 cloves garlic; 1 tsp ginger', 'Mix honey, soy, garlic and ginger.|Coat the drumsticks and rest 20 minutes.|Roast at 190C for 40 minutes, basting once.', { yieldServings: 4, minutes: 70, protein: 'chicken' }),
  u('jsonld', 'Vegetable Stir Fry', '1 pepper; 200 g broccoli; 1 carrot; 2 tbsp soy sauce; 1 tbsp oil; 1 tsp ginger', 'Slice the vegetables.|Stir fry in hot oil 5 minutes.|Add soy and ginger and toss for 1 minute.', { yieldServings: 3, minutes: 15 }),
  u('jsonld', 'Shakshuka', '1 onion; 1 pepper; 400 g chopped tomatoes; 4 eggs; 1 tsp cumin; 1 tsp paprika', 'Soften onion and pepper with spices.|Add tomatoes and simmer 10 minutes.|Make wells, crack in eggs, cover and cook 6 minutes.', { yieldServings: 2, minutes: 30, protein: 'vegetarian' }),
  u('jsonld', 'Turkey Meatballs', '500 g turkey mince; 1 egg; 50 g breadcrumbs; 1 tsp garlic powder; 400 g passata', 'Mix mince, egg, crumbs and garlic.|Roll into 20 balls.|Bake 18 minutes at 200C.|Simmer in passata for 5 minutes.', { yieldServings: 4, minutes: 40, protein: 'chicken' }),
  u('jsonld', 'Prawn Fried Rice', '300 g cooked rice; 200 g prawns; 2 eggs; 100 g peas; 2 tbsp soy sauce; 1 tbsp oil', 'Scramble the eggs and set aside.|Stir fry prawns and peas 3 minutes.|Add rice and soy, toss until hot.|Fold in the egg.', { yieldServings: 3, minutes: 20, protein: 'fish', carb: 'rice' }),
  u('jsonld', 'Lentil Soup', '250 g red lentils; 1 onion; 2 carrots; 1 tsp cumin; 1 litre stock; 1 lemon', 'Soften onion and carrots.|Add lentils, cumin and stock.|Simmer 25 minutes, blend, finish with lemon.', { yieldServings: 4, minutes: 40, protein: 'vegetarian', book: { noQuantities: true } }),
  u('jsonld', 'Chicken Fajitas', '500 g chicken strips; 2 peppers; 1 onion; 2 tbsp fajita spice; 8 tortillas', 'Toss chicken in spice.|Fry chicken 6 minutes, add peppers and onion for 5 more.|Warm tortillas and fill.', { yieldServings: 4, minutes: 25, protein: 'chicken' }),
  u('jsonld', 'Baked Cod with Tomatoes', '4 cod fillets; 300 g cherry tomatoes; 2 cloves garlic; 1 tbsp olive oil; 1 handful basil', 'Heat oven to 200C.|Tray the tomatoes with oil and garlic, roast 10 minutes.|Add cod and bake 12 minutes.|Scatter basil.', { yieldServings: 4, minutes: 30, protein: 'fish' }),
  u('jsonld', 'Mac and Cheese', '300 g macaroni; 50 g butter; 40 g flour; 600 ml milk; 200 g cheddar', 'Boil the macaroni.|Make a roux with butter and flour, whisk in milk.|Melt in the cheddar, stir through the pasta.|Bake 15 minutes.', { yieldServings: 4, minutes: 45, protein: 'vegetarian', carb: 'pasta' }),
  u('jsonld', 'Teriyaki Salmon', '4 salmon fillets; 4 tbsp teriyaki sauce; 1 tbsp honey; 1 tsp ginger; 2 spring onions', 'Mix teriyaki, honey and ginger.|Marinate salmon 15 minutes.|Pan fry 4 minutes a side, glaze with remaining sauce.', { yieldServings: 4, minutes: 30, protein: 'fish' }),
  u('jsonld', 'Pesto Gnocchi', '500 g gnocchi; 4 tbsp pesto; 150 g cherry tomatoes; 50 g parmesan', 'Pan fry gnocchi until golden.|Add tomatoes for 3 minutes.|Stir through the pesto and parmesan.', { yieldServings: 3, minutes: 15, protein: 'vegetarian', carb: 'pasta' }),
  u('jsonld', 'Roast Chicken with Potatoes', '1 whole chicken; 800 g potatoes; 1 lemon; 4 cloves garlic; 2 tbsp olive oil', 'Heat oven to 200C.|Stuff chicken with lemon and garlic.|Roast with potatoes for 1 hour 20 minutes.|Rest 15 minutes.', { yieldServings: 5, minutes: 110, protein: 'chicken' }),
  u('jsonld', 'Spaghetti Bolognese', '500 g beef mince; 1 onion; 2 cloves garlic; 400 g tomatoes; 300 g spaghetti', 'Brown the mince with onion.|Add garlic and tomatoes, simmer 30 minutes.|Cook spaghetti and combine.', { yieldServings: 4, minutes: 50, protein: 'red-meat', carb: 'pasta', book: { steps: ['Brown the mince', 'Simmer with tomatoes', 'Serve over pasta'] } }),
  u('jsonld', 'Sweet Potato Curry', '2 sweet potatoes; 400 ml coconut milk; 2 tbsp curry paste; 1 onion; 200 g spinach', 'Fry onion and paste 2 minutes.|Add sweet potato and coconut milk, simmer 20 minutes.|Wilt in the spinach.', { yieldServings: 4, minutes: 35, protein: 'vegetarian' }),
  u('jsonld', 'Garlic Butter Prawns', '400 g king prawns; 50 g butter; 4 cloves garlic; 1 lemon; 2 tbsp parsley', 'Melt butter, fry garlic 30 seconds.|Add prawns and cook 3 minutes.|Finish with lemon and parsley.', { yieldServings: 3, minutes: 12, protein: 'fish' }),
  u('jsonld', 'Chicken Caesar Salad', '2 chicken breasts; 1 romaine lettuce; 4 tbsp caesar dressing; 40 g parmesan; 2 slices bread', 'Pan fry the chicken 6 minutes a side.|Toast and cube the bread.|Toss lettuce, dressing, chicken and croutons.', { yieldServings: 2, minutes: 25, protein: 'chicken' }),
  u('jsonld', 'Minestrone', '1 onion; 2 carrots; 1 courgette; 400 g tinned tomatoes; 100 g small pasta; 1 litre stock', 'Soften the vegetables.|Add tomatoes and stock, simmer 20 minutes.|Add pasta and cook 8 minutes.', { yieldServings: 6, minutes: 45, protein: 'vegetarian', book: { noQuantities: true } }),
  u('jsonld', 'Fish Tacos', '400 g white fish; 8 small tortillas; 1 lime; 100 g red cabbage; 4 tbsp mayo', 'Season and pan fry the fish 3 minutes a side.|Shred the cabbage with lime and mayo.|Flake fish into the tortillas.', { yieldServings: 4, minutes: 25, protein: 'fish' }),
  u('jsonld', 'Beef Burritos', '400 g beef mince; 4 large tortillas; 1 tin black beans; 150 g rice; 100 g cheese', 'Brown the mince with spices.|Add beans and warm through.|Fill tortillas with rice, beef and cheese and roll.', { yieldServings: 4, minutes: 30, protein: 'red-meat' }),
  u('jsonld', 'Pad Thai', '200 g rice noodles; 200 g prawns; 2 eggs; 3 tbsp pad thai sauce; 50 g peanuts; 1 lime', 'Soak the noodles.|Stir fry prawns, push aside, scramble eggs.|Add noodles and sauce, toss 2 minutes.|Top with peanuts and lime.', { yieldServings: 3, minutes: 25, protein: 'fish' }),
  // ---- messy (6) ----
  u('messy', 'Hungarian Goulash', '1 kg stewing beef; 2 onions; 2 tbsp paprika; 400 g tomatoes; 2 tbsp lard', 'Fry the onions in lard for 15 minutes until soft.|Add the beef and brown it.|Stir in paprika and tomatoes, cover and simmer 2 hours.', { yieldServings: 6, minutes: 180, protein: 'red-meat' }),
  u('messy', 'Slow Cooker Pulled Pork', '1.5 kg pork shoulder; 2 tbsp smoked paprika; 3 tbsp brown sugar; 1 onion; 200 ml cider vinegar', 'Rub the pork with paprika and sugar.|Put in the slow cooker on a bed of onion with the vinegar.|Cook on low for 8 hours, then shred.', { yieldServings: 8, minutes: 500, protein: 'red-meat' }),
  u('messy', 'Banana Pancakes', '2 ripe bananas; 2 eggs; 100 g oats; 1 tsp baking powder; 1 tbsp butter', 'Blend the bananas, eggs, oats and baking powder.|Fry spoonfuls in butter 2 minutes a side.', { yieldServings: 2, minutes: 15, protein: 'vegetarian' }),
  u('messy', 'Chicken Pie', '500 g chicken; 2 leeks; 300 ml white sauce; 1 sheet puff pastry; 1 egg', 'Fry the leeks and chicken.|Stir through the sauce and tip into a dish.|Cover with pastry, brush with egg and bake 30 minutes at 200C.', { yieldServings: 4, minutes: 60, protein: 'chicken' }),
  u('messy', 'Moroccan Chickpea Stew', '2 tins chickpeas; 400 g tomatoes; 1 onion; 2 tsp ras el hanout; 100 g apricots', 'Soften the onion with the spice.|Add everything else and simmer 25 minutes.', { yieldServings: 4, minutes: 35, protein: 'vegetarian' }),
  u('messy', 'Tomato Soup', '1 kg tomatoes; 1 onion; 2 cloves garlic; 500 ml stock; 1 tbsp olive oil', 'Roast the tomatoes, onion and garlic for 40 minutes.|Blend with the stock and heat through.', { yieldServings: 4, minutes: 55, protein: 'vegetarian' }),
  // ---- nomethod (4) ----
  u('nomethod', 'Greek Salad', '4 tomatoes; 1 cucumber; 200 g feta; 1 red onion; 1 handful olives; 2 tbsp olive oil', '', { yieldServings: 4, protein: 'vegetarian' }),
  u('nomethod', 'Caprese Salad', '4 tomatoes; 250 g mozzarella; 1 handful basil; 2 tbsp olive oil', '', { protein: 'vegetarian' }),
  u('nomethod', 'Coleslaw', '1 white cabbage; 2 carrots; 4 tbsp mayo; 1 tbsp vinegar', ''),
  u('nomethod', 'Guacamole', '3 avocados; 1 lime; 1 tomato; 1 small onion; 1 handful coriander', '', { yieldServings: 4 }),
  // ---- dead links (4) ----
  u('404', 'Thai Green Curry', '500 g chicken; 3 tbsp green curry paste; 400 ml coconut milk; 200 g green beans; 1 tbsp fish sauce', '', { protein: 'chicken' }),
  u('404', 'Lamb Koftas', '500 g lamb mince; 1 onion; 2 tsp cumin; 1 handful mint; 4 flatbreads', '', { protein: 'red-meat' }),
  u('404', 'Pea and Ham Soup', '500 g peas; 200 g ham; 1 onion; 1 litre stock', ''),
  u('404', 'Fish Pie', '600 g mixed fish; 800 g potatoes; 500 ml milk; 50 g butter; 40 g flour', '', { protein: 'fish' }),
  // ---- blocked (2) ----
  u('blocked', 'Beef Wellington', '800 g beef fillet; 400 g mushrooms; 8 slices parma ham; 500 g puff pastry; 2 tbsp mustard', '', { protein: 'red-meat' }),
  u('blocked', 'Chocolate Brownies', '200 g dark chocolate; 150 g butter; 3 eggs; 200 g sugar; 100 g flour', ''),
  // ---- the page is not a recipe (2) ----
  u('notrecipe', 'Chicken Satay', '500 g chicken; 4 tbsp peanut butter; 2 tbsp soy sauce; 1 lime; 1 tsp chilli', '', { protein: 'chicken' }),
  u('notrecipe', 'Falafel Wraps', '1 tin chickpeas; 1 handful parsley; 2 tsp cumin; 4 wraps; 4 tbsp hummus', '', { protein: 'vegetarian' }),
]

/** Quick-looking items: no link, no method, one or two things on a plate. */
export const QUICK_ITEMS: { name: string; ingredients: string[]; carb?: string }[] = [
  { name: 'Simple Fries', ingredients: ['oven fries'], carb: 'fries' },
  { name: 'Simple Steamed Rice', ingredients: ['basmati rice'], carb: 'rice' },
  { name: 'Simple Noodles', ingredients: ['egg noodles', 'soy sauce'] },
  { name: 'Simple Israeli Couscous', ingredients: ['israeli couscous'], carb: 'couscous' },
  { name: 'Simple Sweet Potatoes Fries', ingredients: ['sweet potatoes'] },
  { name: 'Chicken Nuggets', ingredients: ['chicken nuggets', 'ketchup'] },
  { name: 'Ready soup', ingredients: ['carton of soup'] },
  { name: 'Air Fried Green Beans', ingredients: ['green beans', 'olive oil'] },
  { name: 'Baked Cauliflower', ingredients: ['cauliflower', 'olive oil'] },
  { name: 'Burgers and Fries', ingredients: ['beef burgers', 'oven fries', 'burger buns'], carb: 'fries' },
  { name: 'Nuggets and Onion Rings', ingredients: ['chicken nuggets', 'onion rings'] },
  { name: 'Steak Sandwich', ingredients: ['rump steak', 'baguette', 'mustard'] },
  { name: 'Tortillas', ingredients: ['tortilla wraps'] },
  { name: 'Buttered Peas', ingredients: ['frozen peas', 'butter'] },
  { name: 'Garlic Bread', ingredients: ['baguette', 'garlic butter'] },
  { name: 'Fish Fingers and Peas', ingredients: ['fish fingers', 'frozen peas'] },
]

/** Family recipes with no link. Written the way a person types them: some quantities, some not. */
export const FAMILY_RECIPES: { name: string; ingredients: string[]; protein?: string; carb?: string; copyOfCucumberSalad?: boolean }[] = [
  { name: "Shini's Chicken Soup", ingredients: ['1 whole chicken', '3 carrots', '2 parsnips', '1 onion', 'celery', 'dill'], protein: 'chicken' },
  { name: "Shini's Rice and Peas", ingredients: ['2 cups rice', '1 cup peas', 'onion', 'stock cube'], carb: 'rice' },
  { name: "Shini's Lentil Stew", ingredients: ['lentils', 'potatoes', 'onion', 'cumin', 'tomato paste'], protein: 'vegetarian' },
  { name: "Shini's Potato Kugel", ingredients: ['6 potatoes', '2 eggs', '1 onion', 'oil', 'salt'] },
  { name: "Rhiny's Schnitzels", ingredients: ['4 chicken breasts', '2 eggs', 'breadcrumbs', 'flour', 'oil'], protein: 'chicken' },
  { name: "Rhiny's Bolognese", ingredients: ['500 g beef mince', 'onion', 'carrot', 'tomato passata', 'spaghetti'], protein: 'red-meat', carb: 'pasta' },
  { name: 'Beef in Oyster Sauce', ingredients: ['500 g beef strips', '3 tbsp oyster sauce', 'garlic', 'spring onions'], protein: 'red-meat' },
  { name: 'Tuna and Anchovy Pasta', ingredients: ['pasta', 'tin of tuna', 'anchovies', 'garlic', 'chilli'], protein: 'fish', carb: 'pasta' },
  { name: 'Improvised Pasta', ingredients: ['pasta', 'whatever veg is left', 'olive oil', 'cheese'], carb: 'pasta' },
  { name: 'Easy Asian Cucumber Salad', ingredients: ['cucumber', 'soy sauce', 'rice vinegar', 'sesame oil'], copyOfCucumberSalad: true },
  { name: 'Friday Roast Chicken', ingredients: ['1 chicken', 'potatoes', 'lemon', 'paprika'], protein: 'chicken' },
  { name: "Mum's Meatballs", ingredients: ['500 g beef mince', '1 egg', 'breadcrumbs', 'tomato sauce'], protein: 'red-meat' },
  { name: 'Egg Fried Rice', ingredients: ['cooked rice', '3 eggs', 'peas', 'soy sauce'], carb: 'rice' },
  { name: 'Sunday Pot Roast', ingredients: ['1.5 kg brisket', 'onions', 'carrots', 'red wine'], protein: 'red-meat' },
  { name: 'Fridge Clearout Omelette', ingredients: ['eggs', 'cheese', 'any veg', 'butter'], protein: 'vegetarian' },
  { name: 'Chicken and Leek Pie', ingredients: ['chicken', 'leeks', 'cream', 'pastry'], protein: 'chicken' },
]
