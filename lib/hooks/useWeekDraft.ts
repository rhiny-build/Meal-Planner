/**
 * useWeekDraft: the pending draft of the week on screen (if any), plus Accept all, Discard and keeping Ronen's own
 * tweaks. The draft lives on the server (PlanDraft); nothing is the plan until it is accepted.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import type { WeekPlan } from '@/types'
import { formatDateParam } from '@/lib/dateUtils'
import type { PlanDay } from '@/lib/mealPlanAgent/types'
import { weekPlanToDays } from '@/lib/mealPlanAgent/weekPlanDraft'
import { acceptDraftAction, discardDraftAction, saveDraftEditsAction } from '@/app/meal-plan/draftActions'

export interface WeekDraft {
  summary: string | null
  days: PlanDay[]
}

export function useWeekDraft(startDate: Date) {
  const weekKey = formatDateParam(startDate)
  const [draft, setDraft] = useState<WeekDraft | null>(null)

  /** Look for a draft of this week. Returns it (also kept in state). */
  const loadDraft = useCallback(async (): Promise<WeekDraft | null> => {
    try {
      const res = await fetch(`/api/meal-plan/draft?startDate=${weekKey}`)
      const json = await res.json()
      const found: WeekDraft | null = json.draft ?? null
      setDraft(found)
      return found
    } catch {
      setDraft(null)
      return null
    }
  }, [weekKey])

  /** Keep what Ronen has changed on screen in the draft (reasons of changed days are dropped server-side). */
  const persistEdits = useCallback(
    async (weekPlan: WeekPlan[]) => {
      try {
        await saveDraftEditsAction(weekKey, weekPlanToDays(weekPlan))
      } catch {
        toast.error('Could not keep your change to the draft')
      }
    },
    [weekKey]
  )

  const accept = useCallback(
    async (weekPlan: WeekPlan[]): Promise<boolean> => {
      try {
        await saveDraftEditsAction(weekKey, weekPlanToDays(weekPlan))
        const ok = await acceptDraftAction(weekKey)
        if (ok) setDraft(null)
        return ok
      } catch {
        toast.error('Could not accept the draft')
        return false
      }
    },
    [weekKey]
  )

  const discard = useCallback(async () => {
    try {
      await discardDraftAction(weekKey)
      setDraft(null)
    } catch {
      toast.error('Could not discard the draft')
    }
  }, [weekKey])

  return { draft, loadDraft, persistEdits, accept, discard, weekKey }
}
