import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

const zipPath = process.argv[2];

if (!zipPath) {
  console.error('Usage: npx ts-node scripts/upload-receipts.ts ./path/to/receipts.zip');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(path.resolve(zipPath));
const filename = path.basename(zipPath);

console.log(`Uploading ${filename}...`);

const blob = await put(`receipts/${filename}`, fileBuffer, { 
  access: 'private',
  addRandomSuffix: false
});

console.log('Uploaded successfully.');
console.log('Blob URL:', blob.url);
console.log('Save this URL — the import script will need it.');