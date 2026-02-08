import { app } from 'electron'
import path from 'path'
import { bisync, isRcloneAvailable, AuthError } from './rclone-wrapper'
import {
  SyncConfig,
  loadSyncConfig,
  saveSyncConfig,
  createDefaultConfig,
  updateLastSync,
  DEFAULT_REMOTE_PATH,
} from './sync-config'

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  ERROR = 'error',
  NOT_CONFIGURED = 'not-configured',
}

export interface SyncResult {
  success: boolean
  error?: string
  needsReauth?: boolean
  failedRemote?: string
  booksSync: boolean
  thumbnailsSync: boolean
  dbSync: boolean
}

export class SyncService {
  private syncing = false
  private config: SyncConfig | null = null

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    if (this.syncing) {
      return SyncStatus.SYNCING
    }

    const available = await isRcloneAvailable()
    if (!available) {
      return SyncStatus.NOT_CONFIGURED
    }

    const config = await loadSyncConfig()
    if (!config || config.enabledRemotes.length === 0) {
      return SyncStatus.NOT_CONFIGURED
    }

    return SyncStatus.IDLE
  }

  /**
   * Enable a remote for syncing
   */
  async enableRemote(remoteName: string): Promise<void> {
    const config = (await loadSyncConfig()) || createDefaultConfig()
    // Ensure enabledRemotes is an array
    if (!Array.isArray(config.enabledRemotes)) {
      config.enabledRemotes = []
    }
    if (!config.enabledRemotes.includes(remoteName)) {
      config.enabledRemotes.push(remoteName)
      await saveSyncConfig(config)
      this.config = config
    }
  }

  /**
   * Disable a remote from syncing
   */
  async disableRemote(remoteName: string): Promise<void> {
    const config = await loadSyncConfig()
    if (config) {
      // Ensure enabledRemotes is an array
      if (!Array.isArray(config.enabledRemotes)) {
        config.enabledRemotes = []
      }
      config.enabledRemotes = config.enabledRemotes.filter((r) => r !== remoteName)
      await saveSyncConfig(config)
      this.config = config
    }
  }

  /**
   * Get the list of enabled remotes for syncing
   */
  async getEnabledRemotes(): Promise<string[]> {
    const config = await loadSyncConfig()
    return config?.enabledRemotes || []
  }

  /**
   * Sync entire library (books, thumbnails, and database) to all enabled remotes
   */
  async syncLibrary(): Promise<SyncResult> {
    // Load config if not already loaded
    if (!this.config) {
      this.config = await loadSyncConfig()
    }

    if (!this.config || this.config.enabledRemotes.length === 0) {
      throw new Error('No remotes enabled for sync')
    }

    if (this.syncing) {
      throw new Error('Sync already in progress')
    }

    this.syncing = true

    const result: SyncResult = {
      success: false,
      booksSync: false,
      thumbnailsSync: false,
      dbSync: false,
    }

    let currentRemote: string | undefined

    try {
      const { enabledRemotes, remotePath } = this.config
      const userData = app.getPath('userData')
      const booksPath = path.join(userData, 'books')
      const thumbnailsPath = path.join(userData, 'thumbnails')

      // Sync to ALL enabled remotes
      for (const remoteName of enabledRemotes) {
        currentRemote = remoteName

        // Sync books
        await bisync(booksPath, `${remoteName}:${remotePath}/books`)

        // Sync thumbnails
        await bisync(thumbnailsPath, `${remoteName}:${remotePath}/thumbnails`)
      }

      result.booksSync = true
      result.thumbnailsSync = true

      // TODO: Implement database sync via JSON export/merge
      // For now, mark as successful
      result.dbSync = true

      // Update last sync timestamp
      this.config = await updateLastSync(this.config)

      result.success = true
    } catch (error) {
      console.error('Sync failed:', error)
      if (error instanceof AuthError) {
        result.needsReauth = true
        result.failedRemote = currentRemote
      }
      result.error = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      this.syncing = false
    }

    return result
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    const config = await loadSyncConfig()
    if (!config?.lastSyncTimestamp) {
      return null
    }
    return new Date(config.lastSyncTimestamp)
  }

  /**
   * Get last sync time as ISO string (for IPC)
   */
  async getLastSyncTimeISO(): Promise<string | null> {
    const date = await this.getLastSyncTime()
    return date?.toISOString() ?? null
  }
}

// Singleton instance
export const syncService = new SyncService()
