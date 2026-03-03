import { eq } from 'drizzle-orm'
import { db } from '../db'
import { chunksTable } from '../schema'
import { extractText } from './text-extractor'
import { chunkText } from './chunker'
import { embed } from './embedding-service'

/**
 * Index a document by extracting text, chunking, embedding, and storing in the DB.
 * Skips documents that already have chunks (idempotent).
 */
export async function indexDocument(documentId: string, filePath: string): Promise<void> {
  // Skip if already indexed
  const existing = await db
    .select({ id: chunksTable.id })
    .from(chunksTable)
    .where(eq(chunksTable.documentId, documentId))
    .limit(1)

  if (existing.length > 0) return

  const text = await extractText(filePath)
  const chunks = chunkText(text)
  if (chunks.length === 0) return

  const embeddings = await embed(chunks.map((c) => c.text))

  await db.insert(chunksTable).values(
    chunks.map((chunk, i) => ({
      documentId,
      text: chunk.text,
      chunkIndex: chunk.index,
      embedding: embeddings[i],
    }))
  )
}
