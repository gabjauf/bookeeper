import path from 'path'
import { IPCAction } from '../../shared/ipc-actions'
import { BOOK_PATH } from '../consts/PATH'
import { db } from '../db'
import { registerIpc } from '../IPC-wrapper'
import { chunksTable, documentsTable } from '../schema'
import { shell } from 'electron'
import { eq } from 'drizzle-orm'
import { deleteDocumentById, findDocumentById } from '../repositories/documents'

registerIpc(IPCAction.DOCUMENT_GETALL, async (event, filters) => {
  const documents = await db.select().from(documentsTable)
  return documents
})

registerIpc(IPCAction.DOCUMENT_OPEN_ORIGINAL, async (event, documentId) => {
  const document = await findDocumentById(documentId)
  shell.openPath(path.join(BOOK_PATH,`${document.id}.${document.extension}`))
})

registerIpc(IPCAction.DOCUMENT_DELETE_BY_ID, async (event, documentId) => {
  return deleteDocumentById(documentId)
})
