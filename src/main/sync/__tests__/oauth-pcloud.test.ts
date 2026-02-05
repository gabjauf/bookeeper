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

import { startPCloudAuth } from '../oauth-pcloud'

describe('oauth-pcloud', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startPCloudAuth', () => {
    describe('given rclone OAuth flow completes successfully', () => {
      it('when called, then deletes existing remote and creates new one with empty parameters', async () => {
        mockRpc.mockReturnValue({ output: {}, status: 200 })
        mockRpcAsync.mockResolvedValue({ output: {}, status: 200 })

        await startPCloudAuth()

        expect(mockRpc).toHaveBeenCalledWith('config/delete', { name: 'pcloud' })
        expect(mockRpcAsync).toHaveBeenCalledWith('config/create', {
          name: 'pcloud',
          type: 'pcloud',
          parameters: {},
        })
      })
    })

    describe('given config/create fails', () => {
      it('when called, then throws error', async () => {
        mockRpc.mockReturnValue({ output: {}, status: 200 })
        mockRpcAsync.mockResolvedValue({
          output: { error: 'OAuth failed' },
          status: 500,
        })

        await expect(startPCloudAuth()).rejects.toThrow('Failed to configure pCloud')
      })
    })

    describe('given config/delete fails for non-existent remote', () => {
      it('when called, then continues with config/create anyway', async () => {
        mockRpc.mockImplementation(() => {
          throw new Error('remote not found')
        })
        mockRpcAsync.mockResolvedValue({ output: {}, status: 200 })

        await startPCloudAuth()

        expect(mockRpcAsync).toHaveBeenCalledWith('config/create', {
          name: 'pcloud',
          type: 'pcloud',
          parameters: {},
        })
      })
    })
  })
})
