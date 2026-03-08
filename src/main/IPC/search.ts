import { sql } from 'drizzle-orm'
import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import { db } from '../db'
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

/** Strip FTS5 special characters that would cause MATCH syntax errors. */
function sanitizeFtsQuery(q: string): string {
  return q.replace(/[^\w\s]/g, ' ').trim()
}

export async function search(query: string, limit = DEFAULT_LIMIT, offset = 0): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const [queryEmbedding] = await embed([query])
  const queryJson = JSON.stringify(queryEmbedding)
  const ftsQuery = sanitizeFtsQuery(query)

  if (!ftsQuery) {
    // Edge case: query was entirely special chars — vector-only fallback
    return db.all<SearchResult>(sql`
      SELECT
        c.document_id AS documentId,
        c.text        AS snippet,
        c.page,
        d.title,
        d.extension,
        (1.0 / (60.0 + ROW_NUMBER() OVER (
          ORDER BY vector_distance_cos(c.embedding, vector1bit(${queryJson})) ASC
        ))) AS score
      FROM chunks c
      JOIN document d ON d.id = c.document_id
      ORDER BY score DESC
      LIMIT ${limit} OFFSET ${offset}
    `)
  }

  // SQLite does not allow window functions directly in UNION ALL arms,
  // so each leg is wrapped in a subquery before the UNION.
  return db.all<SearchResult>(sql`
    SELECT
      c.document_id AS documentId,
      c.text        AS snippet,
      c.page,
      d.title,
      d.extension,
      SUM(1.0 / (60.0 + ranked.rrf_rank)) AS score
    FROM (
      SELECT rid, rrf_rank FROM (
        SELECT rowid AS rid,
          ROW_NUMBER() OVER (
            ORDER BY vector_distance_cos(embedding, vector1bit(${queryJson})) ASC
          ) AS rrf_rank
        FROM chunks
      )

      UNION ALL

      SELECT rid, rrf_rank FROM (
        SELECT c2.rowid AS rid,
          ROW_NUMBER() OVER (ORDER BY fts.rank ASC) AS rrf_rank
        FROM chunks_fts fts
        JOIN chunks c2 ON c2.rowid = fts.rowid
        WHERE chunks_fts MATCH ${ftsQuery}
      )
    ) ranked
    JOIN chunks c ON c.rowid = ranked.rid
    JOIN document d ON d.id = c.document_id
    GROUP BY c.id
    ORDER BY score DESC
    LIMIT ${limit} OFFSET ${offset}
  `)
}

registerIpc(
  IPCAction.DOCUMENT_SEARCH,
  (_event: Electron.IpcMainInvokeEvent, { query, limit, offset }: { query: string; limit?: number; offset?: number }) =>
    search(query, limit, offset)
)
