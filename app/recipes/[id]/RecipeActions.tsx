/**
 * RecipeActions
 *
 * The Edit button on the recipe page (opens the same modal editor as the book).
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
    <>
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
    </>
  )
}
