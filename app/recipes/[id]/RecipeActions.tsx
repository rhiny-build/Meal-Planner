/**
 * RecipeActions
 *
 * Buttons on the recipe page: Edit (opens the same modal editor as the book)
 * and Cook (opens the full-screen cook mode).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Button from '@/components/Button'
import type { RecipeWithIngredients, RecipeFormData } from '@/types'
import type { DishTypeOption } from '@/lib/dishTypeConfig'
import RecipeModal from '../components/RecipeModal'

interface RecipeActionsProps {
  recipe: RecipeWithIngredients
  proteinOptions: DishTypeOption[]
  carbOptions: DishTypeOption[]
}

export default function RecipeActions({ recipe, proteinOptions, carbOptions }: RecipeActionsProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  const onSubmit = async (data: RecipeFormData) => {
    const res = await fetch(`/api/recipes/${recipe.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setEditing(false)
      router.refresh()
    } else {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error || 'Failed to update recipe')
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link
        href={`/recipes/${recipe.id}/cook`}
        className="inline-block px-4 py-2 text-base font-medium rounded bg-blue-600 dark:bg-fuchsia-600 text-white hover:bg-blue-700 dark:hover:bg-fuchsia-500"
        data-testid="cook-button"
      >
        Cook
      </Link>
      <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
        Edit
      </Button>

      {editing && (
        <RecipeModal
          recipe={recipe}
          onSubmit={onSubmit}
          onCancel={() => setEditing(false)}
          proteinOptions={proteinOptions}
          carbOptions={carbOptions}
        />
      )}
    </div>
  )
}
