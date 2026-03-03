import fs from 'fs/promises'
import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import path from 'path'
import { db } from '../db'
import { documentsTable } from '../schema'
import { PDFDocument } from 'mupdf'
import { BOOK_PATH, THUMBNAIL_PATH } from '../consts/PATH'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { enqueueIndex } from '../embedding/indexer'

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function loadPDF(data: Buffer | ArrayBuffer | Uint8Array) {
  const mupdf = await import('mupdf')
  return new mupdf.PDFDocument(data)
}

export async function drawPageAsSVG(document: PDFDocument, pageNumber: number): Promise<string> {
  const mupdf = await import('mupdf')
  const page = document.loadPage(pageNumber)
  const buffer = new mupdf.Buffer()
  const writer = new mupdf.DocumentWriter(buffer, 'svg', '')
  const device = writer.beginPage(page.getBounds())
  page.run(device, mupdf.Matrix.identity)
  device.close()
  writer.endPage()
  return buffer.asString()
}

registerIpc(IPCAction.FILE_UPLOAD, async (_event, fileData) => {
  await ensureDir(BOOK_PATH)
  await ensureDir(THUMBNAIL_PATH)
  const results: Record<string, unknown>[] = []
  for (const file of fileData) {
    const doc = await uploadOne(file)
    if (doc) results.push(doc)
  }
  return results
})

async function uploadOne(file: { name: string; data: Uint8Array }) {
  const extension = file.name.split('.').pop() ?? ''
  const hash = crypto.createHash('sha256').update(file.data).digest('hex')
  if (await hasDuplicate(hash)) return null

  const now = new Date().toISOString()
  const [doc] = await db
    .insert(documentsTable)
    .values({ title: file.name, extension, sha: hash, createdAt: now, updatedAt: now })
    .returning()

  const filename = `${doc.id}`

  if (file.name.endsWith('.pdf')) {
    const pdf = await loadPDF(file.data)
    const svg = await drawPageAsSVG(pdf, 0)
    await fs.writeFile(path.join(THUMBNAIL_PATH, `${filename}.svg`), svg)
  }

  const filePath = path.join(BOOK_PATH, `${filename}.${extension}`)
  await fs.writeFile(filePath, file.data)

  enqueueIndex(doc.id, filePath, doc.title)

  return doc
}

async function hasDuplicate(hash: string) {
  const duplicates = await db.select().from(documentsTable).where(eq(documentsTable.sha, hash))
  return duplicates.length > 0
}
