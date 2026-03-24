import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function analyseFrequency() {
  const records = await prisma.purchaseHistory.findMany({
    select: { rawName: true, purchaseDate: true },
  });

  // Count distinct receipt dates
  const allDates = new Set(
    records.map((r) => r.purchaseDate.toISOString().slice(0, 10))
  );
  const totalReceipts = allDates.size;

  // For each rawName, count distinct purchase dates
  const itemDates = new Map<string, Set<string>>();
  for (const r of records) {
    const dateKey = r.purchaseDate.toISOString().slice(0, 10);
    if (!itemDates.has(r.rawName)) {
      itemDates.set(r.rawName, new Set());
    }
    itemDates.get(r.rawName)!.add(dateKey);
  }

  // Build sorted frequency list
  const frequencies = Array.from(itemDates.entries())
    .map(([name, dates]) => ({
      name,
      appearances: dates.size,
      percentage: Math.round((dates.size / totalReceipts) * 100),
    }))
    .sort((a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name));

  // Format report
  const header = [
    `Total receipts analysed: ${totalReceipts}`,
    `Total unique items: ${frequencies.length}`,
    '',
    'FREQUENCY REPORT',
    '================',
    'Appearances | % of shops | Item',
    '----------- | ---------- | ----',
  ].join('\n');

  const lines = frequencies.map(
    (f) =>
      `${String(f.appearances).padStart(11)} | ${String(f.percentage + '%').padStart(10)} | ${f.name}`
  );

  const fullReport = header + '\n' + lines.join('\n') + '\n';

  // Print top 50 to console
  const consoleReport =
    header + '\n' + lines.slice(0, 50).join('\n') + '\n';
  console.log(consoleReport);

  if (frequencies.length > 50) {
    console.log(`\n... ${frequencies.length - 50} more items in full report`);
  }

  // Save full report
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const outPath = path.join(logsDir, 'purchase-frequency.txt');
  fs.writeFileSync(outPath, fullReport);
  console.log(`\nFull report saved to: ${outPath}`);
}

analyseFrequency()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
