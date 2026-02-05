/**
 * Database Seed Script
 *
 * This script seeds the database with:
 * - Categories and MasterListItems (staples/restock) - runs in ALL environments (idempotent)
 * - Example recipes - runs in DEVELOPMENT only (destructive)
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// MASTER LIST DATA (Categories + Items)
// =============================================================================

const categories = [
  { name: 'Fresh Produce', order: 1 },
  { name: 'Dairy & Eggs', order: 2 },
  { name: 'Dairy & Alternatives', order: 3 },
  { name: 'Meat & Poultry', order: 4 },
  { name: 'Bakery', order: 5 },
  { name: 'Pantry', order: 6 },
  { name: 'Frozen', order: 7 },
  { name: 'Condiments & Sauces', order: 8 },
  { name: 'Herbs & Spices', order: 9 },
  { name: 'Ready Meals & Soups', order: 10 },
  { name: 'Beverages', order: 11 },
]

const masterListItems = [
  // Fresh Produce - Staples
  { name: "Sainsbury's Baby Plum Tomatoes 325g", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Closed Cup Mushrooms Vitamin D 400g", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Fairtrade Bananas x5", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Large Whole Cucumber", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Lemons", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Little Gem Lettuce x2", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Pineapple 160g", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Red Pepper", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Red Seedless Grapes 500g", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Royal Gala Apples x6", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Spring Onions Bunch 100g", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's Strawberries 400g", type: 'staple', category: 'Fresh Produce' },
  { name: "Sainsbury's White Seedless Grapes 500g", type: 'staple', category: 'Fresh Produce' },

  // Dairy & Eggs - Staples
  { name: "Sainsbury's British Free Range Eggs Large x12", type: 'staple', category: 'Dairy & Eggs' },
  { name: "Sainsbury's British Semi Skimmed Milk 2.27L", type: 'staple', category: 'Dairy & Eggs' },
  { name: "Sainsbury's Gouda Cheese Slices 250g", type: 'staple', category: 'Dairy & Eggs' },
  { name: "Sainsbury's Grated Mozzarella Cheese 250g", type: 'staple', category: 'Dairy & Eggs' },
  { name: 'Müller Light Fat Free Strawberry Yogurt 160g', type: 'staple', category: 'Dairy & Eggs' },

  // Dairy & Alternatives - Staples
  { name: 'Alpro Plain No Sugars Soya Dairy Free Yoghurt Alternative 500g', type: 'staple', category: 'Dairy & Alternatives' },

  // Meat & Poultry - Staples
  { name: "Sainsbury's German Salami Slices x17 170g", type: 'staple', category: 'Meat & Poultry' },
  { name: "Sainsbury's Unsmoked Streaky Bacon Rashers x14 300g", type: 'staple', category: 'Meat & Poultry' },

  // Bakery - Staples
  { name: 'Fitzgeralds Family Bakery Deli Style Sourdough Bagels Pre-Sliced x5 425g', type: 'staple', category: 'Bakery' },
  { name: 'Warburtons White Soft Pittas x4', type: 'staple', category: 'Bakery' },
  { name: 'Kingsmill Medium Sliced 50/50 Bread 800g', type: 'staple', category: 'Bakery' },

  // Pantry - Staples
  { name: "Sainsbury's Salted Cashew 200g", type: 'staple', category: 'Pantry' },
  { name: 'Jordans No Added Sugar Apple & Berry Granola Breakfast Cereal 425g', type: 'staple', category: 'Pantry' },

  // Pantry - Restock
  { name: 'Allinson Wholemeal Plain Flour 1kg', type: 'restock', category: 'Pantry' },
  { name: 'Crazy Jack Organic Pine Nuts 100g', type: 'restock', category: 'Pantry' },
  { name: 'Frylight 1 Cal Golden Sunflower Oil Cooking Spray 190ml', type: 'restock', category: 'Pantry' },
  { name: "Sainsbury's Basmati Rice 1kg", type: 'restock', category: 'Pantry' },
  { name: "Sainsbury's Cornflour 500g", type: 'restock', category: 'Pantry' },
  { name: "Sainsbury's Fusilli Pasta 500g", type: 'restock', category: 'Pantry' },
  { name: "Sainsbury's Macaroni Pasta 500g", type: 'restock', category: 'Pantry' },
  { name: "Sainsbury's Scottish Porridge Oats 1kg", type: 'restock', category: 'Pantry' },
  { name: "Sharwood's Medium Egg Noodles 226g", type: 'restock', category: 'Pantry' },
  { name: 'Whitworths Golden Apricots 140g', type: 'restock', category: 'Pantry' },
  { name: 'Natco Popping Corn 500g', type: 'restock', category: 'Pantry' },
  { name: 'Green Giant Salt Free Sweet Corn 4x198g', type: 'restock', category: 'Pantry' },

  // Frozen - Staples
  { name: "Sainsbury's Frozen Blueberries 360g", type: 'staple', category: 'Frozen' },

  // Condiments & Sauces - Staples
  { name: 'Sabra Houmous Extra 200g', type: 'staple', category: 'Condiments & Sauces' },

  // Condiments & Sauces - Restock
  { name: 'Amoy Soy Sauce Light 150ml', type: 'restock', category: 'Condiments & Sauces' },
  { name: 'Rowse Original Squeezy Honey 250g', type: 'restock', category: 'Condiments & Sauces' },
  { name: "Sainsbury's Dijon Mustard 185g", type: 'restock', category: 'Condiments & Sauces' },
  { name: "Sainsbury's Mirin Inspired to Cook 150ml", type: 'restock', category: 'Condiments & Sauces' },
  { name: "Sainsbury's Pitted Green Olives 340g", type: 'restock', category: 'Condiments & Sauces' },

  // Herbs & Spices - Restock
  { name: "Sainsbury's Garlic Granules 58g", type: 'restock', category: 'Herbs & Spices' },

  // Ready Meals & Soups - Staples
  { name: "Sainsbury's Carrot & Honey Roast Parsnip Soup Taste the Difference 600g", type: 'staple', category: 'Ready Meals & Soups' },
  { name: "Sainsbury's Petits Pois & Ham Soup Taste the Difference 600g", type: 'staple', category: 'Ready Meals & Soups' },
  { name: "Sainsbury's Tomato & Basil Soup 600g", type: 'staple', category: 'Ready Meals & Soups' },

  // Beverages - Staples
  { name: 'Pepsi Max No Sugar Cola Bottle 2L', type: 'staple', category: 'Beverages' },
  { name: 'Pepsi Max Lime No Sugar Cola Bottle 2L', type: 'staple', category: 'Beverages' },

  // Beverages - Restock
  { name: "Sainsbury's Quadruple Strength Summer Fruits Squash 1.5L", type: 'restock', category: 'Beverages' },
]

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

/**
 * Seeds categories and master list items (idempotent - safe for production)
 */
async function seedMasterListData() {
  console.log('Seeding categories and master list items...')

  // Upsert categories
  const categoryMap = new Map<string, string>()
  for (const cat of categories) {
    const result = await prisma.category.upsert({
      where: { name: cat.name },
      update: { order: cat.order },
      create: cat,
    })
    categoryMap.set(cat.name, result.id)
  }
  console.log(`✅ Upserted ${categories.length} categories`)

  // Upsert master list items
  let itemCount = 0
  for (let i = 0; i < masterListItems.length; i++) {
    const item = masterListItems[i]
    const categoryId = categoryMap.get(item.category)
    if (!categoryId) {
      console.warn(`⚠️ Category not found for item: ${item.name}`)
      continue
    }

    // Use name + type as unique identifier for upsert
    const existing = await prisma.masterListItem.findFirst({
      where: { name: item.name, type: item.type },
    })

    if (existing) {
      await prisma.masterListItem.update({
        where: { id: existing.id },
        data: { categoryId, order: i },
      })
    } else {
      await prisma.masterListItem.create({
        data: {
          name: item.name,
          type: item.type,
          categoryId,
          order: i,
        },
      })
    }
    itemCount++
  }
  console.log(`✅ Upserted ${itemCount} master list items`)
}

/**
 * Seeds example recipes (additive - won't overwrite existing data)
 * Note: Don't use NODE_ENV checks here - Prisma CLI doesn't set it reliably.
 * The existingCount check is the real safeguard.
 */
async function seedExampleRecipes() {
  console.log('Checking example recipes...')

  // Real safeguard: skip if recipes already exist
  const existingCount = await prisma.recipe.count()
  if (existingCount > 0) {
    console.log(`⏭️ Skipping recipe seeding - ${existingCount} recipes already exist`)
    return
  }

  const recipes = [
    {
      name: 'Walnut-Rosemary Crusted Salmon',
      ingredients: `1/2 cup walnuts, toasted
1 tablespoon finely chopped fresh rosemary
1/2 teaspoon salt
1/4 teaspoon freshly ground pepper
1 pound salmon fillet
1 tablespoon olive oil
1 teaspoon lemon zest
1 tablespoon lemon juice`,
      proteinType: 'fish',
      carbType: null,
      recipeUrl: 'https://www.eatingwell.com/recipe/267223/walnut-rosemary-crusted-salmon/',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Spaghetti Alla Puttanesca',
      ingredients: `Spaghetti
Olive oil
Garlic
Red chili flakes
Anchovy fillets
Canned tomatoes
Black olives
Capers
Fresh parsley
Salt
Black pepper`,
      proteinType: null,
      carbType: 'pasta',
      recipeUrl: 'https://www.recipetineats.com/spaghetti-alla-puttanesca/',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Lemon Garlic Salmon',
      ingredients: `2 pounds salmon fillet
Kosher salt
1 large lemon
2 large lemons
3 tablespoons extra virgin olive oil
5 garlic cloves, chopped
2 teaspoon dried oregano
1 teaspoon sweet paprika
1/2 teaspoon black pepper
Chopped parsley, for garnish`,
      proteinType: 'fish',
      carbType: null,
      recipeUrl: 'https://www.themediterraneandish.com/lemon-garlic-salmon-recipe/',
      prepTime: 'quick',
      tier: 'new',
    },
    {
      name: 'Easy Baked Chicken Thighs',
      ingredients: `1.5 lbs. boneless, skinless chicken thighs (about 8)
2 teaspoons extra-virgin olive oil
1 teaspoon poultry seasoning
1 teaspoon paprika
¾ teaspoon kosher salt
½ teaspoon black pepper`,
      proteinType: 'chicken',
      carbType: null,
      recipeUrl: 'https://www.familyfoodonthetable.com/easy-baked-chicken-thighs/',
      prepTime: 'quick',
      tier: 'new',
    },
    {
      name: 'Soy Sauce Pan Fried Noodles',
      ingredients: `8 oz noodles
3 tbsp soy sauce
1 tbsp oyster sauce
1 tbsp sesame oil
2 tbsp vegetable oil
2 garlic cloves, minced
1 cup cabbage, chopped
1/2 cup carrots, julienned
2 green onions, chopped
1 egg, beaten
1 tsp sugar
Salt and pepper to taste`,
      proteinType: null,
      carbType: 'other',
      recipeUrl: 'https://tiffycooks.com/soy-sauce-pan-fried-noodles-15-minutes/',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Pan Fried Sea Bass with Lemon Garlic Herb Sauce',
      ingredients: `Sea bass fillets
Salt
Pepper
Olive oil
Unsalted butter
Garlic cloves
Lemon
Fresh parsley
Fresh dill
Fresh thyme`,
      proteinType: null,
      carbType: null,
      recipeUrl: 'https://www.bowlofdelicious.com/pan-fried-sea-bass-with-lemon-garlic-herb-sauce/',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Vietnamese Chicken Noodle Bowl',
      ingredients: `Rice noodles
Cooked chicken, shredded
Mixed lettuce (including iceberg and/or romaine)
Fresh herbs (mint, cilantro, basil)
Cucumber, julienned
Carrots, julienned
Peanuts, crushed
Chili (optional)
Lime wedges
Sweet chili sauce or hoisin sauce for serving`,
      proteinType: 'chicken',
      carbType: 'other',
      recipeUrl: 'https://www.recipetineats.com/vietnamese-chicken-noodle-bowl/#jump-watch',
      prepTime: 'medium',
      tier: 'non-regular',
    },
    {
      name: 'Salmon Pea Pasta',
      ingredients: `8 ounces pasta of your choice
1 tablespoon olive oil
2 garlic cloves, minced
1 cup frozen peas
1 pound salmon fillet, skin removed
1/2 teaspoon salt
1/4 teaspoon black pepper
1/2 cup heavy cream
1/2 cup grated Parmesan cheese
Fresh basil for garnish`,
      proteinType: 'fish',
      carbType: 'pasta',
      recipeUrl: 'https://carriecarvalho.com/salmon-pea-pasta/',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Chicken Donner',
      ingredients: `1kg chicken thigh fillets
Cumin
Baharat
Turmeric
Cherry Tomatoes
Mushrooms
Broccoli
Olive Oil`,
      proteinType: 'chicken',
      carbType: null,
      recipeUrl: 'https://www.ynet.co.il/food/recipies/article/Hk8BdwW100#google_vignette',
      prepTime: 'medium',
      tier: 'favorite',
    },
    {
      name: 'Burgers and Fries',
      ingredients: `4 Burgers
4 Burger Buns
Frozen Fries`,
      proteinType: 'red-meat',
      carbType: 'fries',
      recipeUrl: null,
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Ground Pork Stir Fry',
      ingredients: `vegetable oil
2 Tbsp. shallots, finely minced
3 cloves garlic, minced
1 Tbsp. fresh ginger, minced
1 lb. ground pork
salt and white pepper, to taste
1 large head broccoli, chopped into pieces`,
      proteinType: 'red-meat',
      carbType: null,
      recipeUrl: 'https://krollskorner.com/ingredient/beef-pork/ground-pork-stir-fry/',
      prepTime: 'quick',
      tier: 'new',
    },
  ]

  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: recipe,
    })
  }

  console.log(`✅ Created ${recipes.length} example recipes`)
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('🌱 Starting database seed...')
  console.log('')

  await seedMasterListData()
  await seedExampleRecipes()

  console.log('')
  console.log('🎉 Seed complete!')
}

main()
  .catch(e => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
