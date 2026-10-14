/**
 * PDF -> text, the way pdf-parse built it (the text the receipt parser was written against): items on the same
 * baseline are joined directly, a new baseline starts a new line, pages are separated by a blank line.
 * Uses pdfjs-dist (maintained) rather than pdf-parse, whose bundled old pdf.js fails randomly on Node 20+ and can
 * crash the process with an unhandled rejection.
 */

type TextItem = { str: string; transform: number[] }

export async function pdfToText(data: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // pdf.js takes ownership of the memory it is given, and a Buffer can be a slice of Node's shared pool: give it its own copy.
  const own = new Uint8Array(data.byteLength)
  own.set(data)
  const doc = await pdfjs.getDocument({ data: own, useSystemFonts: true, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise
  try {
    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      let lastY: number | undefined
      let text = ''
      for (const raw of content.items) {
        if (!('str' in raw)) continue
        const item = raw as TextItem
        const y = item.transform[5]
        text += lastY === undefined || lastY === y ? item.str : '\n' + item.str
        lastY = y
      }
      pages.push(text)
    }
    return pages.join('\n\n')
  } finally {
    await doc.destroy()
  }
}
