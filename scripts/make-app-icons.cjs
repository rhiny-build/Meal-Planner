/**
 * Makes the app icons from one drawing: green ground, a cream plate with an amber centre.
 * Run: node scripts/make-app-icons.cjs
 * Writes app/icon.png and app/apple-icon.png (Next file conventions) and public/icons/*.png (manifest).
 * Maskable icons keep the mark inside the middle 80% so any round or squircle crop leaves it whole.
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const GREEN = '#1f5c4a'
const CREAM = '#f3f5f2'
const AMBER = '#f2b544'

/** markScale: share of the icon the plate fills (0.5 for edge-to-edge icons, smaller for maskable) */
const svg = (markScale) => {
  const plate = 512 * markScale
  const r = plate / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${GREEN}"/>
  <circle cx="256" cy="256" r="${r}" fill="${CREAM}"/>
  <circle cx="256" cy="256" r="${r * 0.68}" fill="none" stroke="${GREEN}" stroke-width="${r * 0.07}"/>
  <circle cx="256" cy="256" r="${r * 0.36}" fill="${AMBER}"/>
</svg>`
}

const outputs = [
  ['app/icon.png', 512, 0.46],
  ['app/apple-icon.png', 180, 0.46],
  ['public/icons/icon-192.png', 192, 0.46],
  ['public/icons/icon-512.png', 512, 0.46],
  ['public/icons/icon-maskable-512.png', 512, 0.36],
]

;(async () => {
  for (const [file, size, scale] of outputs) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    await sharp(Buffer.from(svg(scale))).resize(size, size).png().toFile(target)
    console.log('wrote', file)
  }
})()
