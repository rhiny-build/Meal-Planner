/**
 * Recipes Client Component
 *
 * Client component for viewing and managing the recipe library.
 * Features:
 * - View all recipes in a grid
 * - Filter by tier, protein, carb, and prep time
 * - Add new recipes
 * - Edit existing recipes
 * - Delete recipes
 */

'use client'

import { useRef, useState } from 'react'
import type { RecipeWithIngredients, RecipeFormData } from '@/types'
import type { DishTypeOption } from '@/lib/dishTypeConfig'
import { useRecipes } from '@/lib/hooks/useRecipes'
import { usePageReady } from '@/lib/timing/usePageReady'
import RecipeCard from '@/components/RecipeCard'
import Button from '@/components/Button'
import PageHeader from '@/components/PageHeader'
import RecipeFilters from './RecipeFilters'
import RecipeModal from './RecipeModal'
import InspireModal from './InspireModal'
import RecipeImportModal from './RecipeImportModal'
import type { RecipeSuggestion } from '@/lib/aiService'

interface RecipesClientProps {
  proteinOptions: DishTypeOption[]
  carbOptions: DishTypeOption[]
  proteinFilterOptions: DishTypeOption[]
  carbFilterOptions: DishTypeOption[]
}

export default function RecipesClient({
  proteinOptions,
  carbOptions,
  proteinFilterOptions,
  carbFilterOptions,
}: RecipesClientProps) {
  const {
    recipes,
    filteredRecipes,
    filters,
    isLoading,
    refresh,
    handleFilterChange,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useRecipes()
  usePageReady(!isLoading)

  // State for add/edit modal
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | undefined>()

  // State for inspire modal
  const [showInspire, setShowInspire] = useState(false)

  // State for URL/description import modal. `autoStart` is set when it was opened by accepting
  // an Inspire Me suggestion: the suggestion's page is imported straight away.
  const [importRequest, setImportRequest] = useState<{ input: string; autoStart: boolean } | null>(
    null
  )
  // Resolves the Inspire Me "Accept" click: true when the recipe was saved, false when discarded.
  const pendingAccept = useRef<((saved: boolean) => void) | null>(null)

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

  // Accepting a suggestion runs its page through the recipe importer (same agent as Import), so
  // the method, servings and steps come in, then the normal review screen asks to save.
  const onAcceptSuggestion = (recipe: RecipeSuggestion): Promise<boolean> =>
    new Promise((resolve) => {
      pendingAccept.current?.(false)
      pendingAccept.current = resolve
      setImportRequest({
        input: recipe.recipeUrl?.trim() || `${recipe.name}: ${recipe.ingredients}`,
        autoStart: true,
      })
    })

  const onImportSaved = async () => {
    await refresh()
    pendingAccept.current?.(true)
    pendingAccept.current = null
  }

  const onImportClose = () => {
    setImportRequest(null)
    pendingAccept.current?.(false)
    pendingAccept.current = null
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Loading recipes...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl md:max-w-5xl mx-auto px-4">
      <PageHeader title="Recipes" eyebrow={`${recipes.length} in the book`} />
      <div className="flex flex-wrap gap-2 pb-4">
        <Button onClick={() => setShowForm(true)}>Add Recipe</Button>
        <Button variant="secondary" onClick={() => setImportRequest({ input: '', autoStart: false })}>
          Import
        </Button>
        <Button variant="secondary" onClick={() => setShowInspire(true)}>
          Inspire Me
        </Button>
      </div>

      {showForm && (
        <RecipeModal
          recipe={editingRecipe}
          onSubmit={onSubmit}
          onCancel={onCancel}
          proteinOptions={proteinOptions}
          carbOptions={carbOptions}
        />
      )}

      {showInspire && (
        <InspireModal
          onAccept={onAcceptSuggestion}
          onClose={() => setShowInspire(false)}
        />
      )}

      {/* After Inspire Me in the DOM so it stacks above it when opened from a suggestion. */}
      {importRequest && (
        <RecipeImportModal
          initialInput={importRequest.input}
          autoStart={importRequest.autoStart}
          onSaved={onImportSaved}
          onClose={onImportClose}
        />
      )}

      <RecipeFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        proteinOptions={proteinFilterOptions}
        carbOptions={carbFilterOptions}
      />

      <p className="text-sm text-ink-soft mb-3 px-1">
        Showing {filteredRecipes.length} of {recipes.length} recipes
      </p>

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-2xl">
          <p className="text-ink-soft">
            No recipes found. {recipes.length === 0 ? 'Add your first recipe!' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
