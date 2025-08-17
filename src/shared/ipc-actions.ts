export const IPCAction = {
    FILE_UPLOAD: 'file:upload',
} as const;

export type IPCAction = keyof typeof IPCAction;