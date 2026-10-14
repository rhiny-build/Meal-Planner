/**
 * Admin: receipts. Upload Sainsbury's receipt PDFs (many at once, or a zip) and rebuild the purchase history.
 * Linked from Settings, not the main menu. No login: like the rest of the app.
 */

import ReceiptsClient from './ReceiptsClient'

export const metadata = { title: 'Receipts' }

export default function AdminReceiptsPage() {
  return <ReceiptsClient />
}
