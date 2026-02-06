/**
 * Recipes Page (Server Component)
 *
 * Fetches dish type options and renders the client component.
 */

import { Suspense } from 'react'
import {
  getProteinOptions,
  getCarbOptions,
  getProteinFilterOptions,
  getCarbFilterOptions,
} from '@/lib/dishTypeConfig'
import RecipesClient from './components/RecipesClient'

async function RecipesContent() {
  // Fetch all dish type options in parallel
  const [proteinOptions, carbOptions, proteinFilterOptions, carbFilterOptions] = await Promise.all([
    getProteinOptions(),
    getCarbOptions(),
    getProteinFilterOptions(),
    getCarbFilterOptions(),
  ])

  return (
    <RecipesClient
      proteinOptions={proteinOptions}
      carbOptions={carbOptions}
      proteinFilterOptions={proteinFilterOptions}
      carbFilterOptions={carbFilterOptions}
    />
  )
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <RecipesContent />
    </Suspense>
  )
}
