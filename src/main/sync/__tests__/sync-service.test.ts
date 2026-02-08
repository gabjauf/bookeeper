import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData'),
  },
}))

// Mock rclone-wrapper
vi.mock('../rclone-wrapper', () => ({
  isRcloneAvailable: vi.fn(),
  isRemoteConfigured: vi.fn(),
  configurePcloud: vi.fn(),
  bisync: vi.fn(),
  syncUp: vi.fn(),
  syncDown: vi.fn(),
  AuthError: class AuthError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AuthError'
    }
  },
}))

// Mock sync-config
vi.mock('../sync-config', () => ({
  loadSyncConfig: vi.fn(),
  saveSyncConfig: vi.fn(),
  updateLastSync: vi.fn(),
  createDefaultConfig: vi.fn().mockReturnValue({
    enabledRemotes: [],
    remotePath: 'bookeeper',
    deviceId: 'test-device',
    syncOnClose: true,
    lastSyncTimestamp: null,
  }),
  DEFAULT_REMOTE_PATH: 'bookeeper',
}))

import { SyncService, SyncStatus } from '../sync-service'
import * as rcloneWrapper from '../rclone-wrapper'
import * as syncConfig from '../sync-config'

describe('SyncService', () => {
  let service: SyncService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new SyncService()
  })

  describe('getStatus', () => {
    describe('given rclone is not available', () => {
      it('when getting status, then returns not-configured', async () => {
        vi.mocked(rcloneWrapper.isRcloneAvailable).mockResolvedValue(false)

        const status = await service.getStatus()

        expect(status).toBe(SyncStatus.NOT_CONFIGURED)
      })
    })

    describe('given rclone is available but no config', () => {
      it('when getting status, then returns not-configured', async () => {
        vi.mocked(rcloneWrapper.isRcloneAvailable).mockResolvedValue(true)
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue(null)

        const status = await service.getStatus()

        expect(status).toBe(SyncStatus.NOT_CONFIGURED)
      })
    })

    describe('given rclone and config are available but no enabled remotes', () => {
      it('when getting status, then returns not-configured', async () => {
        vi.mocked(rcloneWrapper.isRcloneAvailable).mockResolvedValue(true)
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: [],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })

        const status = await service.getStatus()

        expect(status).toBe(SyncStatus.NOT_CONFIGURED)
      })
    })

    describe('given rclone, config, and enabled remotes are all available', () => {
      it('when getting status, then returns idle', async () => {
        vi.mocked(rcloneWrapper.isRcloneAvailable).mockResolvedValue(true)
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })

        const status = await service.getStatus()

        expect(status).toBe(SyncStatus.IDLE)
      })
    })
  })

  describe('enableRemote', () => {
    describe('given no existing config', () => {
      it('when enabling remote, then creates new config with remote', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue(null)
        vi.mocked(syncConfig.saveSyncConfig).mockResolvedValue(undefined)

        await service.enableRemote('pcloud')

        expect(syncConfig.saveSyncConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            enabledRemotes: ['pcloud'],
          })
        )
      })
    })

    describe('given existing config without the remote', () => {
      it('when enabling remote, then adds remote to list', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['drive'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        vi.mocked(syncConfig.saveSyncConfig).mockResolvedValue(undefined)

        await service.enableRemote('pcloud')

        expect(syncConfig.saveSyncConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            enabledRemotes: ['drive', 'pcloud'],
          })
        )
      })
    })

    describe('given remote already enabled', () => {
      it('when enabling remote, then does not duplicate', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })

        await service.enableRemote('pcloud')

        expect(syncConfig.saveSyncConfig).not.toHaveBeenCalled()
      })
    })
  })

  describe('disableRemote', () => {
    describe('given remote is enabled', () => {
      it('when disabling remote, then removes from list', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud', 'drive'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        vi.mocked(syncConfig.saveSyncConfig).mockResolvedValue(undefined)

        await service.disableRemote('pcloud')

        expect(syncConfig.saveSyncConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            enabledRemotes: ['drive'],
          })
        )
      })
    })
  })

  describe('syncLibrary', () => {
    describe('given no enabled remotes', () => {
      it('when syncing, then throws error', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: [],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })

        await expect(service.syncLibrary()).rejects.toThrow('No remotes enabled for sync')
      })
    })

    describe('given sync is configured', () => {
      beforeEach(() => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        vi.mocked(rcloneWrapper.bisync).mockResolvedValue(undefined)
        vi.mocked(syncConfig.updateLastSync).mockImplementation(async (config) => ({
          ...config,
          lastSyncTimestamp: Date.now(),
        }))
      })

      it('when syncing, then syncs books directory', async () => {
        await service.syncLibrary()

        expect(rcloneWrapper.bisync).toHaveBeenCalledWith(
          expect.stringContaining('books'),
          'pcloud:bookeeper/books'
        )
      })

      it('when syncing, then syncs thumbnails directory', async () => {
        await service.syncLibrary()

        expect(rcloneWrapper.bisync).toHaveBeenCalledWith(
          expect.stringContaining('thumbnails'),
          'pcloud:bookeeper/thumbnails'
        )
      })

      it('when syncing, then updates last sync timestamp', async () => {
        await service.syncLibrary()

        expect(syncConfig.updateLastSync).toHaveBeenCalled()
      })
    })

    describe('given multiple enabled remotes', () => {
      it('when syncing, then syncs to all remotes', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud', 'drive'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        vi.mocked(rcloneWrapper.bisync).mockResolvedValue(undefined)
        vi.mocked(syncConfig.updateLastSync).mockImplementation(async (config) => ({
          ...config,
          lastSyncTimestamp: Date.now(),
        }))

        await service.syncLibrary()

        // Should sync books and thumbnails to both remotes (4 calls total)
        expect(rcloneWrapper.bisync).toHaveBeenCalledTimes(4)
        expect(rcloneWrapper.bisync).toHaveBeenCalledWith(
          expect.stringContaining('books'),
          'pcloud:bookeeper/books'
        )
        expect(rcloneWrapper.bisync).toHaveBeenCalledWith(
          expect.stringContaining('books'),
          'drive:bookeeper/books'
        )
      })
    })

    describe('given sync is already in progress', () => {
      it('when trying to sync again, then throws error', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        // Make bisync hang
        vi.mocked(rcloneWrapper.bisync).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        )

        // Start first sync (will hang) - intentionally not awaited
        service.syncLibrary()

        // Try to start second sync
        await expect(service.syncLibrary()).rejects.toThrow('Sync already in progress')
      })
    })

    describe('given auth error during sync', () => {
      it('when syncing, then returns needsReauth flag', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          enabledRemotes: ['pcloud'],
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        const { AuthError } = await import('../rclone-wrapper')
        vi.mocked(rcloneWrapper.bisync).mockRejectedValue(
          new AuthError('Token expired')
        )

        const result = await service.syncLibrary()

        expect(result.success).toBe(false)
        expect(result.needsReauth).toBe(true)
        expect(result.failedRemote).toBe('pcloud')
      })
    })
  })
})
