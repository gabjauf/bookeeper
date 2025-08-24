import fs from 'fs/promises'
import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import path from 'path'
import { db } from '../db'
import { documentsTable } from '../schema'
import { PDFDocument } from 'mupdf'
import { BOOK_PATH, THUMBNAIL_PATH } from '../consts/PATH'

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function loadPDF(data: Buffer | ArrayBuffer | Uint8Array) {
  const mupdf = await import('mupdf')
  return new mupdf.PDFDocument(data)
}

export async function drawPageAsSVG(
  document: PDFDocument,
  pageNumber: number
): Promise<string> {
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

registerIpc(IPCAction.FILE_UPLOAD, async (event, fileData) => {
  await ensureDir(BOOK_PATH)
  await ensureDir(THUMBNAIL_PATH)
  const file = fileData[0]
  const extension = file.name.split('.').pop();
  const data = await db.insert(documentsTable).values({
    title: file.name
  }).returning()
  const filename = `${data[0].id}`
  if (file.name.endsWith('.pdf')) {
    const pdf = await loadPDF(file.data)
    const svg = await drawPageAsSVG(pdf, 0)
    await fs.writeFile(path.join(THUMBNAIL_PATH, `${filename}.svg`), svg)
  }

  await fs.writeFile(path.join(BOOK_PATH, `${filename}.${extension}`), file.data)
  return data
})
