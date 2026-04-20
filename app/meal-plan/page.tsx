/**
 * Meal Plan Page (Server Component)
 *
 * Fetches the week start day setting and renders the client component.
 */

import { getWeekStartDay } from '@/app/(modules)/settings/preferenceActions'
import MealPlanClient from './components/MealPlanClient'

export default async function MealPlanPage() {
  const weekStartDay = await getWeekStartDay()

  return <MealPlanClient weekStartDay={weekStartDay} />
}
