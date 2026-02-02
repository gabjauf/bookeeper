export const IPCAction = {
    FILE_UPLOAD: 'file:upload',
    DOCUMENT_GETALL: 'documents:getAll',
    DOCUMENT_OPEN_ORIGINAL: 'documents:openOriginal',
    DOCUMENT_DELETE_BY_ID: 'documents:deleteById'
} as const;

export type IPCAction = keyof typeof IPCAction;