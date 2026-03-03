import { resolve } from 'path'
import { cpSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

const copyMigrationsPlugin = () => ({
  name: 'copy-migrations',
  closeBundle() {
    cpSync('src/main/migrations', 'out/main/migrations', { recursive: true })
  }
})

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMigrationsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [solid(), tailwindcss()]
  }
})
