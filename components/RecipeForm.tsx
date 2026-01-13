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
    ingredients: recipe?.ingredients || '',
    proteinType: (recipe?.proteinType as any) || '',
    carbType: (recipe?.carbType as any) || '',
    prepTime: (recipe?.prepTime as any) || 'quick',
    tier: (recipe?.tier as any) || 'favorite',
  })

  // AI import state
  const [importText, setImportText] = useState('')
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
    if (!importText.trim()) {
      setImportError('Please paste some recipe text')
      return
    }

    setIsImporting(true)
    setImportError('')

    try {
      const response = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
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

      setImportText('')
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
          Paste recipe text and let AI extract the ingredients and name for
          you.
        </p>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder="Paste recipe text here..."
          className="w-full p-2 border rounded mb-2 dark:bg-gray-800 dark:border-gray-700"
          rows={4}
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
      <div>
        <label className="block text-sm font-medium mb-1">
          Protein Type <span className="text-red-600">*</span>
        </label>
        <select
          name="proteinType"
          value={formData.proteinType}
          onChange={handleChange}
          //required
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">None</option>
          <option value="chicken">Chicken</option>
          <option value="fish">Fish</option>
          <option value="red-meat">Red Meat</option>
          <option value="vegetarian">Vegetarian</option>
        </select>
      </div>

      {/* Carb Type */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Carb Type <span className="text-red-600">*</span>
        </label>
        <select
          name="carbType"
          value={formData.carbType}
          onChange={handleChange}
          //required
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">None</option>
          <option value="rice">Rice</option>
          <option value="pasta">Pasta</option>
          <option value="couscous">Couscous</option>
          <option value="fries">Fries</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Prep Time */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Prep Time <span className="text-red-600">*</span>
        </label>
        <select
          name="prepTime"
          value={formData.prepTime}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="quick">Quick (&lt;30 min)</option>
          <option value="medium">Medium (30-60 min)</option>
          <option value="long">Long (&gt;60 min)</option>
        </select>
      </div>

      {/* Tier */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Recipe Tier <span className="text-red-600">*</span>
        </label>
        <select
          name="tier"
          value={formData.tier}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="favorite">Favorite</option>
          <option value="non-regular">Non-Regular</option>
          <option value="new">New</option>
        </select>
      </div>

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
