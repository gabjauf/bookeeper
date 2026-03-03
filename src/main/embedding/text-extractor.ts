import { readFile } from 'fs/promises'

/**
 * Extract all text from a PDF file.
 * Returns concatenated text from all pages, separated by newlines.
 * Returns empty string for non-PDF files or if extraction fails.
 */
export async function extractText(filePath: string): Promise<string> {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext !== 'pdf') return ''

  const mupdf = await import('mupdf')
  const data = await readFile(filePath)
  const doc = new mupdf.PDFDocument(data)

  const pageCount = doc.countPages()
  const pages: string[] = []

  for (let i = 0; i < pageCount; i++) {
    await new Promise<void>((r) => setImmediate(r))
    const page = doc.loadPage(i)
    const structuredText = page.toStructuredText('preserve-whitespace')
    const text = structuredText.asText()
    if (text.trim()) pages.push(text)
  }

  return pages.join('\n')
}
