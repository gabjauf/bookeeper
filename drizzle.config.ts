import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  out: "./src/main/migrations",
  schema: './src/main/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME!
  }
})
