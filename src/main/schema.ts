import { sqliteTable, integer, customType, int, text } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

const embedding = customType<{
  data: number[]
  config: { dimensions: number }
  configRequired: true
  driverData: Buffer
}>({
  dataType(config) {
    return `F1BIT_BLOB(${config.dimensions})`
  },
  fromDriver(value: Buffer) {
    return Array.from(new Float32Array(value.buffer))
  },
  toDriver(value: number[]) {
    return sql`vector1bit(${JSON.stringify(value)})`
  }
})

export const usersTable = sqliteTable('users_table', {
  id: text("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  name: text().notNull(),
  age: int().notNull(),
  email: text().notNull().unique()
})

export const vectorsTable = sqliteTable('vectors', {
  id: text("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  text: text().notNull(),
  embedding: embedding({ dimensions: 1024 }).notNull() // stores raw binary vector
})

export const documentsTable = sqliteTable('document', {
  id: text("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  title: text().notNull(),
  extension: text().notNull(),
  personal: integer({ mode: 'boolean' }).notNull().default(false),
  sha: text(),
  // Sync metadata (nullable for existing rows, set in app code)
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  deviceId: text('device_id'),
  syncVersion: integer('sync_version'),
})

export const syncStateTable = sqliteTable('sync_state', {
  id: text("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  lastSync: text('last_sync'),
  deviceId: text('device_id').notNull(),
  remotePath: text('remote_path').notNull().default('bookeeper'),
  syncVersion: integer('sync_version').default(0),
})

export const chunksTable = sqliteTable('chunks', {
  id: text("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  documentId: text('document_id')
    .notNull()
    .references(() => documentsTable.id),
  embedding: embedding({ dimensions: 1024 }).notNull() // stores raw binary vector
})

export const chunksRelations = relations(chunksTable, ({ one }) => ({
  document: one(documentsTable),
}));
