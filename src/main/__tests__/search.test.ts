import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { rm } from 'fs/promises'
import { sql } from 'drizzle-orm'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => tmpdir()),
    isPackaged: false,
  },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
  ipcMain: { handle: vi.fn() },
}))

vi.mock('../embedding/embedding-service', () => ({
  embed: vi.fn(),
}))

function makeVec(dims: number, seed: number): number[] {
  return Array.from({ length: dims }, (_, i) => Math.sin(i * seed + 1))
}

describe('search', () => {
  let dbFile: string

  beforeEach(() => {
    dbFile = join(tmpdir(), `bookshelf-search-test-${randomUUID()}.db`)
    process.env.DB_FILE_NAME = `file:${dbFile}`
    vi.resetModules()
  })

  afterEach(async () => {
    delete process.env.DB_FILE_NAME
    try { await rm(dbFile) } catch { /* ignore */ }
  })

  describe('given an empty query', () => {
    it('when searching, then returns empty array', async () => {
      const { runMigrations } = await import('../db')
      await runMigrations()
      const { search } = await import('../IPC/search')

      const results = await search('   ')

      expect(results).toEqual([])
    })
  })

  describe('given indexed documents with known embeddings', () => {
    it('when searching, then returns results ordered by cosine distance', async () => {
      const { embed } = await import('../embedding/embedding-service')
      const { db, runMigrations } = await import('../db')
      const { chunksTable, documentsTable } = await import('../schema')
      const { search } = await import('../IPC/search')

      await runMigrations()

      const [docClose] = await db
        .insert(documentsTable)
        .values({ title: 'close.pdf', extension: 'pdf', personal: false })
        .returning()
      const [docFar] = await db
        .insert(documentsTable)
        .values({ title: 'far.pdf', extension: 'pdf', personal: false })
        .returning()

      const queryVec = makeVec(1024, 1.0)
      const closeVec = makeVec(1024, 1.0)  // identical → distance ≈ 0
      const farVec   = makeVec(1024, 50.0) // very different

      // Insert with vector1bit() so libsql stores proper BIT_BLOB format
      await db.insert(chunksTable).values({
        documentId: docClose.id,
        text: 'close match',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(closeVec)})` as unknown as number[],
      })
      await db.insert(chunksTable).values({
        documentId: docFar.id,
        text: 'far match',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(farVec)})` as unknown as number[],
      })

      vi.mocked(embed).mockResolvedValue([queryVec])

      const results = await search('anything', 10)

      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('close.pdf')
      expect(results[0].score).toBeLessThan(results[1].score)
    })

    it('when searching, then returns multiple passages from the same document', async () => {
      const { embed } = await import('../embedding/embedding-service')
      const { db, runMigrations } = await import('../db')
      const { chunksTable, documentsTable } = await import('../schema')
      const { search } = await import('../IPC/search')

      await runMigrations()

      const [doc] = await db
        .insert(documentsTable)
        .values({ title: 'multi-chunk.pdf', extension: 'pdf', personal: false })
        .returning()

      const vec = makeVec(1024, 1.0)
      await db.insert(chunksTable).values([
        { documentId: doc.id, text: 'chunk one', chunkIndex: 0, embedding: sql`vector1bit(${JSON.stringify(vec)})` as unknown as number[] },
        { documentId: doc.id, text: 'chunk two', chunkIndex: 1, embedding: sql`vector1bit(${JSON.stringify(makeVec(1024, 2.0))})` as unknown as number[] },
      ])

      vi.mocked(embed).mockResolvedValue([vec])

      const results = await search('anything', 10)

      expect(results).toHaveLength(2)
      results.forEach((r) => expect(r.documentId).toBe(doc.id))
    })
  })
})
