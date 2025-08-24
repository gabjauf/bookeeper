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
  personal: integer({ mode: 'boolean' }).notNull().default(false)
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
