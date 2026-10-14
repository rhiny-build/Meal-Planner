/** The four slots of a day in the meal plan, as the rest of the app names them (see MealSlotColumn). */
export const SLOTS = ['lunch', 'protein', 'carb', 'vegetable'] as const
export type Slot = (typeof SLOTS)[number]

/** Dinner is the protein main with its carb and vegetable sides. Drafts only ever fill these. */
export const DINNER_SLOTS: Slot[] = ['protein', 'carb', 'vegetable']

/** One day of a plan or draft. Recipe ids, null when the slot is empty. */
export interface PlanDay {
  /** YYYY-MM-DD */
  date: string
  dayOfWeek: string
  lunch: string | null
  protein: string | null
  carb: string | null
  vegetable: string | null
  /** Why the draft chose this day's meals (drafts only) */
  reason: string | null
  /** Slots Ronen had already filled when the draft was made: the draft never changes these */
  locked: Slot[]
}

export const emptyDay = (date: string, dayOfWeek: string): PlanDay => ({
  date, dayOfWeek, lunch: null, protein: null, carb: null, vegetable: null, reason: null, locked: [],
})

export type SetSlotResult =
  | { ok: true; day: PlanDay; before: string | null }
  | { ok: false; error: string }

/** Where the agent's tools read and write: the saved plan, or a pending draft of a week. */
export interface PlanStore {
  kind: 'plan' | 'draft'
  readDays(from: string, to: string): Promise<PlanDay[]>
  setSlot(date: string, slot: Slot, recipeId: string | null, reason?: string): Promise<SetSlotResult>
}
