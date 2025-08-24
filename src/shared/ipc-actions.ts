export const IPCAction = {
    FILE_UPLOAD: 'file:upload',
    DOCUMENT_GETALL: 'documents:getAll',
    DOCUMENT_OPEN_ORIGINAL: 'documents:openOriginal'
} as const;

export type IPCAction = keyof typeof IPCAction;