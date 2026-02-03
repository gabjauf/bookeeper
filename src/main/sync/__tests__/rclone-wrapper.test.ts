import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to ensure mockPromises is available before vi.mock is hoisted
const { mockPromises } = vi.hoisted(() => ({
  mockPromises: vi.fn(),
}))

vi.mock('rclone.js', () => ({
  default: {
    promises: mockPromises,
  },
}))

import {
  configurePcloud,
  bisync,
  syncUp,
  syncDown,
  isRcloneAvailable,
} from '../rclone-wrapper'

describe('rclone-wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isRcloneAvailable', () => {
    describe('given rclone is installed', () => {
      it('when checking availability, then returns true', async () => {
        mockPromises.mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'rclone v1.68.0',
        })

        const result = await isRcloneAvailable()

        expect(result).toBe(true)
        expect(mockPromises).toHaveBeenCalledWith('version')
      })
    })

    describe('given rclone is not installed', () => {
      it('when checking availability, then returns false', async () => {
        mockPromises.mockRejectedValueOnce(new Error('ENOENT'))

        const result = await isRcloneAvailable()

        expect(result).toBe(false)
      })
    })
  })

  describe('configurePcloud', () => {
    describe('given valid pCloud token', () => {
      it('when configuring, then creates pcloud remote with correct params', async () => {
        mockPromises.mockResolvedValueOnce({ exitCode: 0 })

        await configurePcloud('test-access-token')

        expect(mockPromises).toHaveBeenCalledWith(
          'config',
          'create',
          'pcloud',
          'pcloud',
          expect.objectContaining({
            token: expect.stringContaining('test-access-token'),
            hostname: 'eapi.pcloud.com',
          })
        )
      })
    })

    describe('given custom hostname', () => {
      it('when configuring, then uses custom hostname', async () => {
        mockPromises.mockResolvedValueOnce({ exitCode: 0 })

        await configurePcloud('test-token', 'api.pcloud.com')

        expect(mockPromises).toHaveBeenCalledWith(
          'config',
          'create',
          'pcloud',
          'pcloud',
          expect.objectContaining({
            hostname: 'api.pcloud.com',
          })
        )
      })
    })
  })

  describe('bisync', () => {
    describe('given source and destination paths', () => {
      it('when calling bisync, then executes with correct flags', async () => {
        mockPromises.mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'Bisync completed',
        })

        const result = await bisync('/local/path', 'pcloud:remote/path')

        expect(mockPromises).toHaveBeenCalledWith(
          'bisync',
          '/local/path',
          'pcloud:remote/path',
          expect.objectContaining({
            '--conflict-resolve': 'newer',
            '--conflict-loser': 'pathname',
          })
        )
        expect(result).toEqual({
          exitCode: 0,
          stdout: 'Bisync completed',
        })
      })
    })
  })

  describe('syncUp', () => {
    describe('given local and remote paths', () => {
      it('when syncing up, then syncs from local to pcloud remote', async () => {
        mockPromises.mockResolvedValueOnce({ exitCode: 0 })

        await syncUp('/local/books', 'bookeeper/books')

        expect(mockPromises).toHaveBeenCalledWith(
          'sync',
          '/local/books',
          'pcloud:bookeeper/books'
        )
      })
    })
  })

  describe('syncDown', () => {
    describe('given remote and local paths', () => {
      it('when syncing down, then syncs from pcloud remote to local', async () => {
        mockPromises.mockResolvedValueOnce({ exitCode: 0 })

        await syncDown('bookeeper/books', '/local/books')

        expect(mockPromises).toHaveBeenCalledWith(
          'sync',
          'pcloud:bookeeper/books',
          '/local/books'
        )
      })
    })
  })
})
