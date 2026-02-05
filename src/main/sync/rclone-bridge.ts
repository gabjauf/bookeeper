import koffi from 'koffi'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

// Define the result struct matching librclone.h
koffi.struct('RcloneRPCResult', {
  Output: 'str',
  Status: 'int',
})

// Resolve the path to the shared library based on platform
function getLibPath(): string {
  const platform = process.platform
  const ext = platform === 'win32' ? 'dll' : platform === 'darwin' ? 'dylib' : 'so'
  const libName = `librclone.${ext}`

  // In packaged app, use resourcesPath
  if (app?.isPackaged) {
    return path.join(process.resourcesPath, libName)
  }

  // In dev/test, find the native/ directory by traversing up from __dirname
  // Works whether running from out/main/ or src/main/sync/
  let dir = __dirname
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'native', libName)
    if (fs.existsSync(candidate)) {
      return candidate
    }
    dir = path.dirname(dir)
  }

  // Fallback to relative path from out/main/
  return path.join(__dirname, '..', '..', 'native', libName)
}

const lib = koffi.load(getLibPath())

// Bind C functions from librclone
const _initialize = lib.func('void RcloneInitialize()')
const _finalize = lib.func('void RcloneFinalize()')
const _rpc = lib.func('RcloneRPCResult RcloneRPC(char* method, char* input)')
const _freeString = lib.func('void RcloneFreeString(char* str)')

let initialized = false

/**
 * Initialize rclone library. Safe to call multiple times.
 */
export function initialize(): void {
  if (!initialized) {
    _initialize()
    initialized = true
  }
}

/**
 * Finalize rclone library and free resources.
 */
export function finalize(): void {
  if (initialized) {
    _finalize()
    initialized = false
  }
}

export interface RPCResult {
  output: Record<string, unknown>
  status: number
}

/**
 * Synchronous RPC call to rclone.
 * Use for quick operations (config, version, listremotes).
 */
export function rpc(method: string, params: Record<string, unknown> = {}): RPCResult {
  if (!initialized) initialize()

  const result = _rpc(method, JSON.stringify(params))
  const output = result.Output ? JSON.parse(result.Output) : {}
  const status = result.Status

  return { output, status }
}

/**
 * Async RPC call to rclone.
 * Use for long-running operations (sync, copy) to avoid blocking the main thread.
 */
export async function rpcAsync(
  method: string,
  params: Record<string, unknown> = {}
): Promise<RPCResult> {
  if (!initialized) initialize()

  return new Promise((resolve, reject) => {
    _rpc.async(method, JSON.stringify(params), (err: Error | null, result: any) => {
      if (err) return reject(err)
      const output = result.Output ? JSON.parse(result.Output) : {}
      resolve({ output, status: result.Status })
    })
  })
}
