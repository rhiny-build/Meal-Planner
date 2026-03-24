'use client'

/**
 * useShoppingList Hook
 *
 * All state management, handlers, and derived data for the shopping list page.
 * Extracted from ShoppingListClient to keep the component focused on rendering.
 */

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getMonday } from '@/lib/dateUtils'
import { formatShoppingListAsText } from '@/lib/shopping-list/aggregateRecipeIngredients'
import {
  toggleItem,
  addItem,
  deleteShoppingListItem,
  syncMealIngredients,
  createIngredientMapping,
  addMasterListItem,
} from '../actions'
import type { EmbeddingSuggestion } from '../actions'
import type { ShoppingList, ShoppingListItem, Category, MasterListItem } from '@prisma/client'
import type { PendingSuggestion } from '../components/SuggestionRow'

export type Tab = 'meals' | 'staples' | 'restock' | 'list'
type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] }
type CategoryWithItems = Category & { items: MasterListItem[] }

interface UseShoppingListOptions {
  initialList: ShoppingListWithItems
  initialWeekStart: Date
  initialTab?: Tab
  categories: CategoryWithItems[]
}

export function useShoppingList({
  initialList,
  initialWeekStart,
  initialTab = 'meals',
  categories,
}: UseShoppingListOptions) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ShoppingListItem | null>(null)
  const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Optimistic updates for checkbox toggles
  const [optimisticItems, setOptimisticItem] = useOptimistic(
    initialList.items,
    (currentItems: ShoppingListItem[], update: { id: string; checked: boolean }) =>
      currentItems.map(item =>
        item.id === update.id ? { ...item, checked: update.checked } : item
      )
  )

  // URL-derived state
  const tabParam = searchParams.get('tab') as Tab | null
  const activeTab = tabParam || initialTab

  const weekParam = searchParams.get('week')
  const currentWeekStart = weekParam ? getMonday(new Date(weekParam)) : initialWeekStart

  // Navigation
  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'meals') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`/shopping-list?${params.toString()}`)
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', newDate.toISOString().split('T')[0])
    router.push(`/shopping-list?${params.toString()}`)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', newDate.toISOString().split('T')[0])
    router.push(`/shopping-list?${params.toString()}`)
  }

  // Handlers
  const handleToggle = (itemId: string, checked: boolean) => {
    startTransition(async () => {
      setOptimisticItem({ id: itemId, checked })
      try {
        await toggleItem(itemId, checked)
      } catch (error) {
        console.error('Error toggling item:', error)
        toast.error('Failed to update item')
      }
    })
  }

  const handleAddItem = async (name: string) => {
    if (!initialList) return
    startTransition(async () => {
      try {
        await addItem(initialList.id, name)
        setShowAddForm(false)
        toast.success('Item added!')
      } catch (error) {
        console.error('Error adding item:', error)
        toast.error('Failed to add item')
      }
    })
  }

  const handleAddToMasterList = (name: string, type: 'staple' | 'restock', categoryId: string) => {
    if (!initialList) return
    startTransition(async () => {
      try {
        await addMasterListItem(categoryId, name, type)
        await addItem(initialList.id, name)
        setShowAddForm(false)
        toast.success(`Added to shopping list and saved as ${type}!`)
      } catch (error) {
        console.error('Error adding item to master list:', error)
        toast.error('Failed to add item')
      }
    })
  }

  const handleExport = () => {
    if (!initialList || optimisticItems.length === 0) {
      toast.warning('No items to export')
      return
    }

    const text = formatShoppingListAsText(optimisticItems)

    navigator.clipboard.writeText(text).then(() => {
      toast.success('Shopping list copied to clipboard!')
    }).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast.success('Shopping list copied to clipboard!')
    })
  }

  const handleDeleteClick = (item: ShoppingListItem) => {
    setItemToDelete(item)
  }

  const handleMapToExisting = (masterItemId: string) => {
    if (!itemToDelete) return
    const name = itemToDelete.name
    const id = itemToDelete.id
    startTransition(async () => {
      try {
        await createIngredientMapping(name, masterItemId)
        await deleteShoppingListItem(id)
        setItemToDelete(null)
        toast.success('Mapped and removed!')
      } catch (error) {
        console.error('Error mapping item:', error)
        toast.error('Failed to map item')
      }
    })
  }

  const handleCreateAndMap = (name: string, type: 'staple' | 'restock', categoryId: string) => {
    if (!itemToDelete) return
    const recipeName = itemToDelete.name
    const itemId = itemToDelete.id
    startTransition(async () => {
      try {
        const newItem = await addMasterListItem(categoryId, name, type)
        await createIngredientMapping(recipeName, newItem.id)
        await deleteShoppingListItem(itemId)
        setItemToDelete(null)
        toast.success('Added to master list and mapped!')
      } catch (error) {
        console.error('Error creating and mapping item:', error)
        toast.error('Failed to create item')
      }
    })
  }

  const handleJustDelete = () => {
    if (!itemToDelete) return
    const id = itemToDelete.id
    startTransition(async () => {
      try {
        await deleteShoppingListItem(id)
        setItemToDelete(null)
        toast.success('Item removed')
      } catch (error) {
        console.error('Error deleting item:', error)
        toast.error('Failed to delete item')
      }
    })
  }

  const handleGenerateList = async () => {
    setIsGenerating(true)
    try {
      const result = await syncMealIngredients(currentWeekStart)
      if (result?.suggestions && result.suggestions.length > 0) {
        router.refresh()
        await new Promise((resolve) => setTimeout(resolve, 500))
        const suggestions = await buildPendingSuggestions(result.suggestions)
        if (suggestions.length > 0) {
          setPendingSuggestions(suggestions)
        } else {
          toast.success('Shopping list generated!')
        }
      } else {
        toast.success('Shopping list generated!')
        router.refresh()
      }
    } catch (error) {
      console.error('Error generating shopping list:', error)
      toast.error('Failed to generate shopping list')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReviewComplete = () => {
    setPendingSuggestions(null)
    router.refresh()
    toast.success('Shopping list ready!')
  }

  async function buildPendingSuggestions(
    suggestions: EmbeddingSuggestion[]
  ): Promise<PendingSuggestion[]> {
    const { getShoppingList } = await import('../actions')
    const freshList = await getShoppingList(currentWeekStart)
    if (!freshList) return []

    const pendingItems = freshList.items.filter((i) => i.matchConfidence === 'pending')

    const usedIds = new Set<string>()
    return suggestions
      .map((s) => {
        const dbItem = pendingItems.find(
          (i) =>
            !usedIds.has(i.id) &&
            i.name === s.ingredientName
        )
        if (!dbItem) return null
        usedIds.add(dbItem.id)
        return {
          shoppingListItemId: dbItem.id,
          ingredientName: s.ingredientName,
          normalisedName: s.normalisedName,
          suggestedMasterItemId: s.suggestedMasterItemId,
          suggestedMasterItemName: s.suggestedMasterItemName,
          score: s.score,
        }
      })
      .filter((s): s is PendingSuggestion => s !== null)
  }

  // Derived data
  const allMasterItems = categories.flatMap((c) => c.items)

  const staplesCategories = categories
    .map(cat => ({ ...cat, items: cat.items.filter(item => item.type === 'staple') }))
    .filter(cat => cat.items.length > 0)

  const restockCategories = categories
    .map(cat => ({ ...cat, items: cat.items.filter(item => item.type === 'restock') }))
    .filter(cat => cat.items.length > 0)

  const includedStapleNames = new Set(
    optimisticItems.filter(item => item.source === 'staple').map(item => item.name)
  )
  const includedRestockNames = new Set(
    optimisticItems.filter(item => item.source === 'restock').map(item => item.name)
  )

  return {
    // State
    isPending,
    isGenerating,
    showAddForm,
    setShowAddForm,
    itemToDelete,
    setItemToDelete,
    pendingSuggestions,
    optimisticItems,
    activeTab,
    currentWeekStart,

    // Navigation
    setActiveTab,
    goToPreviousWeek,
    goToNextWeek,

    // Handlers
    handleToggle,
    handleAddItem,
    handleAddToMasterList,
    handleExport,
    handleDeleteClick,
    handleMapToExisting,
    handleCreateAndMap,
    handleJustDelete,
    handleGenerateList,
    handleReviewComplete,

    // Derived data
    allMasterItems,
    staplesCategories,
    restockCategories,
    includedStapleNames,
    includedRestockNames,
  }
}
