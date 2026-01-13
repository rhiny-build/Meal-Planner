/**
 * Home Page
 *
 * The landing page for the meal planner app.
 * Provides quick links to main features and a brief overview.
 */

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">
        Welcome to Family Meal Planner
      </h1>

      <p className="text-lg mb-8 text-gray-700 dark:text-gray-300">
        Plan your family's meals for the week with ease. Manage your recipe
        library and generate weekly meal plans that fit your family's
        preferences.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recipe Management Card */}
        <Link
          href="/recipes"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-2xl font-semibold mb-3 text-blue-600">
            Recipe Library
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add, view, and manage your family's recipes. Import recipes from
            URLs or add them manually.
          </p>
          <div className="text-blue-600 font-medium">Manage Recipes →</div>
        </Link>

        {/* Meal Planning Card */}
        <Link
          href="/meal-plan"
          className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-2xl font-semibold mb-3 text-green-600">
            Weekly Meal Plan
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a weekly meal plan or view your current plan. Customize it
            to your family's needs.
          </p>
          <div className="text-green-600 font-medium">View Meal Plan →</div>
        </Link>
      </div>

      {/* Features List */}
      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Features:</h3>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>
              Organize recipes by protein type, carb type, and prep time
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>AI-powered recipe import from URLs</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>
              Smart weekly meal plan generation based on your preferences
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>
              Drag-and-drop meal plan editing for easy customization
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>
              Natural language modifications: "swap Tuesday for something
              faster"
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
