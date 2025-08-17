import { app } from 'electron'
import fs from 'fs/promises'
import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import path from 'path'
import { db } from '../db'
import { documentsTable } from '../schema'

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

const BOOK_PATH = path.join(app.getPath('userData'), 'books')

registerIpc(IPCAction.FILE_UPLOAD, async (event, fileData) => {
  await ensureDir(BOOK_PATH)
  const file = fileData[0]
  const filename = `${file.name}`

  await fs.writeFile(path.join(BOOK_PATH, filename), file.data)
  const data = await db.insert(documentsTable).values({
    title: file.name
  })
  return data
})
