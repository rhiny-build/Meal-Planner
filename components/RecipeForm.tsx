/**
 * Recipe Form Component
 *
 * Form for creating or editing recipes.
 * Supports both manual entry and AI-assisted import from text/URL.
 */

'use client'

import { useState } from 'react'
import type { Recipe, RecipeFormData } from '@/types'
import Button from './Button'
import Select from './Select'

// Select options
const PROTEIN_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'fish', label: 'Fish' },
  { value: 'red-meat', label: 'Red Meat' },
  { value: 'vegetarian', label: 'Vegetarian' },
]

const CARB_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'rice', label: 'Rice' },
  { value: 'pasta', label: 'Pasta' },
  { value: 'couscous', label: 'Couscous' },
  { value: 'fries', label: 'Fries' },
  { value: 'other', label: 'Other' },
]

const PREP_TIME_OPTIONS = [
  { value: 'quick', label: 'Quick (<30 min)' },
  { value: 'medium', label: 'Medium (30-60 min)' },
  { value: 'long', label: 'Long (>60 min)' },
]

const TIER_OPTIONS = [
  { value: 'favorite', label: 'Favorite' },
  { value: 'non-regular', label: 'Non-Regular' },
  { value: 'new', label: 'New' },
]

interface RecipeFormProps {
  recipe?: Recipe // If provided, we're editing; otherwise, creating
  onSubmit: (data: RecipeFormData) => Promise<void>
  onCancel: () => void
}

export default function RecipeForm({
  recipe,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  // Form state
  const [formData, setFormData] = useState<RecipeFormData>({
    name: recipe?.name || '',
    recipeUrl: recipe?.recipeUrl || '',
    ingredients: recipe?.ingredients || '',
    proteinType: (recipe?.proteinType as any) || '',
    carbType: (recipe?.carbType as any) || '',
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

  // Handle AI import from pasted text
  const handleImport = async () => {
    if (!formData.recipeUrl?.trim()) {
      setImportError('Please paste some recipe text')
      return
    }

    setIsImporting(true)
    setImportError('')

    try {
      const response = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.recipeUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract recipe')
      }

      const data = await response.json()

      // Update form with extracted data
      setFormData({
        ...formData,
        ingredients: data.ingredients || formData.ingredients,
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
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">
          AI-Assisted Import (Optional)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Paste recipe URL and let AI extract the ingredients and name for
          you.
        </p>
        <input
          name="recipeUrl"
          type="url"
          value={formData.recipeUrl}
          onChange={handleChange}
          placeholder="Paste url text here..."
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          
        />
        {importError && (
          <p className="text-red-600 text-sm mb-2">{importError}</p>
        )}
        <Button
          type="button"
          onClick={handleImport}
          disabled={isImporting}
          size="sm"
        >
          {isImporting ? 'Extracting...' : 'Extract Ingredients'}
        </Button>
      </div>

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
