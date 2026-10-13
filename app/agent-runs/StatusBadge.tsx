const STYLES: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  running: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STYLES[status] ?? STYLES.running}`}>
      {status}
    </span>
  )
}
