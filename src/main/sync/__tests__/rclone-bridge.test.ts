import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions at hoisting time so they're available when the module loads
const { mockInitialize, mockFinalize, mockRPC, mockFreeString } = vi.hoisted(() => {
  const mockRPC = Object.assign(vi.fn(), { async: vi.fn() })
  return {
    mockInitialize: vi.fn(),
    mockFinalize: vi.fn(),
    mockRPC,
    mockFreeString: vi.fn(),
  }
})

vi.mock('koffi', () => {
  const mockFunc = vi.fn()
    .mockReturnValueOnce(mockInitialize)   // RcloneInitialize
    .mockReturnValueOnce(mockFinalize)     // RcloneFinalize
    .mockReturnValueOnce(mockRPC)          // RcloneRPC
    .mockReturnValueOnce(mockFreeString)   // RcloneFreeString

  return {
    default: {
      load: vi.fn(() => ({ func: mockFunc })),
      struct: vi.fn(),
    },
  }
})

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/mock/user-data'),
  },
}))

// Must import AFTER vi.mock declarations (vitest hoists them)
import { initialize, finalize, rpc, rpcAsync } from '../rclone-bridge'

describe('rclone-bridge', () => {
  beforeEach(() => {
    // Reset initialized state by calling finalize
    finalize()
    mockInitialize.mockClear()
    mockFinalize.mockClear()
    mockRPC.mockClear()
    mockRPC.async.mockClear()
    mockFreeString.mockClear()
  })

  describe('initialize', () => {
    describe('given rclone is not yet initialized', () => {
      it('when called, then calls RcloneInitialize', () => {
        initialize()

        expect(mockInitialize).toHaveBeenCalledOnce()
      })
    })

    describe('given rclone is already initialized', () => {
      it('when called again, then does not call RcloneInitialize twice', () => {
        initialize()
        initialize()

        expect(mockInitialize).toHaveBeenCalledOnce()
      })
    })
  })

  describe('finalize', () => {
    describe('given rclone is initialized', () => {
      it('when called, then calls RcloneFinalize', () => {
        initialize()
        finalize()

        expect(mockFinalize).toHaveBeenCalledOnce()
      })
    })
  })

  describe('rpc', () => {
    describe('given a valid RPC method', () => {
      it('when called, then returns parsed output and status', () => {
        mockRPC.mockReturnValue({
          Output: '{"version":"v1.69.2"}',
          Status: 200,
        })

        const result = rpc('core/version')

        expect(mockRPC).toHaveBeenCalledWith('core/version', '{}')
        expect(result).toEqual({
          output: { version: 'v1.69.2' },
          status: 200,
        })
      })
    })

    describe('given RPC returns an error', () => {
      it('when called, then returns error output and status', () => {
        mockRPC.mockReturnValue({
          Output: '{"error":"method not found"}',
          Status: 404,
        })

        const result = rpc('nonexistent/method')

        expect(result.status).toBe(404)
        expect(result.output).toEqual({ error: 'method not found' })
      })
    })

    describe('given RPC returns null output', () => {
      it('when called, then returns empty object', () => {
        mockRPC.mockReturnValue({
          Output: null,
          Status: 200,
        })

        const result = rpc('some/method')

        expect(result.output).toEqual({})
        expect(result.status).toBe(200)
      })
    })

    describe('given params are provided', () => {
      it('when called, then serializes params as JSON', () => {
        mockRPC.mockReturnValue({ Output: '{}', Status: 200 })

        rpc('config/create', { name: 'pcloud', type: 'pcloud' })

        expect(mockRPC).toHaveBeenCalledWith(
          'config/create',
          '{"name":"pcloud","type":"pcloud"}'
        )
      })
    })
  })

  describe('rpcAsync', () => {
    describe('given a long-running operation', () => {
      it('when called, then resolves with parsed output', async () => {
        mockRPC.async.mockImplementation(
          (_method: string, _input: string, cb: (err: null, result: any) => void) => {
            cb(null, {
              Output: '{"transferred":10}',
              Status: 200,
            })
          }
        )

        const result = await rpcAsync('sync/copy', {
          srcFs: '/local',
          dstFs: 'pcloud:remote',
        })

        expect(result).toEqual({
          output: { transferred: 10 },
          status: 200,
        })
      })
    })

    describe('given the async call fails', () => {
      it('when called, then rejects with error', async () => {
        mockRPC.async.mockImplementation(
          (_method: string, _input: string, cb: (err: Error) => void) => {
            cb(new Error('FFI call failed'))
          }
        )

        await expect(rpcAsync('sync/copy')).rejects.toThrow('FFI call failed')
      })
    })
  })
})
