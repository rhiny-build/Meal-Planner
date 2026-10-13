/**
 * Score Badge — displays embedding similarity score as a colored pill.
 */

export default function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 75
      ? 'bg-primary-soft text-primary  '
      : pct >= 60
        ? 'bg-accent-soft text-ink  '
        : 'bg-danger-soft text-danger  '

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {pct}% match
    </span>
  )
}
