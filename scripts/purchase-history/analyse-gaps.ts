import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import pluralize from 'pluralize';

const prisma = new PrismaClient();

const MIN_APPEARANCES = 4;

// ── Supermarket-specific stripping ─────────────────────────────────
// Reduces a supermarket product name to its base ingredient equivalent.
// e.g. "Sainsbury's British Free Range Eggs Large x12" → "eggs"
//
// Does NOT use the recipe normaliser — that was built for a different
// input language. This function handles brand/retail patterns instead.

const BRANDS = [
  "sainsbury's",
  'by sainsbury',
  'kingsmill',
  'warburtons',
  'müller',
  'muller',
  'alpro',
  'jordans',
  'graze',
  'oatly',
  'pepsi',
  'mccain',
  'heinz',
  'nutella',
  'lurpak',
  'colgate',
  'carex',
  'nurofen',
  'soreen',
  'sabra',
  'sharwood\'s',
  'sharwoods',
  'old el paso',
  'go ahead',
  'fibre one',
  'fruit bowl',
  'mini babybel',
  'fitzgeralds',
  'fitzgerald\'s',
  'fitzgeralds family bakery',
  'green giant',
  'rowse',
  'amoy',
  'mazola',
  'najma',
  'stamford street co.',
  'stamford street co',
  'bassetts',
  "eat natural",
  "kellogg's",
  "kelloggs",
  'ritz',
  'up ',
];

const SUB_BRANDS = [
  'taste the difference',
  'so organic',
  'be good to yourself',
  'deliciously freefrom',
  'inspired to cook',
  'love your veg',
];

// Descriptors that don't contribute to the base ingredient identity.
// These are adjectives/qualifiers that describe provenance, quality, or format.
const DESCRIPTOR_WORDS = new Set([
  // Provenance / quality
  'british', 'scottish', 'italian', 'mexican', 'german', 'fairtrade', 'fair', 'trade',
  'asc', 'free', 'range',
  // Fat / diet descriptors
  'fat', 'light', 'lighter', 'low', 'no', 'zero', 'sugar', 'sugars',
  // Size / format
  'large', 'small', 'medium', 'mini', 'classic', 'original', 'extra',
  'whole', 'round', 'loose',
  // Processing descriptors (that don't change identity)
  'sliced', 'slices', 'grated', 'spreadable', 'pre-sliced',
  'rashers', 'fillets', 'fillet',
  'bunch', 'bunched',
  // Marketing fluff
  'pure', 'super', 'tasty', 'soft', 'sizzling', 'mild',
  'deli', 'style',
  // Freshness (handled separately from the base)
  'fresh', 'frozen',
  // Pack descriptors
  'rolls', 'roll', 'bars', 'bar', 'pots', 'pot',
  'bottle', 'bottles', 'pack', 'packs', 'multipack',
  // Other noise
  '2%', '5%', '50/50',
]);

function stripToBaseIngredient(rawName: string): string {
  let s = rawName.toLowerCase().trim();

  // Strip sub-brands first (before brand prefix removal, since some contain brand)
  for (const sub of SUB_BRANDS) {
    s = s.replace(new RegExp(`,?\\s*${sub}`, 'gi'), '');
  }

  // Strip brand prefixes — try longest first to avoid partial matches
  const sortedBrands = [...BRANDS].sort((a, b) => b.length - a.length);
  for (const brand of sortedBrands) {
    const re = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    if (re.test(s)) {
      s = s.replace(re, '');
      break;
    }
  }

  // Strip weight/volume: "250g", "1.5kg", "2L", "500ml", "2.27L", "1L"
  s = s.replace(/\b\d+(\.\d+)?\s*(g|kg|ml|l|litres?)\b/gi, '');

  // Strip pack counts: "x6", "x12", "x17", "4x198g", "4x35.5g", "5x16g"
  s = s.replace(/\b\d+x\d+(\.\d+)?[a-z]*\*?\b/gi, '');
  s = s.replace(/\bx\d+\b/gi, '');

  // Strip parenthetical notes: "(4 pint)", "(150g*)", "(4x165g*)"
  s = s.replace(/\([^)]*\)/g, '');

  // Strip calorie counts: "90 Calorie"
  s = s.replace(/\b\d+\s*calorie\b/gi, '');

  // Strip dosage patterns: "200mg", "1000mg", "25μg"
  s = s.replace(/\b\d+\s*(mg|μg|iu)\b/gi, '');

  // Strip standalone numbers and leftover percent/slash symbols
  s = s.replace(/\b\d+\b/g, '');
  s = s.replace(/[%/]+/g, ' ');

  // Strip descriptor words
  const tokens = s.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((t) => !DESCRIPTOR_WORDS.has(t.replace(/[,\-]/g, '')));

  // If we stripped everything, fall back to all tokens
  const result = filtered.length > 0 ? filtered : tokens;

  // Clean up: collapse whitespace, strip leading/trailing punctuation
  let out = result.join(' ').replace(/[,\-]+$/, '').replace(/^[,\-]+/, '').trim();

  // Singularise the last word
  const words = out.split(/\s+/);
  if (words.length > 0) {
    words[words.length - 1] = pluralize.singular(words[words.length - 1]);
    out = words.join(' ');
  }

  return out;
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

  const highFreq = Array.from(itemDates.entries())
    .map(([name, dates]) => ({ name, appearances: dates.size }))
    .filter((item) => item.appearances >= MIN_APPEARANCES)
    .sort((a, b) => b.appearances - a.appearances || a.name.localeCompare(b.name));

  // Step 2: Load MasterListItems, index by baseIngredient
  const masterItems = await prisma.masterListItem.findMany({
    select: { id: true, baseIngredient: true },
    where: { baseIngredient: { not: null } },
  });

  const baseIndex = new Map<string, string>(); // baseIngredient (lower) → baseIngredient (original)
  for (const mi of masterItems) {
    if (mi.baseIngredient) {
      baseIndex.set(mi.baseIngredient.toLowerCase().trim(), mi.baseIngredient);
    }
  }

  // Step 3: Strip and exact-match
  interface Result {
    rawName: string;
    appearances: number;
    strippedTo: string;
    matchedBase: string | null;
  }

  const results: Result[] = highFreq.map((item) => {
    const stripped = stripToBaseIngredient(item.name);

    // Try exact match, then plural, then singular
    const pluralForm = pluralize.plural(stripped);
    const singularForm = pluralize.singular(stripped);
    const matchedBase =
      baseIndex.get(stripped) ??
      baseIndex.get(pluralForm) ??
      baseIndex.get(singularForm) ??
      null;

    return {
      rawName: item.name,
      appearances: item.appearances,
      strippedTo: stripped,
      matchedBase,
    };
  });

  // Step 4: Bucket
  const matched = results.filter((r) => r.matchedBase);
  const unmatched = results.filter((r) => !r.matchedBase);

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
    'Appearances | Raw name                                                                | Stripped to                   | Matched to'
  );
  lines.push(
    '----------- | ----------------------------------------------------------------------- | ----------------------------- | ----------'
  );
  for (const r of matched) {
    lines.push(
      `${String(r.appearances).padStart(11)} | ${r.rawName.padEnd(71)} | ${r.strippedTo.padEnd(29)} | ${r.matchedBase}`
    );
  }
  lines.push('');

  lines.push('UNMATCHED ITEMS (gaps)');
  lines.push('======================');
  lines.push(
    'Appearances | Raw name                                                                | Stripped to'
  );
  lines.push(
    '----------- | ----------------------------------------------------------------------- | ----------'
  );
  for (const r of unmatched) {
    lines.push(
      `${String(r.appearances).padStart(11)} | ${r.rawName.padEnd(71)} | ${r.strippedTo}`
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
  const outPath = path.join(logsDir, 'purchase-gap-analysis-v2.txt');
  fs.writeFileSync(outPath, report);
  console.log(`Full report saved to: ${outPath}`);
}

analyseGaps()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
