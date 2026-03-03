import { eq } from 'drizzle-orm'

import { db } from '../db'
import { chunksTable, documentsTable } from '../schema'
import { shell } from 'electron'
import path from 'path'
import { BOOK_PATH } from '../consts/PATH'

export async function deleteDocumentById(documentId: string) {
  const document = await findDocumentById(documentId)
  // Delete chunks first (FK dependency), then the document record
  await db.delete(chunksTable).where(eq(chunksTable.documentId, documentId))
  await db.delete(documentsTable).where(eq(documentsTable.id, documentId))
  await shell.trashItem(path.join(BOOK_PATH, `${documentId}.${document.extension}`))
}

export async function findDocumentById(documentId: string) {
  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1)
  if (!documents[0]) throw new Error(`Document not found: ${documentId}`)
  return documents[0]
}
