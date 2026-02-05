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

type ModalType = 'staples' | 'restock' | null

export default function ModalMockup() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set(['2', '5']))
  const [openModal, setOpenModal] = useState<ModalType>(null)

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
        <h1 className="text-xl font-bold mb-4">Option 3: Modal/Settings</h1>

        {/* Main Shopping List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <span className="font-medium">Shopping List</span>
              <span className="text-sm text-gray-500 ml-2">Week of Feb 3</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Generate
              </button>
              <button
                onClick={() => setOpenModal('staples')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                title="Manage lists"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
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

        {/* Modal */}
        {openModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-medium">Manage Lists</h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setOpenModal('staples')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    openModal === 'staples'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  Staples
                </button>
                <button
                  onClick={() => setOpenModal('restock')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    openModal === 'restock'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  Restock
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto">
                {openModal === 'staples' && (
                  <>
                    <div className="p-4 bg-gray-50 text-sm text-gray-500">
                      Items bought every week. Auto-added when you generate a list.
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
                  </>
                )}

                {openModal === 'restock' && (
                  <>
                    <div className="p-4 bg-gray-50 text-sm text-gray-500">
                      Household items. Select which ones to add each week.
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
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t">
                <input
                  type="text"
                  placeholder={openModal === 'staples' ? 'Add staple...' : 'Add restock item...'}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          <a href="/mockups/accordion" className="hover:underline">← Accordion</a>
          {' | '}
          <a href="/mockups/tabs" className="hover:underline">Tabs →</a>
        </p>
      </div>
    </div>
  )
}
