/**
 * Admin: recipe backfill. Linked from Settings, not the main menu.
 * Runs the S07 backfill from inside the app, one recipe per request. No login: like the rest of the app.
 */

import BackfillClient from './BackfillClient'

export const metadata = { title: 'Recipe backfill' }

export default function AdminBackfillPage() {
  return <BackfillClient />
}
