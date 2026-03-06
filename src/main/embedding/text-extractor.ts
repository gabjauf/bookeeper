import { readFile } from 'fs/promises'

export interface PageText {
  text: string
  page: number
}

/**
 * Extract text from a PDF file, one entry per page.
 * Returns an empty array for non-PDF files or if extraction fails.
 */
export async function extractText(filePath: string): Promise<PageText[]> {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext !== 'pdf') return []

  const mupdf = await import('mupdf')
  const data = await readFile(filePath)
  const doc = new mupdf.PDFDocument(data)

  const pageCount = doc.countPages()
  const pages: PageText[] = []

  for (let i = 0; i < pageCount; i++) {
    await new Promise<void>((r) => setImmediate(r))
    const page = doc.loadPage(i)
    const structuredText = page.toStructuredText('preserve-whitespace')
    const text = structuredText.asText()
    if (text.trim()) pages.push({ text, page: i + 1 })
  }

  return pages
}
