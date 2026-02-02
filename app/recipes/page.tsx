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

import { useState } from 'react'
import type { RecipeWithIngredients, RecipeFormData } from '@/types'
import { useRecipes } from '@/lib/hooks/useRecipes'
import RecipeCard from '@/components/RecipeCard'
import Button from '@/components/Button'
import RecipeFilters from './components/RecipeFilters'
import RecipeModal from './components/RecipeModal'
import InspireModal from './components/InspireModal'
import type { RecipeSuggestion } from '@/lib/aiService'

export default function RecipesPage() {
  const {
    recipes,
    filteredRecipes,
    filters,
    isLoading,
    handleFilterChange,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useRecipes()

  // State for add/edit modal
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | undefined>()

  // State for inspire modal
  const [showInspire, setShowInspire] = useState(false)

  const onSubmit = async (data: RecipeFormData): Promise<void> => {
    const success = editingRecipe
      ? await handleUpdate(editingRecipe.id, data)
      : await handleCreate(data)

    if (success) {
      setShowForm(false)
      setEditingRecipe(undefined)
    }
  }

  const onEdit = (recipe: RecipeWithIngredients) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  const onCancel = () => {
    setShowForm(false)
    setEditingRecipe(undefined)
  }

  const onDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      handleDelete(id)
    }
  }

  const onAcceptSuggestion = async (recipe: RecipeSuggestion): Promise<void> => {
    await handleCreate(recipe)
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowInspire(true)}>
            Inspire Me
          </Button>
          <Button onClick={() => setShowForm(true)}>Add Recipe</Button>
        </div>
      </div>

      {showForm && (
        <RecipeModal
          recipe={editingRecipe}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}

      {showInspire && (
        <InspireModal
          onAccept={onAcceptSuggestion}
          onClose={() => setShowInspire(false)}
        />
      )}

      <RecipeFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Showing {filteredRecipes.length} of {recipes.length} recipes
      </p>

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
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
