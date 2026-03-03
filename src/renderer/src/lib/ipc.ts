import type { IpcInvokeMap, IpcEventMap } from '../../../shared/ipc-types'

const raw = window.electron.ipcRenderer

export const ipc = {
  invoke<C extends keyof IpcInvokeMap>(
    channel: C,
    ...args: IpcInvokeMap[C]['args']
  ): Promise<IpcInvokeMap[C]['result']> {
    return raw.invoke(channel, ...args)
  },

  on<C extends keyof IpcEventMap>(
    channel: C,
    listener: (event: unknown, payload: IpcEventMap[C]) => void
  ): () => void {
    return raw.on(channel, listener)
  },
}
