/**
 * Meal Plan Page (Server Component)
 *
 * Fetches the week start day setting and renders the client component.
 */

import { getWeekStartDay } from '@/app/(modules)/settings/preferenceActions'
import MealPlanClient from './components/MealPlanClient'
import { measured } from '@/lib/timing/measure'

async function MealPlanPage() {
  const weekStartDay = await getWeekStartDay()

  return <MealPlanClient weekStartDay={weekStartDay} />
}

export default measured('page', '/meal-plan', MealPlanPage)
