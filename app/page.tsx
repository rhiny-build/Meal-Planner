/**
 * Home Page: Tonight
 *
 * Today's dinner first. The week start day is read here so the client can
 * find the right week for the viewer's own "today".
 */

import { getWeekStartDay } from '@/app/(modules)/settings/preferenceActions'
import TonightClient from '@/components/tonight/TonightClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const weekStartDay = await getWeekStartDay()

  return <TonightClient weekStartDay={weekStartDay} />
}
