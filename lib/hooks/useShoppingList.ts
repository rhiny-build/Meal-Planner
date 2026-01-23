/**
 * useShoppingList Hook
 *
 * Manages shopping list state and API interactions
 */

import { useState, useEffect, useCallback } from 'react'
import { getMonday } from '@/lib/dateUtils'
import type { ShoppingListWithItems } from '@/types'

export function useShoppingList() {
  const [startDate, setStartDate] = useState<Date>(getMonday(new Date()))
  const [shoppingList, setShoppingList] = useState<ShoppingListWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchShoppingList = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/shopping-list?weekStart=${startDate.toISOString()}`
      )
      const data = await response.json()
      setShoppingList(data)
    } catch (error) {
      console.error('Error fetching shopping list:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startDate])

  useEffect(() => {
    fetchShoppingList()
  }, [fetchShoppingList])

  const goToPreviousWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 7)
    setStartDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 7)
    setStartDate(newDate)
  }

  const generateList = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/shopping-list/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: startDate.toISOString() }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate shopping list')
      }

      const data = await response.json()
      setShoppingList(data)
    } catch (error) {
      console.error('Error generating shopping list:', error)
      alert('Failed to generate shopping list')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleItem = async (itemId: string, checked: boolean) => {
    try {
      const response = await fetch('/api/shopping-list/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, checked }),
      })

      if (response.ok) {
        setShoppingList((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
          }
        })
      }
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  const addItem = async (name: string) => {
    if (!shoppingList) return false

    try {
      const response = await fetch('/api/shopping-list/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoppingListId: shoppingList.id,
          name,
        }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setShoppingList((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: [...prev.items, newItem],
          }
        })
        return true
      }
    } catch (error) {
      console.error('Error adding item:', error)
    }
    return false
  }

  return {
    startDate,
    shoppingList,
    isLoading,
    isGenerating,
    goToPreviousWeek,
    goToNextWeek,
    generateList,
    toggleItem,
    addItem,
  }
}
