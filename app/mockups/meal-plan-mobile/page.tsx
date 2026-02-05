'use client'

/**
 * Meal Plan Mobile Layout Mockups
 *
 * Test page to compare 3 different mobile layout options.
 * Open this on your phone and scroll through to see which feels best.
 *
 * DELETE THIS FILE after selecting a layout.
 */

import { useState } from 'react'

// Sample data to simulate a real meal plan
const SAMPLE_WEEK = [
  {
    day: 'Monday',
    date: 'Feb 3',
    lunch: 'Leftover Chicken Stir Fry',
    protein: 'Grilled Chicken Breast',
    carb: 'Roasted Potatoes',
    vegetable: 'Steamed Broccoli',
  },
  {
    day: 'Tuesday',
    date: 'Feb 4',
    lunch: 'Tuna Sandwich',
    protein: 'Salmon Fillet',
    carb: 'Quinoa Pilaf',
    vegetable: 'Roasted Asparagus',
  },
  {
    day: 'Wednesday',
    date: 'Feb 5',
    lunch: 'Caesar Salad',
    protein: 'Beef Tacos',
    carb: 'Spanish Rice',
    vegetable: 'Grilled Peppers',
  },
  {
    day: 'Thursday',
    date: 'Feb 6',
    lunch: 'Soup & Bread',
    protein: 'Chicken Parmesan',
    carb: 'Spaghetti',
    vegetable: 'Garden Salad',
  },
  {
    day: 'Friday',
    date: 'Feb 7',
    lunch: 'Leftover Pasta',
    protein: 'Fish & Chips',
    carb: 'Fries',
    vegetable: 'Coleslaw',
  },
  {
    day: 'Saturday',
    date: 'Feb 8',
    lunch: 'Grilled Cheese',
    protein: 'BBQ Ribs',
    carb: 'Corn on the Cob',
    vegetable: 'Baked Beans',
  },
  {
    day: 'Sunday',
    date: 'Feb 9',
    lunch: 'Brunch',
    protein: 'Roast Chicken',
    carb: 'Mashed Potatoes',
    vegetable: 'Roasted Carrots',
  },
]

type LayoutOption = 'cards' | 'swipe' | 'scroll'

export default function MealPlanMobileMockup() {
  const [layout, setLayout] = useState<LayoutOption>('cards')
  const [currentDay, setCurrentDay] = useState(0) // For swipe layout

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Layout Selector */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
        <h1 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
          Choose a Layout
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setLayout('cards')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              layout === 'cards'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            A: Cards
          </button>
          <button
            onClick={() => setLayout('swipe')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              layout === 'swipe'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            B: Swipe
          </button>
          <button
            onClick={() => setLayout('scroll')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              layout === 'scroll'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            C: Scroll
          </button>
        </div>
      </div>

      {/* Layout Description */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {layout === 'cards' && 'Option A: Each day is a card. Scroll down to see the week.'}
          {layout === 'swipe' && 'Option B: One day at a time. Tap arrows to navigate.'}
          {layout === 'scroll' && 'Option C: Table view. Scroll horizontally to see all days.'}
        </p>
      </div>

      {/* Option A: Stacked Cards */}
      {layout === 'cards' && (
        <div className="p-4 space-y-4">
          {SAMPLE_WEEK.map((day, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-blue-600 dark:bg-blue-700 px-4 py-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{day.day}</span>
                  <span className="text-blue-100 text-sm">{day.date}</span>
                </div>
              </div>

              {/* Meals */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <div className="px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Lunch
                  </div>
                  <div className="text-gray-900 dark:text-white">{day.lunch}</div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Protein
                  </div>
                  <div className="text-gray-900 dark:text-white">{day.protein}</div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Carb
                  </div>
                  <div className="text-gray-900 dark:text-white">{day.carb}</div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Vegetable
                  </div>
                  <div className="text-gray-900 dark:text-white">{day.vegetable}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Option B: Swipeable Days */}
      {layout === 'swipe' && (
        <div className="p-4">
          {/* Day Indicator Dots */}
          <div className="flex justify-center gap-2 mb-4">
            {SAMPLE_WEEK.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentDay(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentDay
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Current Day Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Day Header with Navigation */}
            <div className="bg-blue-600 dark:bg-blue-700 px-4 py-3">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentDay(Math.max(0, currentDay - 1))}
                  disabled={currentDay === 0}
                  className="p-1 text-white disabled:opacity-30"
                >
                  ← Prev
                </button>
                <div className="text-center">
                  <div className="font-bold text-white">{SAMPLE_WEEK[currentDay].day}</div>
                  <div className="text-blue-100 text-sm">{SAMPLE_WEEK[currentDay].date}</div>
                </div>
                <button
                  onClick={() => setCurrentDay(Math.min(6, currentDay + 1))}
                  disabled={currentDay === 6}
                  className="p-1 text-white disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Meals */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <div className="px-4 py-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Lunch
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {SAMPLE_WEEK[currentDay].lunch}
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Protein
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {SAMPLE_WEEK[currentDay].protein}
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Carb
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {SAMPLE_WEEK[currentDay].carb}
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Vegetable
                </div>
                <div className="text-lg text-gray-900 dark:text-white">
                  {SAMPLE_WEEK[currentDay].vegetable}
                </div>
              </div>
            </div>
          </div>

          {/* Swipe hint */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Tap the arrows or dots to navigate between days
          </p>
        </div>
      )}

      {/* Option C: Horizontal Scroll */}
      {layout === 'scroll' && (
        <div className="p-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="inline-flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
              {SAMPLE_WEEK.map((day, index) => (
                <div
                  key={index}
                  className="w-44 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex-shrink-0"
                >
                  {/* Day Header */}
                  <div className="bg-blue-600 dark:bg-blue-700 px-3 py-2 text-center">
                    <div className="font-bold text-white text-sm">{day.day}</div>
                    <div className="text-blue-100 text-xs">{day.date}</div>
                  </div>

                  {/* Meals - Compact */}
                  <div className="p-3 space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        Lunch
                      </div>
                      <div className="text-gray-900 dark:text-white truncate">
                        {day.lunch}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        Protein
                      </div>
                      <div className="text-gray-900 dark:text-white truncate">
                        {day.protein}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        Carb
                      </div>
                      <div className="text-gray-900 dark:text-white truncate">
                        {day.carb}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        Veg
                      </div>
                      <div className="text-gray-900 dark:text-white truncate">
                        {day.vegetable}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            ← Scroll horizontally to see all days →
          </p>
        </div>
      )}

      {/* Footer with instructions */}
      <div className="p-4 mt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-gray-900 dark:text-white mb-2">
          Which layout do you prefer?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Test each option by tapping the buttons at the top. Consider:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
          <li>• How easy is it to see the whole week?</li>
          <li>• How easy is it to find a specific day?</li>
          <li>• Does it feel natural to navigate?</li>
        </ul>
      </div>
    </div>
  )
}
