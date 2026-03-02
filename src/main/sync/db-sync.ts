import { db } from '../db'
import { documentsTable } from '../schema'
import { eq } from 'drizzle-orm'
import { writeFile, readFile } from 'fs/promises'
import path from 'path'

const DB_EXPORT_FILE = 'documents.json'

export interface ExportedDocument {
  id: string
  title: string
  extension: string
  personal: boolean
  sha: string | null
  createdAt: string | null
  updatedAt: string | null
  deviceId: string | null
  syncVersion: number | null
}

/**
 * Export documents table to JSON file
 */
export async function exportDatabase(exportDir: string): Promise<string> {
  const docs = await db.select().from(documentsTable)
  const exportPath = path.join(exportDir, DB_EXPORT_FILE)
  await writeFile(exportPath, JSON.stringify(docs, null, 2))
  return exportPath
}

/**
 * Import and merge documents from JSON file
 * Uses last-write-wins strategy based on updatedAt
 */
export async function importDatabase(importPath: string): Promise<void> {
  let content: string
  try {
    content = await readFile(importPath, 'utf-8')
  } catch {
    // File doesn't exist yet (first sync)
    return
  }

  const remoteDocs: ExportedDocument[] = JSON.parse(content)

  for (const remoteDoc of remoteDocs) {
    const [localDoc] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, remoteDoc.id))

    if (!localDoc) {
      // New document from remote - insert
      await db.insert(documentsTable).values({
        id: remoteDoc.id,
        title: remoteDoc.title,
        extension: remoteDoc.extension,
        personal: remoteDoc.personal,
        sha: remoteDoc.sha,
        createdAt: remoteDoc.createdAt,
        updatedAt: remoteDoc.updatedAt,
        deviceId: remoteDoc.deviceId,
        syncVersion: remoteDoc.syncVersion,
      })
    } else if (remoteDoc.updatedAt && remoteDoc.updatedAt > (localDoc.updatedAt || '')) {
      // Remote is newer - update local
      await db
        .update(documentsTable)
        .set({
          title: remoteDoc.title,
          extension: remoteDoc.extension,
          personal: remoteDoc.personal,
          sha: remoteDoc.sha,
          updatedAt: remoteDoc.updatedAt,
          deviceId: remoteDoc.deviceId,
          syncVersion: remoteDoc.syncVersion,
        })
        .where(eq(documentsTable.id, remoteDoc.id))
    }
    // If local is newer or same, keep local (will be exported next sync)
  }
}
