import type { IPCAction } from './ipc-actions'

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Document {
  id: string
  title: string
  extension: string
  personal: boolean
  sha: string | null
  createdAt: string | null
  updatedAt: string | null
  deviceId: string | null
  syncVersion: number | null
}

export interface SearchResult {
  documentId: string
  title: string
  extension: string
  snippet: string
  score: number
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'not-configured'

export interface SyncResult {
  success: boolean
  error?: string
  needsReauth?: boolean
  failedRemote?: string
  booksSync: boolean
  thumbnailsSync: boolean
  dbSync: boolean
}

export interface CloudProvider {
  name: string
  description: string
  prefix: string
}

export interface AuthCheckResult {
  valid: boolean
  needsReauth: boolean
  error?: string
}

// ─── Channel maps ─────────────────────────────────────────────────────────────

/** invoke/handle (renderer → main) */
export interface IpcInvokeMap {
  [IPCAction.FILE_UPLOAD]:             { args: [Array<{ name: string; data: Uint8Array }>]; result: Document[] }
  [IPCAction.DOCUMENT_GETALL]:         { args: [];                                           result: Document[] }
  [IPCAction.DOCUMENT_OPEN_ORIGINAL]:  { args: [documentId: string];                        result: void }
  [IPCAction.DOCUMENT_DELETE_BY_ID]:   { args: [documentId: string];                        result: void }
  [IPCAction.DOCUMENT_SEARCH]:         { args: [{ query: string; limit?: number }];          result: SearchResult[] }
  [IPCAction.SYNC_START]:              { args: [];                                           result: SyncResult }
  [IPCAction.SYNC_STATUS]:             { args: [];                                           result: SyncStatus }
  [IPCAction.SYNC_GET_LAST_TIME]:      { args: [];                                           result: string | null }
  [IPCAction.SYNC_LIST_REMOTES]:       { args: [];                                           result: string[] }
  [IPCAction.SYNC_LIST_PROVIDERS]:     { args: [];                                           result: CloudProvider[] }
  [IPCAction.SYNC_ADD_REMOTE]:         { args: [name: string, providerType: string];         result: { success: true } }
  [IPCAction.SYNC_ENABLE_REMOTE]:      { args: [remoteName: string];                         result: { success: true } }
  [IPCAction.SYNC_DISABLE_REMOTE]:     { args: [remoteName: string];                         result: { success: true } }
  [IPCAction.SYNC_GET_ENABLED_REMOTES]:{ args: [];                                           result: string[] }
  [IPCAction.SYNC_CHECK_AUTH]:         { args: [remoteName: string];                         result: AuthCheckResult }
  [IPCAction.SYNC_REAUTH_REMOTE]:      { args: [remoteName: string];                         result: { success: true } }
  [IPCAction.SYNC_AUTH_PCLOUD]:        { args: [];                                            result: { success: true } }
}

/** send/on (main → renderer) */
export interface IpcEventMap {
  [IPCAction.INDEXING_QUEUE_UPDATE]: { count: number; currentFile?: string }
}
