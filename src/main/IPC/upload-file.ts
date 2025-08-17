import { app } from 'electron'
import fs from 'fs/promises'
import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import path from 'path';

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

const BOOK_PATH = path.join(app.getPath('userData'), 'books')

registerIpc(IPCAction.FILE_UPLOAD, async (event, fileData) => {

  await ensureDir(BOOK_PATH)
  const filename = `${fileData[0].name}`

  await fs.writeFile(path.join(BOOK_PATH, filename), fileData[0].data)
  return true
})
