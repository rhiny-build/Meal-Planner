'use client'

import { useState } from 'react'

// Dummy data
const thisWeekItems = [
  { id: '1', name: 'Chicken breast', quantity: '2', unit: 'lbs', checked: false },
  { id: '2', name: 'Rice', quantity: '1', unit: 'kg', checked: true },
  { id: '3', name: 'Broccoli', quantity: '2', unit: 'heads', checked: false },
  { id: '4', name: 'Olive oil', quantity: '1', unit: 'bottle', checked: false },
  { id: '5', name: 'Garlic', quantity: '1', unit: 'head', checked: true },
]

const staples = [
  { id: 's1', name: 'Bread', quantity: '1', unit: 'loaf' },
  { id: 's2', name: 'Milk', quantity: '2', unit: 'L' },
  { id: 's3', name: 'Eggs', quantity: '12', unit: 'pcs' },
  { id: 's4', name: 'Butter', quantity: '1', unit: 'pack' },
  { id: 's5', name: 'Cheese', quantity: '200', unit: 'g' },
]

const restockItems = [
  { id: 'r1', name: 'Toilet paper', quantity: '12', unit: 'rolls' },
  { id: 'r2', name: 'Dish soap', quantity: '1', unit: 'bottle' },
  { id: 'r3', name: 'Salt', quantity: '1', unit: 'kg' },
  { id: 'r4', name: 'Olive oil', quantity: '1', unit: 'L' },
  { id: 'r5', name: 'Paper towels', quantity: '6', unit: 'rolls' },
]

export default function AccordionMockup() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set(['2', '5']))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['thisWeek']))

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
    <svg
      className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Option 2: Accordion</h1>

        <div className="space-y-2">
          {/* This Week Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => toggleSection('thisWeek')}
              className="w-full p-4 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">This Week</span>
                <span className="text-sm text-gray-500">(Week of Feb 3)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{thisWeekItems.length} items</span>
                <ChevronIcon expanded={expandedSections.has('thisWeek')} />
              </div>
            </button>

            {expandedSections.has('thisWeek') && (
              <>
                <ul className="divide-y">
                  {thisWeekItems.map(item => (
                    <li key={item.id} className="p-4 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checkedItems.has(item.id)}
                        onChange={() => toggleCheck(item.id)}
                        className="w-5 h-5 rounded"
                      />
                      <span className={checkedItems.has(item.id) ? 'line-through text-gray-400' : ''}>
                        {item.name}
                      </span>
                      <span className="ml-auto text-sm text-gray-500">
                        {item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="p-4 border-t flex gap-2">
                  <input
                    type="text"
                    placeholder="Add item..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800">
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Staples Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => toggleSection('staples')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Staples</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{staples.length} items</span>
                <ChevronIcon expanded={expandedSections.has('staples')} />
              </div>
            </button>

            {expandedSections.has('staples') && (
              <>
                <div className="px-4 pb-2">
                  <p className="text-sm text-gray-500">
                    Auto-added weekly. Manage your regular items here.
                  </p>
                </div>
                <ul className="divide-y">
                  {staples.map(item => (
                    <li key={item.id} className="p-4 flex items-center gap-3">
                      <span className="flex-1">{item.name}</span>
                      <span className="text-sm text-gray-500">
                        {item.quantity} {item.unit}
                      </span>
                      <button className="text-gray-400 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="p-4 border-t">
                  <input
                    type="text"
                    placeholder="Add staple..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {/* Restock Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => toggleSection('restock')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">Restock Items</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{restockItems.length} items</span>
                <ChevronIcon expanded={expandedSections.has('restock')} />
              </div>
            </button>

            {expandedSections.has('restock') && (
              <>
                <div className="px-4 pb-2">
                  <p className="text-sm text-gray-500">
                    Household items. Add to this week's list when needed.
                  </p>
                </div>
                <ul className="divide-y">
                  {restockItems.map(item => (
                    <li key={item.id} className="p-4 flex items-center gap-3">
                      <span className="flex-1">{item.name}</span>
                      <span className="text-sm text-gray-500">
                        {item.quantity} {item.unit}
                      </span>
                      <button className="text-gray-400 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="p-4 border-t">
                  <input
                    type="text"
                    placeholder="Add restock item..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          <a href="/mockups/tabs" className="hover:underline">← Tabs</a>
          {' | '}
          <a href="/mockups/modal" className="hover:underline">Modal →</a>
        </p>
      </div>
    </div>
  )
}
