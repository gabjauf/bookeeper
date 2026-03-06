import { sql, eq } from 'drizzle-orm'
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

export async function search(query: string, limit = DEFAULT_LIMIT): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const [queryEmbedding] = await embed([query])
  const queryJson = JSON.stringify(queryEmbedding)
  const distance = sql<number>`vector_distance_cos(${chunksTable.embedding}, vector1bit(${queryJson}))`

  const rows = await db
    .select({
      documentId: chunksTable.documentId,
      snippet: chunksTable.text,
      title: documentsTable.title,
      extension: documentsTable.extension,
      distance,
    })
    .from(chunksTable)
    .innerJoin(documentsTable, eq(chunksTable.documentId, documentsTable.id))
    .orderBy(distance)
    .limit(limit * 5)
    .all()

  const seen = new Set<string>()
  const results: SearchResult[] = []
  for (const row of rows) {
    if (seen.has(row.documentId)) continue
    seen.add(row.documentId)
    results.push({
      documentId: row.documentId,
      title: row.title,
      extension: row.extension,
      snippet: row.snippet,
      score: row.distance,
    })
    if (results.length >= limit) break
  }

  return results
}

registerIpc(
  IPCAction.DOCUMENT_SEARCH,
  (_event: Electron.IpcMainInvokeEvent, { query, limit }: { query: string; limit?: number }) => search(query, limit)
)
