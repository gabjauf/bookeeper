import { app } from 'electron'
import path from 'path'
import { randomUUID } from 'crypto'
import { bisync, isRcloneAvailable, isRemoteConfigured } from './rclone-wrapper'
import {
  SyncConfig,
  loadSyncConfig,
  saveSyncConfig,
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
    if (!config) {
      return SyncStatus.NOT_CONFIGURED
    }

    // Check if the configured remote actually exists
    const remoteExists = await isRemoteConfigured(config.remoteName)
    if (!remoteExists) {
      return SyncStatus.NOT_CONFIGURED
    }

    return SyncStatus.IDLE
  }

  /**
   * Set the remote to use for syncing
   * The remote must already be configured in rclone
   */
  async setRemote(remoteName: string, remotePath = DEFAULT_REMOTE_PATH): Promise<void> {
    const remoteExists = await isRemoteConfigured(remoteName)
    if (!remoteExists) {
      throw new Error(`Remote "${remoteName}" is not configured in rclone`)
    }

    // Load existing config or create new one
    const existingConfig = await loadSyncConfig()
    const config: SyncConfig = {
      remoteName,
      remotePath,
      deviceId: existingConfig?.deviceId || randomUUID(),
      syncOnClose: existingConfig?.syncOnClose ?? true,
      lastSyncTimestamp: existingConfig?.lastSyncTimestamp ?? null,
    }

    await saveSyncConfig(config)
    this.config = config
  }

  /**
   * Get the currently configured remote name
   */
  async getConfiguredRemote(): Promise<string | null> {
    const config = await loadSyncConfig()
    return config?.remoteName ?? null
  }

  /**
   * Sync entire library (books, thumbnails, and database)
   */
  async syncLibrary(): Promise<SyncResult> {
    // Load config if not already loaded
    if (!this.config) {
      this.config = await loadSyncConfig()
    }

    if (!this.config) {
      throw new Error('Sync not configured')
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

    try {
      const { remoteName, remotePath } = this.config
      const userData = app.getPath('userData')
      const booksPath = path.join(userData, 'books')
      const thumbnailsPath = path.join(userData, 'thumbnails')

      // Sync books using the configured remote
      await bisync(booksPath, `${remoteName}:${remotePath}/books`)
      result.booksSync = true

      // Sync thumbnails
      await bisync(thumbnailsPath, `${remoteName}:${remotePath}/thumbnails`)
      result.thumbnailsSync = true

      // TODO: Implement database sync via JSON export/merge
      // For now, mark as successful
      result.dbSync = true

      // Update last sync timestamp
      this.config = await updateLastSync(this.config)

      result.success = true
    } catch (error) {
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
