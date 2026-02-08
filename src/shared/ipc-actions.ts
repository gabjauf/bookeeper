export const IPCAction = {
    FILE_UPLOAD: 'file:upload',
    DOCUMENT_GETALL: 'documents:getAll',
    DOCUMENT_OPEN_ORIGINAL: 'documents:openOriginal',
    DOCUMENT_DELETE_BY_ID: 'documents:deleteById',
    // Sync actions
    SYNC_CONFIGURE: 'sync:configure',
    SYNC_START: 'sync:start',
    SYNC_STATUS: 'sync:status',
    SYNC_GET_LAST_TIME: 'sync:getLastTime',
    SYNC_LIST_REMOTES: 'sync:listRemotes',
    SYNC_AUTH_PCLOUD: 'sync:authPcloud',
    SYNC_LIST_PROVIDERS: 'sync:listProviders',
    SYNC_ADD_REMOTE: 'sync:addRemote',
    SYNC_ENABLE_REMOTE: 'sync:enableRemote',
    SYNC_DISABLE_REMOTE: 'sync:disableRemote',
    SYNC_GET_ENABLED_REMOTES: 'sync:getEnabledRemotes',
    SYNC_CHECK_AUTH: 'sync:checkAuth',
    SYNC_REAUTH_REMOTE: 'sync:reauthRemote',
} as const;

export type IPCAction = keyof typeof IPCAction;