/**
 * Recipes Page
 *
 * Main page for viewing and managing the recipe library.
 * Features:
 * - View all recipes in a grid
 * - Filter by tier, protein, carb, and prep time
 * - Add new recipes
 * - Edit existing recipes
 * - Delete recipes
 */

'use client'

import { useState, useEffect } from 'react'
import type { Recipe, RecipeFilters, RecipeFormData } from '@/types'
import RecipeCard from '@/components/RecipeCard'
import RecipeForm from '@/components/RecipeForm'
import Button from '@/components/Button'

export default function RecipesPage() {
  // State for recipes and filters
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [isLoading, setIsLoading] = useState(true)

  // State for add/edit modal
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>()

  // Fetch recipes on mount
  useEffect(() => {
    fetchRecipes()
  }, [])

  // Apply filters when recipes or filters change
  useEffect(() => {
    applyFilters()
  }, [recipes, filters])

  // Fetch all recipes from API
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

  // Apply client-side filters
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

  // Handle filter changes
  const handleFilterChange = (filterName: keyof RecipeFilters, value: string) => {
    setFilters({
      ...filters,
      [filterName]: value === 'all' ? undefined : value,
    })
  }

  // Handle creating a new recipe
  const handleCreate = async (data: RecipeFormData) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchRecipes()
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error creating recipe:', error)
      alert('Failed to create recipe')
    }
  }

  // Handle updating an existing recipe
  const handleUpdate = async (data: RecipeFormData) => {
    if (!editingRecipe) return

    try {
      const response = await fetch(`/api/recipes/${editingRecipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchRecipes()
        setShowForm(false)
        setEditingRecipe(undefined)
      }
    } catch (error) {
      console.error('Error updating recipe:', error)
      alert('Failed to update recipe')
    }
  }

  // Handle deleting a recipe
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRecipes()
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe')
    }
  }

  // Handle edit button click
  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  // Handle form cancel
  const handleCancel = () => {
    setShowForm(false)
    setEditingRecipe(undefined)
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Loading recipes...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Recipe Library</h1>
        <Button onClick={() => setShowForm(true)}>Add Recipe</Button>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full my-8">
            <h2 className="text-2xl font-bold mb-4">
              {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
            </h2>
            <RecipeForm
              recipe={editingRecipe}
              onSubmit={editingRecipe ? handleUpdate : handleCreate}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tier Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Tier</label>
            <select
              value={filters.tier || 'all'}
              onChange={e => handleFilterChange('tier', e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All</option>
              <option value="favorite">Favorite</option>
              <option value="non-regular">Non-Regular</option>
              <option value="new">New</option>
            </select>
          </div>

          {/* Protein Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Protein</label>
            <select
              value={filters.proteinType || 'all'}
              onChange={e => handleFilterChange('proteinType', e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All</option>
              <option value="chicken">Chicken</option>
              <option value="fish">Fish</option>
              <option value="red-meat">Red Meat</option>
              <option value="vegetarian">Vegetarian</option>
            </select>
          </div>

          {/* Carb Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Carb</label>
            <select
              value={filters.carbType || 'all'}
              onChange={e => handleFilterChange('carbType', e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All</option>
              <option value="rice">Rice</option>
              <option value="pasta">Pasta</option>
              <option value="couscous">Couscous</option>
              <option value="fries">Fries</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Prep Time Filter */}
          <div>
            <label className="block text-sm font-medium mb-1">Prep Time</label>
            <select
              value={filters.prepTime || 'all'}
              onChange={e => handleFilterChange('prepTime', e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">All</option>
              <option value="quick">Quick</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recipe Count */}
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Showing {filteredRecipes.length} of {recipes.length} recipes
      </p>

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-600 dark:text-gray-400">
            No recipes found. {recipes.length === 0 ? 'Add your first recipe!' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
