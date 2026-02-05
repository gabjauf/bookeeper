import { registerIpc } from '../IPC-wrapper'
import { IPCAction } from '../../shared/ipc-actions'
import { syncService } from '../sync/sync-service'
import {
  listConfiguredRemotes,
  listProviders,
  addRemote,
} from '../sync/rclone-wrapper'
import { startPCloudAuth } from '../sync/oauth-pcloud'

/**
 * List all configured rclone remotes
 */
registerIpc(IPCAction.SYNC_LIST_REMOTES, async () => {
  return listConfiguredRemotes()
})

/**
 * List available cloud providers that support OAuth
 */
registerIpc(IPCAction.SYNC_LIST_PROVIDERS, async () => {
  return listProviders()
})

/**
 * Add a new remote using rclone's built-in OAuth.
 * Opens browser for authorization and blocks until complete.
 */
registerIpc(
  IPCAction.SYNC_ADD_REMOTE,
  async (_event, name: string, providerType: string) => {
    await addRemote(name, providerType)
    return { success: true }
  }
)

/**
 * Enable a remote for syncing
 */
registerIpc(IPCAction.SYNC_ENABLE_REMOTE, async (_event, remoteName: string) => {
  await syncService.enableRemote(remoteName)
  return { success: true }
})

/**
 * Disable a remote from syncing
 */
registerIpc(IPCAction.SYNC_DISABLE_REMOTE, async (_event, remoteName: string) => {
  await syncService.disableRemote(remoteName)
  return { success: true }
})

/**
 * Get list of enabled remotes for syncing
 */
registerIpc(IPCAction.SYNC_GET_ENABLED_REMOTES, async () => {
  return syncService.getEnabledRemotes()
})

/**
 * Start pCloud OAuth flow using rclone's built-in credentials.
 * Blocks until the user completes authorization in the browser,
 * then enables it for sync.
 */
registerIpc(IPCAction.SYNC_AUTH_PCLOUD, async () => {
  await startPCloudAuth()
  await syncService.enableRemote('pcloud')
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
