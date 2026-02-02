/**
 * useShoppingList Hook
 *
 * Manages shopping list state and week navigation
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getMonday } from '@/lib/dateUtils'
import {
  fetchShoppingList,
  generateShoppingList,
  updateShoppingListItem,
  addShoppingListItem,
} from '@/lib/apiService'
import type { ShoppingListWithItems } from '@/types'

export function useShoppingList(initialWeek?: Date) {
  const [startDate, setStartDate] = useState<Date>(
    initialWeek ? getMonday(initialWeek) : getMonday(new Date())
  )
  const [shoppingList, setShoppingList] = useState<ShoppingListWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const loadList = useCallback(async () => {
    setIsLoading(true)
    const data = await fetchShoppingList(startDate)
    setShoppingList(data)
    setIsLoading(false)
  }, [startDate])

  useEffect(() => {
    loadList()
  }, [loadList])

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
      const data = await generateShoppingList(startDate)
      setShoppingList(data)
    } catch (error) {
      console.error('Error generating shopping list:', error)
      toast.error('Failed to generate shopping list')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleItem = async (itemId: string, checked: boolean) => {
    const updated = await updateShoppingListItem(itemId, { checked })
    if (updated) {
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
  }

  const addItem = async (name: string) => {
    if (!shoppingList) return false

    const newItem = await addShoppingListItem(shoppingList.id, name)
    if (newItem) {
      setShoppingList((prev) => {
        if (!prev) return prev
        return { ...prev, items: [...prev.items, newItem] }
      })
      return true
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
