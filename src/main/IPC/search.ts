import { eq } from 'drizzle-orm'
import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import { db } from '../db'
import { chunksTable, documentsTable } from '../schema'
import { embed } from '../embedding/embedding-service'

const DEFAULT_LIMIT = 10

export interface SearchResult {
  documentId: string
  title: string
  extension: string
  snippet: string
  score: number
}

function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    let xor = a[i] ^ b[i]
    while (xor) {
      dist += xor & 1
      xor >>= 1
    }
  }
  return dist
}

registerIpc(
  IPCAction.DOCUMENT_SEARCH,
  async (_event, { query, limit = DEFAULT_LIMIT }: { query: string; limit?: number }) => {
    if (!query.trim()) return []

    const [queryEmbedding] = await embed([query])

    // Fetch all chunks with their embeddings and document info
    const rows = await db
      .select({
        chunkId: chunksTable.id,
        documentId: chunksTable.documentId,
        text: chunksTable.text,
        embedding: chunksTable.embedding,
        title: documentsTable.title,
        extension: documentsTable.extension,
      })
      .from(chunksTable)
      .innerJoin(documentsTable, eq(chunksTable.documentId, documentsTable.id))

    if (rows.length === 0) return []

    // Score each chunk by Hamming distance (lower = more similar)
    const scored = rows.map((row) => ({
      documentId: row.documentId,
      title: row.title,
      extension: row.extension,
      snippet: row.text,
      score: hammingDistance(queryEmbedding, row.embedding),
    }))

    // Sort ascending (lower distance = better match), deduplicate by document
    scored.sort((a, b) => a.score - b.score)

    const seen = new Set<string>()
    const results: SearchResult[] = []
    for (const item of scored) {
      if (seen.has(item.documentId)) continue
      seen.add(item.documentId)
      results.push(item)
      if (results.length >= limit) break
    }

    return results
  }
)
