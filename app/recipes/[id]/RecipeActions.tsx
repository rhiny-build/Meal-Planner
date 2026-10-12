/**
 * RecipeActions
 *
 * Buttons on the recipe page: Edit (opens the same modal editor as the book)
 * and the Cook placeholder.
 */

'use client'

import { useState } from 'react'
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
      {/*
        PLACEHOLDER (S08): the Cook button. Cook mode is built in S08, which
        replaces this disabled button with a link to /recipes/[id]/cook.
      */}
      <Button type="button" disabled title="Cook mode is coming soon" data-testid="cook-button">
        Cook
      </Button>
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
