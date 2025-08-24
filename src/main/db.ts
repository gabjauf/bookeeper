import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

export const db = drizzle({ connection: { url: process.env.DB_FILE_NAME! } })

export async function runMigrations() {
  migrate(db, { migrationsFolder: './src/main/migrations' })
}
