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
}))

describe('runMigrations', () => {
  let dbFile: string

  beforeEach(() => {
    dbFile = join(tmpdir(), `bookshelf-test-${randomUUID()}.db`)
    process.env.DB_FILE_NAME = `file:${dbFile}`
    vi.resetModules()
  })

  afterEach(async () => {
    delete process.env.DB_FILE_NAME
    try { await rm(dbFile) } catch { /* ignore */ }
  })

  describe('given a fresh empty database', () => {
    it('when runMigrations completes, then the document table is queryable', async () => {
      const { db, runMigrations } = await import('../db')
      const { documentsTable } = await import('../schema')

      await runMigrations()

      // Throws "no such table: document" if migrations didn't run
      const rows = await db.select().from(documentsTable)
      expect(rows).toEqual([])
    })
  })
})
