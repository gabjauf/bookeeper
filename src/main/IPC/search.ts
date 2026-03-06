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
  page: number
  score: number
}

export async function search(query: string, limit = DEFAULT_LIMIT): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const [queryEmbedding] = await embed([query])
  const queryJson = JSON.stringify(queryEmbedding)
  const distance = sql<number>`vector_distance_cos(${chunksTable.embedding}, vector1bit(${queryJson}))`

  return db
    .select({
      documentId: chunksTable.documentId,
      snippet: chunksTable.text,
      page: chunksTable.page,
      title: documentsTable.title,
      extension: documentsTable.extension,
      score: distance,
    })
    .from(chunksTable)
    .innerJoin(documentsTable, eq(chunksTable.documentId, documentsTable.id))
    .orderBy(distance)
    .limit(limit)
    .all()
}

registerIpc(
  IPCAction.DOCUMENT_SEARCH,
  (_event: Electron.IpcMainInvokeEvent, { query, limit }: { query: string; limit?: number }) => search(query, limit)
)
