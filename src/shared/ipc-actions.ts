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
    SYNC_SET_REMOTE: 'sync:setRemote',
    SYNC_AUTH_PCLOUD: 'sync:authPcloud',
} as const;

export type IPCAction = keyof typeof IPCAction;