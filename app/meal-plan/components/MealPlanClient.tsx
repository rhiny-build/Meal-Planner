/**
 * Meal Plan Client Component
 *
 * Features:
 * - The week as one row per day: tap a day to edit it, type its note in the row
 * - Draft my week (next week, from day notes and recent weeks) with Accept all
 * - Ask box: change the plan in plain words
 * - Changing a day's meals in the day editor (dropdowns per slot) and swapping days
 * - Save/load from database
 * - Navigate between weeks
 */

'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getWeekStart, formatDateParam, parseDateParam } from '@/lib/dateUtils'
import { useMealPlan } from '@/lib/hooks/useMealPlan'
import { usePageReady } from '@/lib/timing/usePageReady'
import { useNextWeekGaps } from '@/lib/hooks/useNextWeekGaps'
import PageHeader from '@/components/PageHeader'
import WeekToolbar from './WeekToolbar'
import WeekList from './WeekList'
import { formatWeekRange, getWeekTitle } from '../helpers/weekLabels'
import AiProgress from '@/components/AiProgress'
import DraftBanner from './DraftBanner'
import AskBox from './AskBox'

interface MealPlanClientProps {
  weekStartDay: number
}

export default function MealPlanClient({ weekStartDay }: MealPlanClientProps) {
  const [startDate, setStartDate] = useState<Date>(() => getWeekStart(new Date(), weekStartDay))

  // Restore last visited week from localStorage after hydration
  useEffect(() => {
    const lastVisited = localStorage.getItem('mealPlanLastVisited')
    if (lastVisited) {
      setStartDate(getWeekStart(new Date(lastVisited), weekStartDay))
    }
  }, [weekStartDay])
  const [isDrafting, setIsDrafting] = useState(false)

  const {
    weekPlan,
    dayNotes,
    lunchRecipes,
    proteinRecipes,
    carbRecipes,
    vegetableRecipes,
    selectedCount,
    isLoading,
    isSaving,
    handleRecipeChange,
    handleNoteChange,
    handleSave,
    handleClear,
    handleSwapRecipes,
    draft,
    reasons,
    refresh,
    flushUnsaved,
    handleAcceptDraft,
    handleDiscardDraft,
  } = useMealPlan(startDate, weekStartDay)

  usePageReady(!isLoading)
  const emptyDaysNextWeek = useNextWeekGaps(weekStartDay, startDate, weekPlan)

  const handlePreviousWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 7)
        localStorage.setItem('mealPlanLastVisited', newDate.toISOString())

    setStartDate(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 7)
    localStorage.setItem('mealPlanLastVisited', newDate.toISOString())

    setStartDate(newDate)
  }

  /** Draft my week: drafts NEXT week (the week the Shopping tab's Next week list is for), then shows it */
  const handleDraft = async () => {
    setIsDrafting(true)
    try {
      const response = await fetch('/api/meal-plan/draft', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The draft did not work, please try again.')
      const draftedWeek = parseDateParam(result.weekStart)
      localStorage.setItem('mealPlanLastVisited', draftedWeek.toISOString())
      if (formatDateParam(draftedWeek) === formatDateParam(startDate)) await refresh()
      else setStartDate(draftedWeek)
    } catch (error) {
      console.error('Error drafting the week:', error)
      toast.error(error instanceof Error ? error.message : 'The draft did not work, please try again.')
    } finally {
      setIsDrafting(false)
    }
  }

  const recipeNames = Object.fromEntries(
    [...lunchRecipes, ...proteinRecipes, ...carbRecipes, ...vegetableRecipes].map(r => [r.id, r.name])
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-soft text-lg">Loading meal plan...</div>
      </div>
    )
  }

  return (
    <div className="max-w-xl md:max-w-3xl mx-auto px-4">
      <PageHeader
        title={getWeekTitle(startDate, getWeekStart(new Date(), weekStartDay))}
        eyebrow={formatWeekRange(startDate)}
      />

      <WeekToolbar
        isDrafting={isDrafting}
        showNotesHint={(emptyDaysNextWeek ?? 0) > 0}
        isSaving={isSaving}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onDraft={handleDraft}
        onSave={handleSave}
        onClear={handleClear}
      />
      <p className="text-sm text-ink-soft pb-3 px-1" data-testid="selected-count">
        {selectedCount} of 21 meals planned
      </p>

      {/* Drafting a week with the meal-plan agent: measured 25-30 s on the dev key */}
      <AiProgress
        active={isDrafting}
        label="Drafting your week"
        estimate={[20, 45]}
        className="mb-4"
      />

      {draft && (
        <DraftBanner summary={draft.summary} isBusy={isSaving} onAccept={handleAcceptDraft} onDiscard={handleDiscardDraft} />
      )}

      <WeekList
        weekPlan={weekPlan}
        dayNotes={dayNotes}
        reasons={reasons}
        lunchRecipes={lunchRecipes}
        proteinRecipes={proteinRecipes}
        carbRecipes={carbRecipes}
        vegetableRecipes={vegetableRecipes}
        onRecipeChange={handleRecipeChange}
        onNoteChange={handleNoteChange}
        onSwapRecipes={handleSwapRecipes}
      />

      <AskBox weekStart={formatDateParam(startDate)} beforeAsk={flushUnsaved} onChanged={refresh} recipeNames={recipeNames} />
    </div>
  )
}
