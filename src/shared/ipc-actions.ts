export const IPCAction = {
    FILE_UPLOAD: 'file:upload',
    DOCUMENT_GETALL: 'documents:getAll'
} as const;

export type IPCAction = keyof typeof IPCAction;