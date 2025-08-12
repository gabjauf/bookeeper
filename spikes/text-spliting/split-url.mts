import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

/**
 * Loads and extracts main readable HTML from a URL.
 */
export async function loadUrlContent(url: string): Promise<string> {
  const html = await fetch(url).then((r) => r.text())
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  return reader.parse()?.content || ''
}

/**
 * Converts HTML to Markdown.
 */
export function convertHtmlToMarkdown(html: string): string {
  const turndown = new TurndownService()
  return turndown.turndown(html)
}

/**
 * Splits Markdown into smaller chunks.
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
 * High-level URL → Markdown chunks pipeline.
 */
export async function urlToMarkdownChunks(url: string): Promise<string[]> {
  const html = await loadUrlContent(url)
  const markdown = convertHtmlToMarkdown(html)
  return splitMarkdown(markdown)
}

// -----------------
// Example usage
// -----------------
const urlChunks = await urlToMarkdownChunks('https://www.wheresyoured.at/ai-is-a-money-trap/')
console.log(urlChunks)
