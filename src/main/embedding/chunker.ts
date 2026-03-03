const CHUNK_SIZE = 2000 // characters (~512 tokens)
const CHUNK_OVERLAP = 500 // characters (~128 tokens)

export interface Chunk {
  text: string
  index: number
}

/**
 * Split text into overlapping chunks for embedding.
 * Returns an empty array for blank/whitespace-only input.
 */
export function chunkText(text: string): Chunk[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  if (trimmed.length <= CHUNK_SIZE) {
    return [{ text: trimmed, index: 0 }]
  }

  const chunks: Chunk[] = []
  let start = 0
  let index = 0

  while (start < trimmed.length) {
    const end = Math.min(start + CHUNK_SIZE, trimmed.length)
    chunks.push({ text: trimmed.slice(start, end), index })
    if (end === trimmed.length) break
    start += CHUNK_SIZE - CHUNK_OVERLAP
    index++
  }

  return chunks
}
