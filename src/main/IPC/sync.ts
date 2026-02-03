import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import { SyncService } from '../sync/sync-service'

const syncService = new SyncService()

/**
 * Configure sync with pCloud
 */
registerIpc(IPCAction.SYNC_CONFIGURE, async (_event, pcloudToken: string, remotePath?: string) => {
  await syncService.configure(pcloudToken, remotePath)
  return { success: true }
})

/**
 * Start sync
 */
registerIpc(IPCAction.SYNC_START, async () => {
  return syncService.syncLibrary()
})

/**
 * Get sync status
 */
registerIpc(IPCAction.SYNC_STATUS, async () => {
  return syncService.getStatus()
})

/**
 * Get last sync time
 */
registerIpc(IPCAction.SYNC_GET_LAST_TIME, async () => {
  const lastSync = await syncService.getLastSyncTime()
  return lastSync?.toISOString() ?? null
})
