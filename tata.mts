import { createClient } from '@libsql/client'
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './src/db/schema'

import { sql } from 'drizzle-orm'
import ollama from 'ollama'
import { vectorsTable } from './src/db/schema'

const client = createClient({ url: process.env.DB_FILE_NAME! })

export const db = drizzle(client, {
  schema
})

// const data = ['The car is blue', 'The car is red', 'There are chickens in the yard']

// await Promise.all(
//   data.map(async (sentence) => {
//     const embed = await getEmbedding(sentence)
//     await db.insert(vectorsTable).values({ embedding: embed.embeddings[0], text: sentence })
//   })
// )

async function getEmbedding(sentence: string) {
  return await ollama.embed({
    input: sentence,
    model: 'hf.co/Qwen/Qwen3-Embedding-0.6B-GGUF:Q8_0'
  })
}

async function findNearest(text: string) {
  const queryEmbedding = await getEmbedding(text)

  const results = await db
    .select({
      // distance: sql`bit_count(embedding # ${queryEmbedding})`,
      text: vectorsTable.text,
      distance: sql`vector_distance_cos(${vectorsTable.embedding}, vector1bit(${JSON.stringify(queryEmbedding.embeddings[0])}))`
    })
    .from(vectorsTable)
    .limit(10)
    .orderBy(`distance ASC`)
    .all()

  return results
}

const res = await findNearest('Much to learn you have')

console.log(res)
