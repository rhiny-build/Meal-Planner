/**
 * RecipeEditor
 *
 * Self-contained recipe editor: basics, kind (full/quick), servings, time,
 * ingredients, method steps (optional timer per step), notes. It owns its form
 * state and only talks to the outside through `onSubmit` / `onCancel`, so it
 * can be dropped into a modal (today) or a page (later) without changes.
 * Also keeps the optional "extract from URL" helper (replaced by the S05 importer).
 */

'use client'

import { useState } from 'react'
import type { RecipeWithIngredients, RecipeFormData, RecipeKind } from '@/types'
import Button from '@/components/Button'
import Select from '@/components/Select'
import AIImportSection from '@/components/AIImportSection'
import type { DishTypeOption } from '@/lib/dishTypeConfig'
import { PREP_TIME_OPTIONS, TIER_OPTIONS } from '@/lib/recipeFormConfig'
import { parseIngredientLine } from '@/lib/ingredientParser'
import { replaceTokenWithName } from '@/lib/stepEditorText'
import IngredientsEditor, { newId, type IngredientRow } from './IngredientsEditor'
import StepsEditor, { type StepRow } from './StepsEditor'

interface RecipeEditorProps {
  recipe?: RecipeWithIngredients // If provided, we're editing; otherwise, creating
  onSubmit: (data: RecipeFormData) => Promise<void>
  onCancel: () => void
  proteinOptions: DishTypeOption[]
  carbOptions: DishTypeOption[]
}

const inputClass = 'w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700'

function rowsFromLines(text: string): IngredientRow[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const p = parseIngredientLine(line)
      return {
        id: newId(),
        name: p.name || line,
        quantity: p.quantity || '',
        unit: p.unit || '',
        notes: p.notes || '',
      }
    })
}

export default function RecipeEditor({
  recipe,
  onSubmit,
  onCancel,
  proteinOptions,
  carbOptions,
}: RecipeEditorProps) {
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() => {
    if (recipe?.structuredIngredients && recipe.structuredIngredients.length > 0) {
      return recipe.structuredIngredients.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity || '',
        unit: i.unit || '',
        notes: i.notes || '',
      }))
    }
    return rowsFromLines(recipe?.ingredients || '')
  })

  const [steps, setSteps] = useState<StepRow[]>(() =>
    (recipe?.steps ?? []).map((s) => ({
      key: s.id,
      text: s.text,
      timerMinutes: s.timerSeconds ? String(Math.round((s.timerSeconds / 60) * 100) / 100) : '',
    }))
  )

  const [formData, setFormData] = useState({
    name: recipe?.name || '',
    recipeUrl: recipe?.recipeUrl || '',
    proteinType: (recipe?.proteinType as any) || '',
    carbType: (recipe?.carbType as any) || '',
    vegetableType: (recipe?.vegetableType as any) || '',
    isLunchAppropriate: recipe?.isLunchAppropriate || false,
    prepTime: (recipe?.prepTime as any) || 'quick',
    tier: (recipe?.tier as any) || 'favorite',
    kind: ((recipe?.kind as RecipeKind) || 'full') as RecipeKind,
    servings: recipe?.servings != null ? String(recipe.servings) : '',
    totalTimeMinutes: recipe?.totalTimeMinutes != null ? String(recipe.totalTimeMinutes) : '',
    description: recipe?.description || '',
    notes: recipe?.notes || '',
  })

  // AI import state
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Removing an ingredient turns its tokens in the steps into plain words.
  const handleRemoveIngredient = (row: IngredientRow) => {
    setSteps((prev) =>
      prev.map((s) => ({ ...s, text: replaceTokenWithName(s.text, row.id, row.name) }))
    )
  }

  const handlePasteLines = (text: string) => {
    setIngredientRows((prev) => [...prev.filter((r) => r.name.trim()), ...rowsFromLines(text)])
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

      let imported: IngredientRow[] | null = null
      if (data.structuredIngredients?.length) {
        imported = data.structuredIngredients.map((i: any) => ({
          id: newId(),
          name: i.name || '',
          quantity: i.quantity || '',
          unit: i.unit || '',
          notes: i.notes || '',
        }))
      } else if (data.ingredients) {
        imported = rowsFromLines(data.ingredients)
      }
      if (imported) {
        // Imported rows replace the current ones; steps keep their words, not tokens.
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            text: ingredientRows.reduce((t, r) => replaceTokenWithName(t, r.id, r.name), s.text),
          }))
        )
        setIngredientRows(imported)
      }
      if (data.name) setFormData((f) => ({ ...f, name: data.name }))
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import recipe')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const rows = ingredientRows.filter((r) => r.name.trim())
    if (rows.length === 0) {
      setError('Add at least one ingredient.')
      return
    }
    setIsSubmitting(true)
    try {
      const { servings, totalTimeMinutes, ...rest } = formData
      const data: RecipeFormData = {
        ...rest,
        ingredients: rows
          .map((r) =>
            [
              r.quantity.trim(),
              r.unit.trim(),
              r.name.trim(),
              r.notes.trim() && `(${r.notes.trim()})`,
            ]
              .filter(Boolean)
              .join(' ')
          )
          .join('\n'),
        structuredIngredients: rows.map((r, order) => ({
          id: r.id,
          name: r.name.trim(),
          quantity: r.quantity.trim() || null,
          unit: r.unit.trim() || null,
          notes: r.notes.trim() || null,
          order,
        })),
        servings: servings.trim() ? Number(servings) : null,
        totalTimeMinutes: totalTimeMinutes.trim() ? Number(totalTimeMinutes) : null,
        steps: steps
          .filter((s) => s.text.trim())
          .map((s) => ({
            text: s.text,
            timerSeconds:
              s.timerMinutes.trim() && Number(s.timerMinutes) > 0
                ? Math.round(Number(s.timerMinutes) * 60)
                : null,
          })),
      }
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="recipe-editor">
      <AIImportSection
        recipeUrl={formData.recipeUrl || ''}
        onUrlChange={handleChange}
        onImport={handleImport}
        isImporting={isImporting}
        importError={importError}
      />

      {/* Recipe Name */}
      <div>
        <label htmlFor="recipe-name" className="block text-sm font-medium mb-1">
          Recipe Name <span className="text-red-600">*</span>
        </label>
        <input
          id="recipe-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={inputClass}
        />
      </div>

      {/* Kind */}
      <fieldset>
        <legend className="block text-sm font-medium mb-1">Type of recipe</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(
            [
              ['full', 'Full recipe', 'A dish with ingredients and maybe a method'],
              ['quick', 'Quick', 'A quick side or main, e.g. Simple Fries'],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`cursor-pointer border rounded p-3 ${
                formData.kind === value
                  ? 'border-blue-600 dark:border-fuchsia-500 bg-blue-50 dark:bg-fuchsia-900/20'
                  : 'dark:border-gray-700'
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={formData.kind === value}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="font-medium">{label}</span>
              <span className="block text-xs text-gray-600 dark:text-gray-400">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Description */}
      <div>
        <label htmlFor="recipe-description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <input
          id="recipe-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="One line about the dish"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recipe-servings" className="block text-sm font-medium mb-1">
            Servings
          </label>
          <input
            id="recipe-servings"
            name="servings"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={formData.servings}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="recipe-total-time" className="block text-sm font-medium mb-1">
            Total time (min)
          </label>
          <input
            id="recipe-total-time"
            name="totalTimeMinutes"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={formData.totalTimeMinutes}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <IngredientsEditor
        rows={ingredientRows}
        onChange={setIngredientRows}
        onRemove={handleRemoveIngredient}
        onPasteLines={handlePasteLines}
      />

      <StepsEditor steps={steps} onChange={setSteps} ingredients={ingredientRows} />

      {/* Notes */}
      <div>
        <label htmlFor="recipe-notes" className="block text-sm font-medium mb-1">
          Notes
        </label>
        <textarea
          id="recipe-notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          placeholder="Tips, variations..."
          className={inputClass}
        />
      </div>

      {/* Protein Type */}
      <Select
        name="proteinType"
        value={formData.proteinType || ''}
        onChange={handleChange}
        options={proteinOptions}
        label="Protein Type"
      />

      {/* Carb Type */}
      <Select
        name="carbType"
        value={formData.carbType || ''}
        onChange={handleChange}
        options={carbOptions}
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
              vegetableType: e.target.checked ? 'vegetable' : '',
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

      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
