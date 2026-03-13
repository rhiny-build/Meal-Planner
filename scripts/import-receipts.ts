import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as readline from 'readline';
// @ts-expect-error - pdf-parse v1 has no types
import pdf from 'pdf-parse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BLOB_URL =
  'https://b1xeg5q6nnij4alc.private.blob.vercel-storage.com/Archive%20%281%29.zip';

// ─── PDF text parsing ────────────────────────────────────────────────

interface ReceiptData {
  filename: string;
  purchaseDate: Date;
  items: string[];
}

/**
 * Parse the date from a Sainsbury's receipt header.
 * Looks for "Slot time: <day> <date>, <time>" pattern.
 * e.g. "Slot time: Tuesday 27th January 2026, 9:00am - 10:00am"
 */
function parseDate(text: string): Date | null {
  const match = text.match(
    /Slot time:\s*\w+\s+(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/i
  );
  if (!match) return null;
  const [, day, month, year] = match;
  const dateStr = `${day} ${month} ${year}`;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

/**
 * Extract product names from receipt text.
 * Product lines start with a quantity (e.g. "1", "2", "0.334kg") and end with £price.
 * Long product names wrap across multiple lines — continuation lines don't start
 * with a quantity prefix but the last continuation ends with £price.
 * We first join wrapped lines, then parse each combined line.
 */
function parseItems(text: string): string[] {
  const rawLines = text.split('\n');
  const items: string[] = [];
  let inItemsSection = false;

  // Collect only lines between the items header and "Order summary"
  const sectionLines: string[] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/(?:Groceries|Delivery summary)\s*\(\d+\s*items?\)/i.test(trimmed)) {
      inItemsSection = true;
      continue;
    }
    if (/^Order summary/i.test(trimmed)) break;
    if (inItemsSection) sectionLines.push(trimmed);
  }

  // Join continuation lines. A new product line starts with a qty prefix (e.g. "1", "2",
  // "0.334kg") followed by a product name starting with an UPPERCASE letter.
  // Continuation lines are everything else — size specs ("476g£2.75", "100ml£3.30"),
  // or wrapped text ("Conditioner 275ml£3.50", "x5 425g£3.00").
  const isNewItem = (line: string) =>
    /^(\d+(?:\.\d+)?(?:kg)?)\s*[A-Z]/.test(line);

  const joined: string[] = [];
  for (const line of sectionLines) {
    if (isNewItem(line)) {
      joined.push(line);
    } else if (joined.length > 0) {
      joined[joined.length - 1] += ' ' + line;
    }
  }

  // Parse each joined line
  for (const line of joined) {
    const m = line.match(/^(\d+(?:\.\d+)?(?:kg)?)\s*(.+?)£[\d.]+$/);
    if (m) {
      const productName = m[2].trim();
      if (productName) items.push(productName);
    }
  }

  return items;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipts-'));
  const zipPath = path.join(tmpDir, 'receipts.zip');

  try {
    // Download zip from Vercel Blob
    console.log('Downloading receipts archive from Vercel Blob...');
    const response = await fetch(BLOB_URL, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }
    const buf = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(zipPath, buf);
    console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

    // Unzip
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: 'ignore' });

    // Find all PDFs
    const pdfFiles = findPdfs(tmpDir);
    console.log(`Found ${pdfFiles.length} PDF files\n`);

    // Parse each receipt
    const receipts: ReceiptData[] = [];
    const errors: { file: string; error: string }[] = [];

    for (const pdfFile of pdfFiles) {
      const filename = path.basename(pdfFile);
      try {
        const buffer = fs.readFileSync(pdfFile);
        const data = await pdf(buffer);
        const text: string = data.text;

        const purchaseDate = parseDate(text);
        if (!purchaseDate) {
          console.warn(`⚠ Skipping ${filename}: could not parse date`);
          errors.push({ file: filename, error: 'Could not parse date' });
          continue;
        }

        const items = parseItems(text);
        if (items.length === 0) {
          console.warn(`⚠ Skipping ${filename}: no items found`);
          errors.push({ file: filename, error: 'No items found' });
          continue;
        }

        receipts.push({ filename, purchaseDate, items });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`⚠ Skipping ${filename}: ${msg}`);
        errors.push({ file: filename, error: msg });
      }
    }

    // Log summary
    const totalItems = receipts.reduce((sum, r) => sum + r.items.length, 0);

    console.log('─── Extraction Summary ───');
    for (const r of receipts) {
      console.log(
        `\n${r.filename}  |  ${r.purchaseDate.toISOString().split('T')[0]}  |  ${r.items.length} items`
      );
      for (const item of r.items.slice(0, 5)) {
        console.log(`  - ${item}`);
      }
      if (r.items.length > 5) {
        console.log(`  ... and ${r.items.length - 5} more`);
      }
    }

    if (errors.length > 0) {
      console.log(`\n⚠ ${errors.length} PDF(s) skipped due to errors`);
      for (const e of errors) {
        console.log(`  - ${e.file}: ${e.error}`);
      }
    }

    console.log(
      `\nFound ${receipts.length} receipts with ${totalItems} total line items.`
    );

    // Ask for confirmation
    const proceed = await askConfirmation('Proceed with database write? (y/n) ');
    if (!proceed) {
      console.log('Aborted.');
      return;
    }

    // Write to database
    console.log('\nWriting to database...');

    // Fetch existing records to skip duplicates
    const existing = await prisma.purchaseHistory.findMany({
      select: { rawName: true, purchaseDate: true },
    });
    const existingSet = new Set(
      existing.map(
        (e) => `${e.rawName}|${e.purchaseDate.toISOString()}`
      )
    );

    const toInsert: { rawName: string; purchaseDate: Date }[] = [];
    let duplicates = 0;

    for (const receipt of receipts) {
      for (const item of receipt.items) {
        const key = `${item}|${receipt.purchaseDate.toISOString()}`;
        if (existingSet.has(key)) {
          duplicates++;
        } else {
          toInsert.push({
            rawName: item,
            purchaseDate: receipt.purchaseDate,
          });
          existingSet.add(key); // prevent intra-batch duplicates
        }
      }
    }

    if (toInsert.length > 0) {
      await prisma.purchaseHistory.createMany({ data: toInsert });
    }

    console.log(
      `Imported ${toInsert.length} items from ${receipts.length} receipts. ${duplicates} duplicates skipped.`
    );
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

function findPdfs(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPdfs(fullPath));
    } else if (entry.name.toLowerCase().endsWith('.pdf')) {
      results.push(fullPath);
    }
  }
  return results;
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
