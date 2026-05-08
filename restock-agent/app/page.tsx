import { prisma } from '@/lib/prisma'
import ProposalCard from '@/components/ProposalCard'

export const dynamic = 'force-dynamic'

async function getProposals() {
  const logs = await prisma.agentClassificationLog.findMany({
    where: { status: 'pending' },
    include: { suggestedItem: { select: { id: true, name: true, normalisedName: true } } },
    orderBy: { confidence: 'desc' },
  })
  return logs.map((l) => ({
    id: l.id,
    rawName: l.rawName,
    suggestedItemId: l.suggestedItemId,
    suggestedItemName: l.suggestedItem?.normalisedName ?? l.suggestedItem?.name ?? null,
    confidence: l.confidence,
    reasoning: l.reasoning,
  }))
}

async function getWatching() {
  const logs = await prisma.agentClassificationLog.findMany({
    where: { status: 'watching' },
    orderBy: { createdAt: 'desc' },
  })
  const purchaseCounts = await prisma.purchaseHistory.groupBy({
    by: ['rawName'],
    _count: { rawName: true },
    where: { rawName: { in: logs.map((l) => l.rawName) } },
  })
  const countMap = new Map(purchaseCounts.map((r) => [r.rawName, r._count.rawName]))
  return logs.map((l) => ({
    id: l.id,
    rawName: l.rawName,
    purchaseCount: countMap.get(l.rawName) ?? 0,
    reasoning: l.reasoning,
  }))
}

async function getRunHistory() {
  const runs = await prisma.agentClassificationLog.groupBy({
    by: ['runId'],
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
    take: 20,
  })

  const runIds = runs.map((r) => r.runId)

  const statsByRun = await prisma.agentClassificationLog.groupBy({
    by: ['runId', 'status'],
    _count: { id: true },
    where: { runId: { in: runIds } },
  })

  const statsMap = new Map<string, Record<string, number>>()
  for (const s of statsByRun) {
    const entry = statsMap.get(s.runId) ?? {}
    entry[s.status] = s._count.id
    statsMap.set(s.runId, entry)
  }

  return runs.map((r) => ({
    runId: r.runId,
    date: r._max.createdAt,
    total: r._count.id,
    stats: statsMap.get(r.runId) ?? {},
  }))
}

export default async function DashboardPage() {
  const [proposals, watching, runHistory] = await Promise.all([
    getProposals(),
    getWatching(),
    getRunHistory(),
  ])

  return (
    <div className="space-y-12">
      {/* Proposals */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Proposals</h2>
        <p className="text-sm text-gray-500 mb-4">
          {proposals.length} item{proposals.length !== 1 ? 's' : ''} pending review, sorted by confidence
        </p>
        {proposals.length === 0 ? (
          <p className="text-sm text-gray-400">No proposals yet — run the agent to classify items.</p>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>

      {/* Watching */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Watching</h2>
        <p className="text-sm text-gray-500 mb-4">
          {watching.length} item{watching.length !== 1 ? 's' : ''} accumulating purchase history
        </p>
        {watching.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing being watched yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
            {watching.map((w) => (
              <div key={w.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-sm text-gray-900">{w.rawName}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {w.purchaseCount} purchase{w.purchaseCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{w.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Run History */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Run History</h2>
        {runHistory.length === 0 ? (
          <p className="text-sm text-gray-400">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden bg-white">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Run ID</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Confirmed</th>
                  <th className="px-4 py-3 text-right">Rejected</th>
                  <th className="px-4 py-3 text-right">Watching</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runHistory.map((r) => (
                  <tr key={r.runId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[180px] truncate">
                      {r.runId}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{r.total}</td>
                    <td className="px-4 py-3 text-right">{r.stats.pending ?? 0}</td>
                    <td className="px-4 py-3 text-right text-green-700">{r.stats.confirmed ?? 0}</td>
                    <td className="px-4 py-3 text-right text-red-600">{r.stats.rejected ?? 0}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.stats.watching ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
