import EPub from 'epub'
import TurndownService from 'turndown'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { writeFile, readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import mupdf from 'mupdf'
import { groupIntoStyledBlocks, StyledBlock } from './block-marker.mts'

/**
 * Loads and parses an EPUB file into chapter HTML strings.
 */
export async function loadPdf(filePath: string) {
  const file = await readFile(filePath)
  const document = mupdf.PDFDocument.openDocument(file, 'application/pdf')
  let i = 0
  const pages: StyledBlock[][] = []
  while (i < document.countPages()) {
    const page = document.loadPage(i)
    const json = page.toStructuredText('preserve-whitespace').asJSON()
    console.log(`json=${json}`)
    pages.push(groupIntoStyledBlocks(JSON.parse(json).blocks))
    i++
  }
  return pages
}

/**
 * Converts an array of HTML strings to Markdown strings.
 */
export function convertChaptersToMarkdown(chapters: string[]): string {
  const turndown = new TurndownService({
    headingStyle: 'atx'
  })
  return chapters.map((html) => turndown.turndown(html)).join('\n\n')
}

/**
 * Splits Markdown text into smaller overlapping chunks.
 */
export async function splitMarkdown(
  markdown: string,
  chunkSize = 1000,
  chunkOverlap = 200
): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap })
  return splitter.splitText(markdown)
}

/**
 * High-level EPUB → Markdown chunks pipeline.
 */
export async function pdfToMarkdownChunks(filePath: string) {
  const chaptersHtml = await loadPdf(filePath)
  // const markdown = convertChaptersToMarkdown(chaptersHtml)
  // await writeFile('./pdf.html', chaptersHtml.join('\n'))
  // await writeFile('./pdf.md', markdown)
  await writeFile('./pdf.json', JSON.stringify(chaptersHtml, null, 2))
  // return splitMarkdown(markdown)
}

// Example usage
const chunks = await pdfToMarkdownChunks(
  '../../data/Boundaries Updated and Expanded Edition- When to Say Yes, -- Dr. Henry Cloud, Dr. John Townsend -- ( WeLib.org ).pdf'
)
