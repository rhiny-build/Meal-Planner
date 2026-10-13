const STYLES: Record<string, string> = {
  succeeded: 'bg-primary-soft text-primary  ',
  failed: 'bg-danger-soft text-danger  ',
  running: 'bg-accent-soft text-ink  ',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-card text-xs font-medium ${STYLES[status] ?? STYLES.running}`}>
      {status}
    </span>
  )
}
