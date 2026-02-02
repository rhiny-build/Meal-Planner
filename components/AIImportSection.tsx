/**
 * AI Import Section Component
 *
 * Optional section for AI-assisted recipe import from URL.
 * Extracted from RecipeForm for better separation of concerns.
 */

'use client'

import Button from './Button'

interface AIImportSectionProps {
  recipeUrl: string
  onUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onImport: () => void
  isImporting: boolean
  importError: string
}

export default function AIImportSection({
  recipeUrl,
  onUrlChange,
  onImport,
  isImporting,
  importError,
}: AIImportSectionProps) {
  return (
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
        value={recipeUrl}
        onChange={onUrlChange}
        placeholder="Paste url text here..."
        className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
      />
      {importError && (
        <p className="text-red-600 text-sm mb-2">{importError}</p>
      )}
      <Button
        type="button"
        onClick={onImport}
        disabled={isImporting}
        size="sm"
      >
        {isImporting ? 'Extracting...' : 'Extract Ingredients'}
      </Button>
    </div>
  )
}
