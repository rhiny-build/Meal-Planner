/**
 * Recipe Form Component
 *
 * Form for creating or editing recipes.
 * Supports both manual entry and AI-assisted import from URL.
 */

'use client'

import { useState } from 'react'
import type { RecipeWithIngredients, RecipeFormData } from '@/types'
import Button from './Button'
import Select from './Select'
import AIImportSection from './AIImportSection'
import { PROTEIN_OPTIONS, CARB_OPTIONS } from '@/lib/dishTypeConfig'
import { formatIngredient } from '@/lib/ingredientHelpers'
import { PREP_TIME_OPTIONS, TIER_OPTIONS } from '@/lib/recipeFormConfig'

interface RecipeFormProps {
  recipe?: RecipeWithIngredients // If provided, we're editing; otherwise, creating
  onSubmit: (data: RecipeFormData) => Promise<void>
  onCancel: () => void
}

export default function RecipeForm({
  recipe,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  // Build ingredients text from structured ingredients if available
  const getInitialIngredientsText = () => {
    if (recipe?.structuredIngredients && recipe.structuredIngredients.length > 0) {
      return recipe.structuredIngredients.map(formatIngredient).join('\n')
    }
    return recipe?.ingredients || ''
  }

  // Form state
  const [formData, setFormData] = useState<RecipeFormData>({
    name: recipe?.name || '',
    recipeUrl: recipe?.recipeUrl || '',
    ingredients: getInitialIngredientsText(),
    structuredIngredients: undefined,
    proteinType: (recipe?.proteinType as any) || '',
    carbType: (recipe?.carbType as any) || '',
    vegetableType: (recipe?.vegetableType as any) || '',
    isLunchAppropriate: recipe?.isLunchAppropriate || false,
    prepTime: (recipe?.prepTime as any) || 'quick',
    tier: (recipe?.tier as any) || 'favorite',
  })

  // AI import state
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // Handle AI import from URL
  const handleImport = async () => {
    if (!formData.recipeUrl?.trim()) {
      setImportError('Please enter a recipe URL')
      return
    }

    setIsImporting(true)
    setImportError('')

    try {
      const response = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.recipeUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract recipe')
      }

      const data = await response.json()

      // Update form with extracted data
      setFormData({
        ...formData,
        ingredients: data.ingredients || formData.ingredients,
        structuredIngredients: data.structuredIngredients || undefined,
        name: data.name || formData.name,
      })

     
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Failed to import recipe'
      )
    } finally {
      setIsImporting(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* AI Import Section */}
      <AIImportSection
        recipeUrl={formData.recipeUrl || ''}
        onUrlChange={handleChange}
        onImport={handleImport}
        isImporting={isImporting}
        importError={importError}
      />

      {/* Recipe Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Recipe Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* Ingredients */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Ingredients (one per line) <span className="text-red-600">*</span>
        </label>
        <textarea
          name="ingredients"
          value={formData.ingredients}
          onChange={handleChange}
          required
          rows={6}
          placeholder="4 chicken breasts&#10;2 cups rice&#10;Salt and pepper"
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      {/* Protein Type */}
      <Select
        name="proteinType"
        value={formData.proteinType || ''}
        onChange={handleChange}
        options={PROTEIN_OPTIONS}
        label="Protein Type"
      />

      {/* Carb Type */}
      <Select
        name="carbType"
        value={formData.carbType || ''}
        onChange={handleChange}
        options={CARB_OPTIONS}
        label="Carb Type"
      />

      {/* Vegetable Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="vegetableType"
          name="vegetableType"
          checked={!!formData.vegetableType}
          onChange={(e) => {
            setFormData({
              ...formData,
              vegetableType: e.target.checked ? 'vegetable' : undefined,
            })
          }}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
        />
        <label htmlFor="vegetableType" className="text-sm font-medium">
          Includes vegetables
        </label>
      </div>

      {/* Lunch Appropriate Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isLunchAppropriate"
          name="isLunchAppropriate"
          checked={!!formData.isLunchAppropriate}
          onChange={(e) => {
            setFormData({
              ...formData,
              isLunchAppropriate: e.target.checked,
            })
          }}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
        />
        <label htmlFor="isLunchAppropriate" className="text-sm font-medium">
          Good for lunch
        </label>
      </div>

      {/* Prep Time */}
      <Select
        name="prepTime"
        value={formData.prepTime}
        onChange={handleChange}
        options={PREP_TIME_OPTIONS}
        label="Prep Time"
        required
      />

      {/* Tier */}
      <Select
        name="tier"
        value={formData.tier}
        onChange={handleChange}
        options={TIER_OPTIONS}
        label="Recipe Tier"
        required
      />

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : recipe
              ? 'Update Recipe'
              : 'Create Recipe'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
