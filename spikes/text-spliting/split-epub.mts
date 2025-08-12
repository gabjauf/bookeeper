import EPub from 'epub'
import TurndownService from 'turndown'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { writeFile } from 'node:fs/promises'

/**
 * Loads and parses an EPUB file into chapter HTML strings.
 */
export async function loadEpubChapters(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath)
    const chapters: string[] = []

    epub.on('error', reject)

    epub.on('end', async () => {
      epub
      for (const id of epub.flow.map((ch) => ch.id)) {
        await new Promise<void>((res, rej) => {
          epub.getChapter(id, (err, html) => {
            if (err) return rej(err)
            chapters.push(html)
            res()
          })
        })
      }
      resolve(chapters)
    })

    epub.parse()
  })
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
export async function epubToMarkdownChunks(filePath: string): Promise<string[]> {
  const chaptersHtml = await loadEpubChapters(filePath)
  const markdown = convertChaptersToMarkdown(chaptersHtml)
  await writeFile('./text.html', chaptersHtml.join('\n'))
  await writeFile('./text.md', markdown)
  return splitMarkdown(markdown)
}

// Example usage
const chunks = await epubToMarkdownChunks(
  '../../data/Thinking, Fast and Slow -- Daniel Kahneman -- ( WeLib.org ).epub'
)
