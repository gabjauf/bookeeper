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

export interface CloudProvider {
  name: string
  description: string
  prefix: string
}

// Providers that support OAuth with rclone's built-in credentials
const OAUTH_PROVIDERS = [
  'pcloud',
  'drive',      // Google Drive
  'dropbox',
  'onedrive',
  'box',
  'yandex',
]

/**
 * List available cloud providers that support OAuth
 */
export function listProviders(): CloudProvider[] {
  const result = rpc('config/providers', {})
  if (result.status !== 200) return []

  const providers = (result.output as { providers?: any[] }).providers || []
  return providers
    .filter((p) => OAUTH_PROVIDERS.includes(p.Name))
    .map((p) => ({
      name: p.Name,
      description: p.Description,
      prefix: p.Prefix,
    }))
}

/**
 * Add a new remote using rclone's built-in OAuth.
 * Opens browser for authorization and blocks until complete.
 */
export async function addRemote(
  name: string,
  providerType: string
): Promise<void> {
  // Delete existing remote with same name if any
  try {
    rpc('config/delete', { name })
  } catch {
    // Ignore if doesn't exist
  }

  // Create remote with empty parameters - rclone handles OAuth automatically
  const result = await rpcAsync('config/create', {
    name,
    type: providerType,
    parameters: {},
  })

  if (result.status !== 200) {
    throw new Error(`Failed to add remote: ${JSON.stringify(result.output)}`)
  }
}

/**
 * Delete a configured remote
 */
export function deleteRemote(name: string): void {
  const result = rpc('config/delete', { name })
  if (result.status !== 200) {
    throw new Error(`Failed to delete remote: ${JSON.stringify(result.output)}`)
  }
}
