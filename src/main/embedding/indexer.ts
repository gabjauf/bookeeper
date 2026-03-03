import { BrowserWindow } from 'electron'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { chunksTable } from '../schema'
import { IPCAction } from '../../shared/ipc-actions'
import { extractText } from './text-extractor'
import { chunkText } from './chunker'
import { embed } from './embedding-service'

// ─── Queue ────────────────────────────────────────────────────────────────────

const queue: Array<{ documentId: string; filePath: string; title: string }> = []
let processing = false

function broadcast(count: number, currentFile?: string): void {
  for (const win of BrowserWindow.getAllWindows())
    win.webContents.send(IPCAction.INDEXING_QUEUE_UPDATE, { count, currentFile })
}

export function enqueueIndex(documentId: string, filePath: string, title: string): void {
  queue.push({ documentId, filePath, title })
  if (!processing) drain()
}

async function drain(): Promise<void> {
  processing = true
  while (queue.length > 0) {
    const job = queue[0]
    broadcast(queue.length, job.title)
    try {
      await indexDocument(job.documentId, job.filePath)
    } catch (err) {
      console.error('Indexing failed for', job.documentId, err)
    }
    queue.shift()
  }
  broadcast(0)
  processing = false
}

// ─── Core logic ───────────────────────────────────────────────────────────────

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
