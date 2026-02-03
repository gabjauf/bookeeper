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
  configurePcloud: vi.fn(),
  bisync: vi.fn(),
  syncUp: vi.fn(),
  syncDown: vi.fn(),
}))

// Mock sync-config
vi.mock('../sync-config', () => ({
  loadSyncConfig: vi.fn(),
  saveSyncConfig: vi.fn(),
  updateLastSync: vi.fn(),
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

    describe('given rclone and config are available', () => {
      it('when getting status, then returns idle', async () => {
        vi.mocked(rcloneWrapper.isRcloneAvailable).mockResolvedValue(true)
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          pcloudToken: 'token',
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

  describe('configure', () => {
    describe('given valid pCloud token', () => {
      it('when configuring, then sets up pcloud remote and saves config', async () => {
        vi.mocked(rcloneWrapper.configurePcloud).mockResolvedValue(undefined)
        vi.mocked(syncConfig.saveSyncConfig).mockResolvedValue(undefined)

        await service.configure('test-token')

        expect(rcloneWrapper.configurePcloud).toHaveBeenCalledWith('test-token')
        expect(syncConfig.saveSyncConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            pcloudToken: 'test-token',
            remotePath: 'bookeeper',
          })
        )
      })
    })
  })

  describe('syncLibrary', () => {
    describe('given sync is not configured', () => {
      it('when syncing, then throws error', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue(null)

        await expect(service.syncLibrary()).rejects.toThrow('Sync not configured')
      })
    })

    describe('given sync is configured', () => {
      beforeEach(() => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          pcloudToken: 'token',
          remotePath: 'bookeeper',
          deviceId: 'device-1',
          syncOnClose: true,
          lastSyncTimestamp: null,
        })
        vi.mocked(rcloneWrapper.bisync).mockResolvedValue({ exitCode: 0 })
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

    describe('given sync is already in progress', () => {
      it('when trying to sync again, then throws error', async () => {
        vi.mocked(syncConfig.loadSyncConfig).mockResolvedValue({
          pcloudToken: 'token',
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
  })
})
