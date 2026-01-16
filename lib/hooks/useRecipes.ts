/**
 * useRecipes Hook
 *
 * Manages state and operations for the recipe library
 */

import { useState, useEffect } from 'react'
import type { Recipe, RecipeFilters, RecipeFormData } from '@/types'

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [isLoading, setIsLoading] = useState(true)

  // Fetch recipes on mount
  useEffect(() => {
    fetchRecipes()
  }, [])

  // Apply filters when recipes or filters change
  useEffect(() => {
    applyFilters()
  }, [recipes, filters])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      setRecipes(data)
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...recipes]

    if (filters.tier) {
      filtered = filtered.filter(r => r.tier === filters.tier)
    }
    if (filters.proteinType) {
      filtered = filtered.filter(r => r.proteinType === filters.proteinType)
    }
    if (filters.carbType) {
      filtered = filtered.filter(r => r.carbType === filters.carbType)
    }
    if (filters.prepTime) {
      filtered = filtered.filter(r => r.prepTime === filters.prepTime)
    }

    setFilteredRecipes(filtered)
  }

  const handleFilterChange = (filterName: keyof RecipeFilters, value: string) => {
    setFilters({
      ...filters,
      [filterName]: value === 'all' ? undefined : value,
    })
  }

  const handleCreate = async (data: RecipeFormData) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchRecipes()
        return true
      }
      return false
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Failed to create recipe')
      return false
    }
  }

  const handleUpdate = async (id: string, data: RecipeFormData) => {
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchRecipes()
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating recipe:', error)
      alert('Failed to update recipe')
      return false
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return false

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRecipes()
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
      return false
    }
  }

  return {
    recipes,
    filteredRecipes,
    filters,
    isLoading,
    handleFilterChange,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
