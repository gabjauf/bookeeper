import { app } from 'electron'
import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'

const CONFIG_PATH = path.join(app.getPath('userData'), 'sync-config.json')

export const DEFAULT_REMOTE_PATH = 'bookeeper'

export interface SyncConfig {
  enabledRemotes: string[] // List of rclone remote names enabled for sync
  remotePath: string // The folder on the remote (e.g., 'bookeeper')
  deviceId: string
  syncOnClose: boolean
  lastSyncTimestamp: number | null
}

/**
 * Load sync configuration from disk
 * Handles migration from old format (remoteName) to new format (enabledRemotes)
 */
export async function loadSyncConfig(): Promise<SyncConfig | null> {
  try {
    const data = await readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(data)

    // Migrate from old format if needed
    if (parsed.remoteName && !parsed.enabledRemotes) {
      parsed.enabledRemotes = [parsed.remoteName]
      delete parsed.remoteName
      // Save migrated config
      await saveSyncConfig(parsed)
    }

    // Ensure enabledRemotes is always an array
    if (!Array.isArray(parsed.enabledRemotes)) {
      parsed.enabledRemotes = []
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Save sync configuration to disk
 */
export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  // Ensure directory exists
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
}

/**
 * Create default sync config with a new device ID
 */
export function createDefaultConfig(): SyncConfig {
  return {
    enabledRemotes: [],
    remotePath: DEFAULT_REMOTE_PATH,
    deviceId: randomUUID(),
    syncOnClose: true,
    lastSyncTimestamp: null,
  }
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(config: SyncConfig): Promise<SyncConfig> {
  const updated = {
    ...config,
    lastSyncTimestamp: Date.now(),
  }
  await saveSyncConfig(updated)
  return updated
}
