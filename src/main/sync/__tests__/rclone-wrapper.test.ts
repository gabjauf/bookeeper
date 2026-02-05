import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockRpcAsync } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockRpcAsync: vi.fn(),
}))

vi.mock('../rclone-bridge', () => ({
  rpc: mockRpc,
  rpcAsync: mockRpcAsync,
  initialize: vi.fn(),
  finalize: vi.fn(),
}))

import {
  configurePcloud,
  bisync,
  syncUp,
  syncDown,
  isRcloneAvailable,
  listConfiguredRemotes,
  isRemoteConfigured,
} from '../rclone-wrapper'

describe('rclone-wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isRcloneAvailable', () => {
    describe('given librclone responds to core/version', () => {
      it('when checking availability, then returns true', async () => {
        mockRpc.mockReturnValue({
          output: { version: 'v1.69.2' },
          status: 200,
        })

        const result = await isRcloneAvailable()

        expect(result).toBe(true)
        expect(mockRpc).toHaveBeenCalledWith('core/version', {})
      })
    })

    describe('given librclone throws', () => {
      it('when checking availability, then returns false', async () => {
        mockRpc.mockImplementation(() => {
          throw new Error('Library not loaded')
        })

        const result = await isRcloneAvailable()

        expect(result).toBe(false)
      })
    })
  })

  describe('configurePcloud', () => {
    describe('given token JSON and successful config', () => {
      it('when configuring, then calls config/create with token', async () => {
        mockRpc.mockReturnValue({ output: {}, status: 200 })
        const tokenJson = '{"access_token":"abc123","token_type":"bearer"}'

        await configurePcloud(tokenJson)

        expect(mockRpc).toHaveBeenCalledWith('config/create', {
          name: 'pcloud',
          type: 'pcloud',
          parameters: { token: tokenJson },
        })
      })
    })

    describe('given config/create fails', () => {
      it('when configuring, then throws error', async () => {
        mockRpc.mockReturnValue({
          output: { error: 'invalid token' },
          status: 400,
        })

        await expect(configurePcloud('bad-token')).rejects.toThrow(
          'Failed to configure pCloud'
        )
      })
    })
  })

  describe('listConfiguredRemotes', () => {
    describe('given remotes are configured', () => {
      it('when listing, then returns remote names', async () => {
        mockRpc.mockReturnValue({
          output: { remotes: ['pcloud', 'gdrive'] },
          status: 200,
        })

        const result = await listConfiguredRemotes()

        expect(result).toEqual(['pcloud', 'gdrive'])
        expect(mockRpc).toHaveBeenCalledWith('config/listremotes', {})
      })
    })

    describe('given no remotes configured', () => {
      it('when listing, then returns empty array', async () => {
        mockRpc.mockReturnValue({
          output: { remotes: [] },
          status: 200,
        })

        const result = await listConfiguredRemotes()

        expect(result).toEqual([])
      })
    })

    describe('given RPC fails', () => {
      it('when listing, then returns empty array', async () => {
        mockRpc.mockReturnValue({ output: {}, status: 500 })

        const result = await listConfiguredRemotes()

        expect(result).toEqual([])
      })
    })
  })

  describe('isRemoteConfigured', () => {
    describe('given remote exists', () => {
      it('when checking, then returns true', async () => {
        mockRpc.mockReturnValue({
          output: { remotes: ['pcloud'] },
          status: 200,
        })

        const result = await isRemoteConfigured('pcloud')

        expect(result).toBe(true)
      })
    })

    describe('given remote does not exist', () => {
      it('when checking, then returns false', async () => {
        mockRpc.mockReturnValue({
          output: { remotes: ['gdrive'] },
          status: 200,
        })

        const result = await isRemoteConfigured('pcloud')

        expect(result).toBe(false)
      })
    })
  })

  describe('syncUp', () => {
    describe('given local and remote paths', () => {
      it('when syncing up, then calls sync/copy RPC', async () => {
        mockRpcAsync.mockResolvedValue({ output: {}, status: 200 })

        await syncUp('/local/books', 'bookeeper/books')

        expect(mockRpcAsync).toHaveBeenCalledWith('sync/copy', {
          srcFs: '/local/books',
          dstFs: 'pcloud:bookeeper/books',
        })
      })
    })

    describe('given sync fails', () => {
      it('when syncing up, then throws error', async () => {
        mockRpcAsync.mockResolvedValue({
          output: { error: 'connection refused' },
          status: 500,
        })

        await expect(syncUp('/local', 'remote')).rejects.toThrow('Sync failed')
      })
    })
  })

  describe('syncDown', () => {
    describe('given remote and local paths', () => {
      it('when syncing down, then calls sync/copy RPC', async () => {
        mockRpcAsync.mockResolvedValue({ output: {}, status: 200 })

        await syncDown('bookeeper/books', '/local/books')

        expect(mockRpcAsync).toHaveBeenCalledWith('sync/copy', {
          srcFs: 'pcloud:bookeeper/books',
          dstFs: '/local/books',
        })
      })
    })
  })

  describe('bisync', () => {
    describe('given source and destination paths', () => {
      it('when calling bisync, then calls sync/bisync RPC', async () => {
        mockRpcAsync.mockResolvedValue({ output: {}, status: 200 })

        await bisync('/local/path', 'pcloud:remote/path')

        expect(mockRpcAsync).toHaveBeenCalledWith('sync/bisync', {
          path1: '/local/path',
          path2: 'pcloud:remote/path',
          resolvPolicy: 'newer',
        })
      })
    })

    describe('given bisync fails', () => {
      it('when calling bisync, then throws error', async () => {
        mockRpcAsync.mockResolvedValue({
          output: { error: 'conflict' },
          status: 500,
        })

        await expect(bisync('/a', '/b')).rejects.toThrow('Bisync failed')
      })
    })
  })
})
