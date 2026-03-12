'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getMonday } from '@/lib/dateUtils'
import { formatShoppingListAsText } from '@/lib/shoppingListHelpers'
import { toggleItem, addItem, deleteShoppingListItem } from '../actions'
import { createIngredientMapping } from '../ingredientMappingActions'
import { addMasterListItem } from '../masterListActions'
import type { ShoppingList, ShoppingListItem, Category, MasterListItem } from '@prisma/client'

type Tab = 'meals' | 'staples' | 'restock' | 'list'
type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] }
type CategoryWithItems = Category & { items: MasterListItem[] }

interface UseShoppingListParams {
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
}: UseShoppingListParams) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ShoppingListItem | null>(null)

  // Optimistic updates for checkbox toggling — see ShoppingListClient for full explanation
  const [optimisticItems, setOptimisticItem] = useOptimistic(
    initialList.items,
    (currentItems: ShoppingListItem[], update: { id: string; checked: boolean }) =>
      currentItems.map(item =>
        item.id === update.id ? { ...item, checked: update.checked } : item
      )
  )

  // Tab & week navigation (derived from URL)
  const tabParam = searchParams.get('tab') as Tab | null
  const activeTab = tabParam || initialTab

  const weekParam = searchParams.get('week')
  const currentWeekStart = weekParam ? getMonday(new Date(weekParam)) : initialWeekStart

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'meals') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.push(`/shopping-list?${params.toString()}`)
  }

  const navigateToWeek = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', date.toISOString().split('T')[0])
    router.push(`/shopping-list?${params.toString()}`)
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    navigateToWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    navigateToWeek(newDate)
  }

  // --- Handlers ---

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

  // --- Derived data ---

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
    showAddForm,
    setShowAddForm,
    itemToDelete,
    setItemToDelete,
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

    // Derived
    staplesCategories,
    restockCategories,
    includedStapleNames,
    includedRestockNames,
  }
}
