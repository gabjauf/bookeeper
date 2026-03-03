import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { rm } from 'fs/promises'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => tmpdir()),
    isPackaged: false,
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}))

vi.mock('../../embedding/text-extractor', () => ({
  extractText: vi.fn(),
}))

vi.mock('../../embedding/embedding-service', () => ({
  embed: vi.fn(),
}))

describe('indexDocument', () => {
  let dbFile: string

  beforeEach(() => {
    dbFile = join(tmpdir(), `bookshelf-indexer-test-${randomUUID()}.db`)
    process.env.DB_FILE_NAME = `file:${dbFile}`
    vi.resetModules()
  })

  afterEach(async () => {
    delete process.env.DB_FILE_NAME
    try { await rm(dbFile) } catch { /* ignore */ }
  })

  describe('given a document with extractable text', () => {
    it('when indexed, then chunks are stored in the database', async () => {
      const { extractText } = await import('../../embedding/text-extractor')
      const { embed } = await import('../../embedding/embedding-service')

      // 3 chunks worth of text (~6000 chars)
      const fakeText = 'The quick brown fox. '.repeat(300)
      vi.mocked(extractText).mockResolvedValue(fakeText)

      // Return a 128-byte binary embedding per chunk call
      vi.mocked(embed).mockImplementation(async (texts) =>
        texts.map(() => new Uint8Array(128))
      )

      const { db, runMigrations } = await import('../../db')
      const { chunksTable, documentsTable } = await import('../../schema')
      const { indexDocument } = await import('../../embedding/indexer')

      await runMigrations()

      // Insert a real document first
      const [doc] = await db
        .insert(documentsTable)
        .values({
          title: 'test.pdf',
          extension: 'pdf',
          personal: false,
        })
        .returning()

      await indexDocument(doc.id, `/tmp/${doc.id}.pdf`)

      const chunks = await db.select().from(chunksTable)
      expect(chunks.length).toBeGreaterThan(0)
      chunks.forEach((chunk) => {
        expect(chunk.documentId).toBe(doc.id)
        expect(chunk.text.length).toBeGreaterThan(0)
        expect(chunk.embedding).toBeDefined()
      })
    })
  })

  describe('given a document with no extractable text', () => {
    it('when indexed, then no chunks are stored', async () => {
      const { extractText } = await import('../../embedding/text-extractor')
      const { embed } = await import('../../embedding/embedding-service')

      vi.mocked(extractText).mockResolvedValue('')
      vi.mocked(embed).mockResolvedValue([])

      const { db, runMigrations } = await import('../../db')
      const { chunksTable, documentsTable } = await import('../../schema')
      const { indexDocument } = await import('../../embedding/indexer')

      await runMigrations()

      const [doc] = await db
        .insert(documentsTable)
        .values({ title: 'empty.pdf', extension: 'pdf', personal: false })
        .returning()

      await indexDocument(doc.id, `/tmp/${doc.id}.pdf`)

      const chunks = await db.select().from(chunksTable)
      expect(chunks).toEqual([])
    })
  })

  describe('given a document already indexed', () => {
    it('when indexed again, then no duplicate chunks are created', async () => {
      const { extractText } = await import('../../embedding/text-extractor')
      const { embed } = await import('../../embedding/embedding-service')

      vi.mocked(extractText).mockResolvedValue('Short text for testing.')
      vi.mocked(embed).mockImplementation(async (texts) =>
        texts.map(() => new Uint8Array(128))
      )

      const { db, runMigrations } = await import('../../db')
      const { chunksTable, documentsTable } = await import('../../schema')
      const { indexDocument } = await import('../../embedding/indexer')

      await runMigrations()

      const [doc] = await db
        .insert(documentsTable)
        .values({ title: 'dup.pdf', extension: 'pdf', personal: false })
        .returning()

      await indexDocument(doc.id, `/tmp/${doc.id}.pdf`)
      const countAfterFirst = (await db.select().from(chunksTable)).length

      await indexDocument(doc.id, `/tmp/${doc.id}.pdf`)
      const countAfterSecond = (await db.select().from(chunksTable)).length

      expect(countAfterSecond).toBe(countAfterFirst)
    })
  })
})
