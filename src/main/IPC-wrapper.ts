import { ipcMain } from 'electron';

export function registerIpc(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args)
    } catch (err: unknown) {
      console.error(err);
      throw err;
    }
  })
}
