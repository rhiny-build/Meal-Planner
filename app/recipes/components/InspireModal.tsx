/**
 * Inspire Modal Component
 *
 * Modal for AI-powered recipe discovery.
 * User enters a prompt, Perplexity finds recipes, user can accept/reject each.
 */

'use client'

import { useState } from 'react'
import Button from '@/components/Button'
import { discoverRecipes, type RecipeSuggestion } from '@/lib/aiService'

interface InspireModalProps {
  onAccept: (recipe: RecipeSuggestion) => Promise<void>
  onClose: () => void
}

export default function InspireModal({ onAccept, onClose }: InspireModalProps) {
  const [prompt, setPrompt] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([])
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set())

  const handleSearch = async () => {
    if (!prompt.trim()) {
      setError('Please enter what kind of recipes you want')
      return
    }

    setIsSearching(true)
    setError('')
    setSuggestions([])
    setAcceptedIds(new Set())

    try {
      const recipes = await discoverRecipes(prompt)
      setSuggestions(recipes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find recipes')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAccept = async (recipe: RecipeSuggestion, index: number) => {
    try {
      await onAccept(recipe)
      setAcceptedIds(prev => new Set(prev).add(index))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe')
    }
  }

  const handleReject = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Inspire Me</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              What kind of recipes are you looking for?
            </label>
            <div className="flex gap-2 items-start">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g., quick chicken dinners, vegetarian pasta dishes..."
                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                disabled={isSearching}
                rows={4}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>

          {/* Results */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Found {suggestions.length} recipes:</h3>
              {suggestions.map((recipe, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    acceptedIds.has(index)
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300'
                      : 'dark:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">{recipe.name}</h4>
                    {acceptedIds.has(index) ? (
                      <span className="text-green-600 font-medium">Added!</span>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(recipe, index)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleReject(index)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {recipe.recipeUrl && (
                    <a
                      href={recipe.recipeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm block mb-2"
                    >
                      View Recipe →
                    </a>
                  )}

                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {recipe.proteinType && <p>Protein: {recipe.proteinType}</p>}
                    {recipe.carbType && <p>Carb: {recipe.carbType}</p>}
                    {recipe.prepTime && <p>Prep: {recipe.prepTime}</p>}
                  </div>

                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Show ingredients
                    </summary>
                    <pre className="text-sm mt-2 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {recipe.ingredients}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* Close button at bottom */}
          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
