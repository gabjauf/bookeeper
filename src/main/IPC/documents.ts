import path from 'path'
import { IPCAction } from '../../shared/ipc-actions'
import { BOOK_PATH } from '../consts/PATH'
import { db } from '../db'
import { registerIpc } from '../IPC-wrapper'
import { documentsTable } from '../schema'
import { shell } from 'electron'
import { eq } from 'drizzle-orm'

registerIpc(IPCAction.DOCUMENT_GETALL, async (event, filters) => {
  const documents = await db.select().from(documentsTable)
  return documents
})

registerIpc(IPCAction.DOCUMENT_OPEN_ORIGINAL, async (event, documentId) => {
  const document = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1)
  shell.openPath(path.join(BOOK_PATH,`${document[0].id}.${document[0].extension}`))
})
