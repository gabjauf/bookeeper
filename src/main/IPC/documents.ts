import path from 'path'
import { pathToFileURL } from 'url' // used for non-darwin
import { execFile } from 'child_process'
import { promisify } from 'util'
import { IPCAction } from '../../shared/ipc-actions'
import { BOOK_PATH } from '../consts/PATH'
import { db } from '../db'
import { registerIpc } from '../IPC-wrapper'
import { documentsTable } from '../schema'
import { shell } from 'electron'
import { deleteDocumentById, findDocumentById } from '../repositories/documents'

const execFileAsync = promisify(execFile)

async function openAtPage(filePath: string, page: number): Promise<void> {
  if (process.platform === 'darwin') {
    // Preview ignores #page= URI fragments; use AppleScript to open and jump to page.
    // `open POSIX file` is synchronous in Preview's AS dictionary — document 1 is
    // immediately available after the call returns.
    const escaped = filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    // Preview's AppleScript dictionary has no page-navigation command.
    // Use System Events to click "Go to Page…" in the Go menu instead.
    const script = `
tell application "Preview"
  activate
  open POSIX file "${escaped}"
end tell
delay 0.8
tell application "System Events"
  tell process "Preview"
    try
      click menu item "Go to Page\u2026" of menu 1 of menu bar item "Go" of menu bar 1
    on error
      click menu item "Aller \u00e0 la page\u2026" of menu 1 of menu bar item "Aller" of menu bar 1
    end try
  end tell
end tell
delay 0.3
tell application "System Events"
  keystroke "a" using command down
  keystroke "${page}"
  key code 36
end tell`
    await execFileAsync('osascript', ['-e', script])
  } else {
    shell.openExternal(pathToFileURL(filePath).href + '#page=' + page)
  }
}

registerIpc(IPCAction.DOCUMENT_GETALL, async (_event, _filters) => {
  const documents = await db.select().from(documentsTable)
  return documents
})

registerIpc(IPCAction.DOCUMENT_OPEN_ORIGINAL, async (_event, documentId, page) => {
  const document = await findDocumentById(documentId)
  const filePath = path.join(BOOK_PATH, `${document.id}.${document.extension}`)
  if (page) {
    await openAtPage(filePath, page)
  } else {
    shell.openPath(filePath)
  }
})

registerIpc(IPCAction.DOCUMENT_DELETE_BY_ID, async (_event, documentId) => {
  return deleteDocumentById(documentId)
})
