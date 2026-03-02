import path from 'path'
import { IPCAction } from '../../shared/ipc-actions'
import { BOOK_PATH } from '../consts/PATH'
import { db } from '../db'
import { registerIpc } from '../IPC-wrapper'
import { documentsTable } from '../schema'
import { shell } from 'electron'
import { deleteDocumentById, findDocumentById } from '../repositories/documents'

registerIpc(IPCAction.DOCUMENT_GETALL, async (_event, _filters) => {
  const documents = await db.select().from(documentsTable)
  return documents
})

registerIpc(IPCAction.DOCUMENT_OPEN_ORIGINAL, async (_event, documentId) => {
  const document = await findDocumentById(documentId)
  shell.openPath(path.join(BOOK_PATH,`${document.id}.${document.extension}`))
})

registerIpc(IPCAction.DOCUMENT_DELETE_BY_ID, async (_event, documentId) => {
  return deleteDocumentById(documentId)
})
