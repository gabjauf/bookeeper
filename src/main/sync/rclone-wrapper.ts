import { rpc, rpcAsync } from './rclone-bridge'

export interface RcloneResult {
  exitCode: number
  stdout?: string
  stderr?: string
}

/**
 * Check if rclone (librclone) is available
 */
export async function isRcloneAvailable(): Promise<boolean> {
  try {
    const result = rpc('core/version', {})
    return result.status === 200
  } catch {
    return false
  }
}

/**
 * Configure pCloud remote in rclone
 * @param tokenJson - Full token JSON string from OAuth
 */
export async function configurePcloud(tokenJson: string): Promise<void> {
  const result = rpc('config/create', {
    name: 'pcloud',
    type: 'pcloud',
    parameters: { token: tokenJson },
  })
  if (result.status !== 200) {
    throw new Error(`Failed to configure pCloud: ${JSON.stringify(result.output)}`)
  }
}

/**
 * List all configured remotes in rclone
 */
export async function listConfiguredRemotes(): Promise<string[]> {
  const result = rpc('config/listremotes', {})
  if (result.status !== 200) return []
  return (result.output as { remotes?: string[] }).remotes || []
}

/**
 * Check if a specific remote is configured
 */
export async function isRemoteConfigured(remoteName: string): Promise<boolean> {
  const remotes = await listConfiguredRemotes()
  return remotes.includes(remoteName)
}

/**
 * One-way sync from local to pCloud
 */
export async function syncUp(
  localPath: string,
  remotePath: string
): Promise<void> {
  const result = await rpcAsync('sync/copy', {
    srcFs: localPath,
    dstFs: `pcloud:${remotePath}`,
  })
  if (result.status !== 200) {
    throw new Error(`Sync failed: ${JSON.stringify(result.output)}`)
  }
}

/**
 * One-way sync from pCloud to local
 */
export async function syncDown(
  remotePath: string,
  localPath: string
): Promise<void> {
  const result = await rpcAsync('sync/copy', {
    srcFs: `pcloud:${remotePath}`,
    dstFs: localPath,
  })
  if (result.status !== 200) {
    throw new Error(`Sync failed: ${JSON.stringify(result.output)}`)
  }
}

/**
 * Bidirectional sync between local path and remote
 */
export async function bisync(
  source: string,
  dest: string
): Promise<void> {
  const result = await rpcAsync('sync/bisync', {
    path1: source,
    path2: dest,
    resolvPolicy: 'newer',
  })
  if (result.status !== 200) {
    throw new Error(`Bisync failed: ${JSON.stringify(result.output)}`)
  }
}

/**
 * Get the type of a configured remote (e.g., 'pcloud', 'drive', 'dropbox')
 */
export async function getRemoteType(remoteName: string): Promise<string | null> {
  try {
    const result = rpc('config/get', { name: remoteName })
    if (result.status !== 200) return null
    return (result.output as { type?: string }).type || null
  } catch {
    return null
  }
}
