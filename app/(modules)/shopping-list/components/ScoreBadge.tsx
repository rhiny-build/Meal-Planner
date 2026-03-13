/**
 * Score Badge — displays embedding similarity score as a colored pill.
 */

export default function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 75
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : pct >= 60
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {pct}% match
    </span>
  )
}
