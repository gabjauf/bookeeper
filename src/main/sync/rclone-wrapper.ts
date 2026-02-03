import rclone from 'rclone.js'

export interface RcloneResult {
  exitCode: number
  stdout?: string
  stderr?: string
}

/**
 * Check if rclone is available
 */
export async function isRcloneAvailable(): Promise<boolean> {
  try {
    await rclone.promises('version')
    return true
  } catch {
    return false
  }
}

/**
 * Configure pCloud remote in rclone
 * @param token - pCloud OAuth access token
 * @param hostname - pCloud API hostname (default: eapi.pcloud.com for EU)
 */
export async function configurePcloud(
  token: string,
  hostname = 'eapi.pcloud.com'
): Promise<void> {
  await rclone.promises('config', 'create', 'pcloud', 'pcloud', {
    token: JSON.stringify({
      access_token: token,
      token_type: 'bearer',
      expiry: '0001-01-01T00:00:00Z',
    }),
    hostname,
  })
}

/**
 * Bidirectional sync between local path and pCloud remote
 * Uses last-write-wins conflict resolution
 */
export async function bisync(
  source: string,
  dest: string
): Promise<RcloneResult> {
  return rclone.promises('bisync', source, dest, {
    '--conflict-resolve': 'newer',
    '--conflict-loser': 'pathname',
  })
}

/**
 * One-way sync from local to pCloud
 */
export async function syncUp(
  localPath: string,
  remotePath: string
): Promise<RcloneResult> {
  return rclone.promises('sync', localPath, `pcloud:${remotePath}`)
}

/**
 * One-way sync from pCloud to local
 */
export async function syncDown(
  remotePath: string,
  localPath: string
): Promise<RcloneResult> {
  return rclone.promises('sync', `pcloud:${remotePath}`, localPath)
}
