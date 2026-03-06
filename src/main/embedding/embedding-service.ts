import { Ollama } from 'ollama'

const EMBEDDING_MODEL = 'qwen3-embedding:0.6b'
const ollama = new Ollama()

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const { embeddings } = await ollama.embed({ model: EMBEDDING_MODEL, input: texts })
  return embeddings
}
