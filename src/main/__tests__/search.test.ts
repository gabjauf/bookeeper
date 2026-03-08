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
    it('when searching, then results are ordered by RRF score descending', async () => {
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
      const closeVec = makeVec(1024, 1.0)  // identical → lowest distance
      const farVec   = makeVec(1024, 50.0) // very different

      await db.insert(chunksTable).values({
        documentId: docClose.id,
        text: 'close match',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(closeVec)})` as unknown as number[],
      })
      await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${docClose.id}`)

      await db.insert(chunksTable).values({
        documentId: docFar.id,
        text: 'far match',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(farVec)})` as unknown as number[],
      })
      await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${docFar.id}`)

      vi.mocked(embed).mockResolvedValue([queryVec])

      const results = await search('close match', 10)

      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('close.pdf')
      // RRF: higher score = better match
      expect(results[0].score).toBeGreaterThan(results[1].score)
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
      await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${doc.id}`)

      vi.mocked(embed).mockResolvedValue([vec])

      const results = await search('anything', 10)

      expect(results).toHaveLength(2)
      results.forEach((r) => expect(r.documentId).toBe(doc.id))
    })
  })

  describe('given a chunk with an exact keyword match', () => {
    it('when FTS query matches, then chunk appears in results', async () => {
      const { embed } = await import('../embedding/embedding-service')
      const { db, runMigrations } = await import('../db')
      const { chunksTable, documentsTable } = await import('../schema')
      const { search } = await import('../IPC/search')

      await runMigrations()

      const [doc] = await db
        .insert(documentsTable)
        .values({ title: 'photosynthesis.pdf', extension: 'pdf', personal: false })
        .returning()

      const irrelevantVec = makeVec(1024, 99.0) // semantically far from query

      await db.insert(chunksTable).values({
        documentId: doc.id,
        text: 'Photosynthesis is the process by which plants convert light into energy.',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(irrelevantVec)})` as unknown as number[],
      })
      await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${doc.id}`)

      vi.mocked(embed).mockResolvedValue([makeVec(1024, 1.0)])

      const results = await search('photosynthesis', 10)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].title).toBe('photosynthesis.pdf')
    })
  })

  describe('given a chunk matching both keyword and vector', () => {
    it('when searching, then it ranks higher than single-match-only chunks', async () => {
      const { embed } = await import('../embedding/embedding-service')
      const { db, runMigrations } = await import('../db')
      const { chunksTable, documentsTable } = await import('../schema')
      const { search } = await import('../IPC/search')

      await runMigrations()

      const queryVec = makeVec(1024, 1.0)

      const [docBoth] = await db
        .insert(documentsTable)
        .values({ title: 'both.pdf', extension: 'pdf', personal: false })
        .returning()
      const [docVectorOnly] = await db
        .insert(documentsTable)
        .values({ title: 'vector-only.pdf', extension: 'pdf', personal: false })
        .returning()

      // "both" chunk: exact keyword + semantically close
      await db.insert(chunksTable).values({
        documentId: docBoth.id,
        text: 'quantum entanglement explained clearly',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(queryVec)})` as unknown as number[],
      })
      await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${docBoth.id}`)

      // "vector-only" chunk: semantically close but no keyword match
      await db.insert(chunksTable).values({
        documentId: docVectorOnly.id,
        text: 'some other content without the special term',
        chunkIndex: 0,
        embedding: sql`vector1bit(${JSON.stringify(makeVec(1024, 1.01))})` as unknown as number[],
      })
      await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${docVectorOnly.id}`)

      vi.mocked(embed).mockResolvedValue([queryVec])

      const results = await search('quantum entanglement', 10)

      const bothResult = results.find((r) => r.title === 'both.pdf')
      const vectorOnlyResult = results.find((r) => r.title === 'vector-only.pdf')

      expect(bothResult).toBeDefined()
      expect(vectorOnlyResult).toBeDefined()
      expect(bothResult!.score).toBeGreaterThan(vectorOnlyResult!.score)
    })
  })

  describe('given many results', () => {
    it('when paginating with offset, then returns distinct non-overlapping pages', async () => {
      const { embed } = await import('../embedding/embedding-service')
      const { db, runMigrations } = await import('../db')
      const { chunksTable, documentsTable } = await import('../schema')
      const { search } = await import('../IPC/search')

      await runMigrations()

      // Insert 15 documents with distinct chunks
      for (let i = 0; i < 15; i++) {
        const [doc] = await db
          .insert(documentsTable)
          .values({ title: `doc-${i}.pdf`, extension: 'pdf', personal: false })
          .returning()
        const vec = makeVec(1024, i + 1)
        await db.insert(chunksTable).values({
          documentId: doc.id,
          text: `unique content for document number ${i}`,
          chunkIndex: 0,
          embedding: sql`vector1bit(${JSON.stringify(vec)})` as unknown as number[],
        })
        await db.run(sql`INSERT INTO chunks_fts(rowid, text) SELECT rowid, text FROM chunks WHERE document_id = ${doc.id}`)
      }

      vi.mocked(embed).mockResolvedValue([makeVec(1024, 1.0)])

      const page1 = await search('unique content', 5, 0)
      const page2 = await search('unique content', 5, 5)

      expect(page1).toHaveLength(5)
      expect(page2).toHaveLength(5)

      const page1Ids = new Set(page1.map((r) => r.title))
      const page2Ids = new Set(page2.map((r) => r.title))
      const overlap = [...page1Ids].filter((id) => page2Ids.has(id))
      expect(overlap).toHaveLength(0)
    })
  })
})
