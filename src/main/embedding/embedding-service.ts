import { quantizeEmbeddings } from '../../quantize'

const OLLAMA_URL = 'http://localhost:11434'
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b'

export async function embed(texts: string[]): Promise<Uint8Array[]> {
  if (texts.length === 0) return []
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  })
  if (!res.ok) throw new Error(`Ollama embed failed: ${res.statusText}`)
  const { embeddings } = (await res.json()) as { embeddings: number[][] }
  return quantizeEmbeddings(embeddings, 'ubinary') as Uint8Array[]
}
