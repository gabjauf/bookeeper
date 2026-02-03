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
} as const;

export type IPCAction = keyof typeof IPCAction;