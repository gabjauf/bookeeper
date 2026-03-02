import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import path from 'path'

if (is.dev) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Bookshelf-dev'))
}
