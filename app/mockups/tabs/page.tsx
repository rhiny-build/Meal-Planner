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

type Tab = 'thisWeek' | 'staples' | 'restock'

export default function TabsMockup() {
  const [activeTab, setActiveTab] = useState<Tab>('thisWeek')
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set(['2', '5']))

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Option 1: Tabs</h1>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('thisWeek')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'thisWeek'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveTab('staples')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'staples'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Staples
          </button>
          <button
            onClick={() => setActiveTab('restock')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'restock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Restock
          </button>
        </div>

        {/* This Week Tab */}
        {activeTab === 'thisWeek' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="text-sm text-gray-500">Week of Feb 3</span>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Generate
              </button>
            </div>
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
            <div className="p-4 border-t">
              <input
                type="text"
                placeholder="Add item..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* Staples Tab */}
        {activeTab === 'staples' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <p className="text-sm text-gray-500">
                Items bought every week. These are automatically added when you generate a shopping list.
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
          </div>
        )}

        {/* Restock Tab */}
        {activeTab === 'restock' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <p className="text-sm text-gray-500">
                Household items to restock as needed. Select which ones to add to this week's list.
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
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          <a href="/mockups/accordion" className="hover:underline">Next: Accordion →</a>
        </p>
      </div>
    </div>
  )
}
