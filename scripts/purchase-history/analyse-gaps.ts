import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { normaliseName } from '../../lib/normalisation/normalise';

const prisma = new PrismaClient();

const MIN_APPEARANCES = 4;

// ── Supermarket-specific pre-processing ────────────────────────────
// Strips brand prefixes, sub-brands, weights, pack counts, and other
// supermarket receipt noise before passing to the generic normaliser.

const BRAND_PREFIXES = [
  "sainsbury's",
  'by sainsbury',
  'hubbard',
];

const SUB_BRANDS = [
  'taste the difference',
  'so organic',
  'be good to yourself',
  'deliciously freefrom',
  'inspired to cook',
  'love your veg',
];

function stripSupermarketNoise(raw: string): string {
  let s = raw;

  // Strip brand prefixes
  for (const brand of BRAND_PREFIXES) {
    const re = new RegExp(`^${brand}\\s+`, 'i');
    s = s.replace(re, '');
  }

  // Strip sub-brand labels
  for (const sub of SUB_BRANDS) {
    const re = new RegExp(`,?\\s*${sub}`, 'gi');
    s = s.replace(re, '');
  }

  // Strip weight/volume suffixes: "250g", "1.5kg", "2L", "500ml", "2.27L"
  s = s.replace(/\b\d+(\.\d+)?\s*(g|kg|ml|l|litre|litres)\b/gi, '');

  // Strip pack counts: "x6", "x12", "x17"
  s = s.replace(/\bx\d+\b/gi, '');

  // Strip standalone numbers left behind (e.g. from "4x198g (4x165g*)")
  s = s.replace(/\(\d+[x×]\d+[a-z]*\*?\)/gi, '');

  // Strip trailing parenthetical size notes like "(4 pint)"
  s = s.replace(/\(\d+\s*pint\)/gi, '');

  // Strip calorie counts like "90 Calorie"
  s = s.replace(/\b\d+\s*calorie\b/gi, '');

  // Clean up: collapse whitespace, strip trailing commas/dashes/spaces
  s = s.replace(/\s+/g, ' ').replace(/[,\-\s]+$/, '').trim();

  return s;
}

// ── Matching logic ─────────────────────────────────────────────────

interface MasterItem {
  id: string;
  canonicalName: string;
}

interface MatchResult {
  rawName: string;
  appearances: number;
  normalisedName: string;
  matchedItem: MasterItem | null;
  ambiguous: boolean;
}

function findContainsMatch(
  normalised: string,
  masterItems: MasterItem[]
): { item: MasterItem; ambiguous: boolean } | null {
  const lower = normalised.toLowerCase();

  const matches = masterItems.filter((mi) => {
    const canon = mi.canonicalName.toLowerCase();
    return lower.includes(canon) || canon.includes(lower);
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return { item: matches[0], ambiguous: false };

  // Multiple matches — pick the one whose canonicalName is closest in length
  // (i.e. most specific match)
  const sorted = matches.sort(
    (a, b) =>
      Math.abs(a.canonicalName.length - lower.length) -
      Math.abs(b.canonicalName.length - lower.length)
  );
  return { item: sorted[0], ambiguous: true };
}

// ── Main ───────────────────────────────────────────────────────────

async function analyseGaps() {
  // Step 1: Load purchase history and compute frequencies
  const records = await prisma.purchaseHistory.findMany({
    select: { rawName: true, purchaseDate: true },
  });

  const allDates = new Set(
    records.map((r) => r.purchaseDate.toISOString().slice(0, 10))
  );
  const totalReceipts = allDates.size;

  const itemDates = new Map<string, Set<string>>();
  for (const r of records) {
    const dateKey = r.purchaseDate.toISOString().slice(0, 10);
    if (!itemDates.has(r.rawName)) {
      itemDates.set(r.rawName, new Set());
    }
    itemDates.get(r.rawName)!.add(dateKey);
  }

  // Filter to high-frequency items
  const highFreq = Array.from(itemDates.entries())
    .map(([name, dates]) => ({ name, appearances: dates.size }))
    .filter((item) => item.appearances >= MIN_APPEARANCES)
    .sort((a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name));

  // Step 2 & 3: Normalise and match
  const masterItems = await prisma.masterListItem.findMany({
    select: { id: true, canonicalName: true },
    where: { canonicalName: { not: null } },
  });

  const validMasterItems: MasterItem[] = masterItems
    .filter((mi): mi is { id: string; canonicalName: string } => mi.canonicalName !== null);

  const results: MatchResult[] = highFreq.map((item) => {
    const stripped = stripSupermarketNoise(item.name);
    const normalised = normaliseName(stripped);
    const normalisedName = normalised.canonical || stripped.toLowerCase();

    const match = findContainsMatch(normalisedName, validMasterItems);

    return {
      rawName: item.name,
      appearances: item.appearances,
      normalisedName,
      matchedItem: match?.item ?? null,
      ambiguous: match?.ambiguous ?? false,
    };
  });

  // Step 4: Bucket
  const matched = results.filter((r) => r.matchedItem);
  const unmatched = results.filter((r) => !r.matchedItem);

  // Step 5: Format report
  const lines: string[] = [];

  lines.push('PURCHASE HISTORY GAP ANALYSIS');
  lines.push('==============================');
  lines.push(`High-frequency items (≥${MIN_APPEARANCES} receipts): ${highFreq.length}`);
  lines.push(
    `Already matched to master list:      ${matched.length} (${Math.round((matched.length / highFreq.length) * 100)}%)`
  );
  lines.push(
    `Unmatched — gaps in master list:     ${unmatched.length} (${Math.round((unmatched.length / highFreq.length) * 100)}%)`
  );
  lines.push('');

  lines.push('MATCHED ITEMS');
  lines.push('=============');
  lines.push(
    'Appearances | Item                                                                    | Normalised                        | Matched to'
  );
  lines.push(
    '----------- | ----------------------------------------------------------------------- | --------------------------------- | ----------'
  );
  for (const r of matched) {
    const ambigFlag = r.ambiguous ? ' [ambiguous]' : '';
    lines.push(
      `${String(r.appearances).padStart(11)} | ${r.rawName.padEnd(71)} | ${r.normalisedName.padEnd(33)} | ${r.matchedItem!.canonicalName}${ambigFlag}`
    );
  }
  lines.push('');

  lines.push('UNMATCHED ITEMS (gaps)');
  lines.push('======================');
  lines.push(
    'Appearances | Item                                                                    | Normalised'
  );
  lines.push(
    '----------- | ----------------------------------------------------------------------- | ----------'
  );
  for (const r of unmatched) {
    lines.push(
      `${String(r.appearances).padStart(11)} | ${r.rawName.padEnd(71)} | ${r.normalisedName}`
    );
  }

  const report = lines.join('\n') + '\n';

  // Print to console
  console.log(report);

  // Step 6: Save full report
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const outPath = path.join(logsDir, 'purchase-gap-analysis.txt');
  fs.writeFileSync(outPath, report);
  console.log(`Full report saved to: ${outPath}`);
}

analyseGaps()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
