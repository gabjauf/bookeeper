import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import { syncService } from '../sync/sync-service'
import { listConfiguredRemotes } from '../sync/rclone-wrapper'
import { startPCloudAuth } from '../sync/oauth-pcloud'

/**
 * List all configured rclone remotes
 */
registerIpc(IPCAction.SYNC_LIST_REMOTES, async () => {
  return listConfiguredRemotes()
})

/**
 * Set the remote to use for syncing
 */
registerIpc(IPCAction.SYNC_SET_REMOTE, async (_event, remoteName: string) => {
  await syncService.setRemote(remoteName)
  return { success: true }
})

/**
 * Start pCloud OAuth flow using rclone's built-in credentials.
 * Blocks until the user completes authorization in the browser,
 * then configures the sync remote.
 */
registerIpc(IPCAction.SYNC_AUTH_PCLOUD, async () => {
  await startPCloudAuth()
  await syncService.setRemote('pcloud')
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
  return syncService.getLastSyncTimeISO()
})
