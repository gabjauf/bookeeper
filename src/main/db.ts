import { app } from 'electron'
import { join } from 'path'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const dbUrl = process.env.DB_FILE_NAME ?? `file:${join(app.getPath('userData'), 'local.db')}`

export const db = drizzle({ connection: { url: dbUrl } })

export async function runMigrations() {
  const migrationsFolder = app.isPackaged
    ? join(__dirname, 'migrations')
    : join(__dirname, '../../src/main/migrations')
  await migrate(db, { migrationsFolder })
}
