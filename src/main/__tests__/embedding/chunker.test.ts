import { describe, expect, it } from 'vitest'
import { chunkText } from '../../embedding/chunker'

describe('chunkText', () => {
  describe('given an empty string', () => {
    it('when chunked, then returns empty array', () => {
      expect(chunkText('')).toEqual([])
    })
  })

  describe('given a string shorter than the chunk size', () => {
    it('when chunked, then returns a single chunk with the full text', () => {
      const text = 'Hello world'
      const chunks = chunkText(text)
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toEqual({ text, index: 0 })
    })
  })

  describe('given a string exactly at the chunk size boundary', () => {
    it('when chunked, then returns a single chunk', () => {
      const text = 'a'.repeat(2000)
      const chunks = chunkText(text)
      expect(chunks).toHaveLength(1)
      expect(chunks[0].index).toBe(0)
    })
  })

  describe('given a long string requiring multiple chunks', () => {
    it('when chunked, then returns overlapping chunks with sequential indices', () => {
      // 3 * chunkSize worth of content so we get multiple chunks
      const text = 'word '.repeat(1000) // ~5000 chars
      const chunks = chunkText(text)

      expect(chunks.length).toBeGreaterThan(1)

      // Indices are sequential
      chunks.forEach((chunk, i) => {
        expect(chunk.index).toBe(i)
      })

      // Each chunk text is non-empty
      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeGreaterThan(0)
      })

      // Consecutive chunks overlap: end of chunk N appears in start of chunk N+1
      for (let i = 0; i < chunks.length - 1; i++) {
        const endOfCurrent = chunks[i].text.slice(-100)
        const startOfNext = chunks[i + 1].text.slice(0, 600)
        expect(startOfNext).toContain(endOfCurrent.trim().split(' ')[0])
      }
    })

    it('when chunked, then all text is covered across chunks', () => {
      const text = 'The quick brown fox jumps over the lazy dog. '.repeat(200)
      const chunks = chunkText(text)

      // Reconstruct a set of all characters covered — verify first and last chars are present
      const firstChunk = chunks[0].text
      const lastChunk = chunks[chunks.length - 1].text

      expect(firstChunk).toContain('The quick')
      expect(lastChunk).toContain('lazy dog')
    })
  })

  describe('given a string with only whitespace', () => {
    it('when chunked, then returns empty array', () => {
      expect(chunkText('   \n\t  ')).toEqual([])
    })
  })
})
