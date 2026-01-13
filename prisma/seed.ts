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
      name: 'Grilled Chicken with Rice',
      ingredients: `4 chicken breasts
2 cups white rice
2 tbsp olive oil
Salt and pepper
Garlic powder
Lemon juice`,
      proteinType: 'chicken',
      carbType: 'rice',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Salmon Pasta Primavera',
      ingredients: `4 salmon fillets
1 lb pasta
2 cups mixed vegetables
3 cloves garlic
1 cup cream
Parmesan cheese
Olive oil`,
      proteinType: 'fish',
      carbType: 'pasta',
      prepTime: 'medium',
      tier: 'favorite',
    },
    {
      name: 'Beef Stir-Fry with Noodles',
      ingredients: `1 lb beef strips
1 package rice noodles
2 bell peppers
1 onion
Soy sauce
Ginger
Garlic
Sesame oil`,
      proteinType: 'red-meat',
      carbType: 'other',
      prepTime: 'quick',
      tier: 'favorite',
    },
    {
      name: 'Vegetarian Couscous Bowl',
      ingredients: `2 cups couscous
1 can chickpeas
2 cups mixed vegetables
Feta cheese
Olive oil
Lemon
Fresh herbs`,
      proteinType: 'vegetarian',
      carbType: 'couscous',
      prepTime: 'quick',
      tier: 'non-regular',
    },
    {
      name: 'Fish Tacos with Rice',
      ingredients: `4 white fish fillets
Taco shells
2 cups rice
Cabbage slaw
Lime
Cilantro
Sour cream
Avocado`,
      proteinType: 'fish',
      carbType: 'rice',
      prepTime: 'medium',
      tier: 'favorite',
    },
    {
      name: 'Chicken Parmesan with Pasta',
      ingredients: `4 chicken breasts
1 lb spaghetti
2 cups marinara sauce
Mozzarella cheese
Parmesan cheese
Breadcrumbs
Eggs
Italian seasoning`,
      proteinType: 'chicken',
      carbType: 'pasta',
      prepTime: 'long',
      tier: 'favorite',
    },
    {
      name: 'Beef Stew with Fries',
      ingredients: `2 lbs beef chunks
4 potatoes
3 carrots
2 onions
Beef broth
Tomato paste
Thyme
Bay leaves
Red wine`,
      proteinType: 'red-meat',
      carbType: 'fries',
      prepTime: 'long',
      tier: 'non-regular',
    },
    {
      name: 'Veggie Burger with Fries',
      ingredients: `4 veggie burger patties
Burger buns
Frozen fries
Lettuce
Tomato
Onion
Pickles
Condiments`,
      proteinType: 'vegetarian',
      carbType: 'fries',
      prepTime: 'quick',
      tier: 'non-regular',
    },
    {
      name: 'Thai Curry with Rice',
      ingredients: `1 lb chicken or tofu
2 cups rice
1 can coconut milk
Thai curry paste
Mixed vegetables
Fish sauce
Lime
Basil`,
      proteinType: 'chicken',
      carbType: 'rice',
      prepTime: 'medium',
      tier: 'new',
    },
    {
      name: 'Mediterranean Pasta Salad',
      ingredients: `1 lb pasta
Cherry tomatoes
Cucumbers
Olives
Feta cheese
Red onion
Olive oil
Lemon
Oregano`,
      proteinType: 'vegetarian',
      carbType: 'pasta',
      prepTime: 'quick',
      tier: 'favorite',
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
