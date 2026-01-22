/**
 * Database Seed Script
 *
 * This script populates the database with example recipes for testing
 * and development purposes.
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'

// Simple Prisma client for Prisma 5
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.mealPlan.deleteMany()
  await prisma.recipe.deleteMany()

  // Create example recipes
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

main()
  .catch(e => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
