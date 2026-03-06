import type { PageText } from './text-extractor'

const CHUNK_SIZE = 2000 // characters (~512 tokens)
const CHUNK_OVERLAP = 500 // characters (~128 tokens)

export interface Chunk {
  text: string
  index: number
  page: number
}

/**
 * Split page-tagged text into overlapping chunks for embedding.
 * Each chunk records the page number where it begins.
 */
export function chunkText(pages: PageText[]): Chunk[] {
  if (pages.length === 0) return []

  // Build a flat string while recording page-start offsets
  const pageOffsets: { offset: number; page: number }[] = []
  let combined = ''
  for (const { text, page } of pages) {
    pageOffsets.push({ offset: combined.length, page })
    combined += text + '\n'
  }

  const trimmed = combined.trim()
  if (!trimmed) return []

  /** Return the page number that contains the given character offset */
  const pageAt = (offset: number): number => {
    let page = pageOffsets[0].page
    for (const po of pageOffsets) {
      if (po.offset <= offset) page = po.page
      else break
    }
    return page
  }

  if (trimmed.length <= CHUNK_SIZE) {
    return [{ text: trimmed, index: 0, page: pageAt(0) }]
  }

  const chunks: Chunk[] = []
  let start = 0
  let index = 0

  while (start < trimmed.length) {
    const end = Math.min(start + CHUNK_SIZE, trimmed.length)
    chunks.push({ text: trimmed.slice(start, end), index, page: pageAt(start) })
    if (end === trimmed.length) break
    start += CHUNK_SIZE - CHUNK_OVERLAP
    index++
  }

  return chunks
}
