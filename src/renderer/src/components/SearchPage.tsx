import { createSignal, For, Show } from 'solid-js'
import { IPCAction } from '../../../shared/ipc-actions'
import type { SearchResult } from '../../../shared/ipc-types'
import { ipc } from '../lib/ipc'

interface SearchPageProps {
  onBack: () => void
}

export function SearchPage(props: SearchPageProps) {
  const [query, setQuery] = createSignal('')
  const [results, setResults] = createSignal<SearchResult[]>([])
  const [loading, setLoading] = createSignal(false)
  const [searched, setSearched] = createSignal(false)

  let debounceTimer: ReturnType<typeof setTimeout>

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      setResults(await ipc.invoke(IPCAction.DOCUMENT_SEARCH, { query: q }))
    } catch (err) {
      console.error('Search failed', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleInput = (e: InputEvent) => {
    const value = (e.target as HTMLInputElement).value
    setQuery(value)
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(value), 300)
  }

  const openDocument = (documentId: string) => ipc.invoke(IPCAction.DOCUMENT_OPEN_ORIGINAL, documentId)

  const relevance = (score: number) => Math.round((1 - score) * 100)

  const accentClass = (score: number) => {
    const r = relevance(score)
    if (r >= 80) return 'border-blue-500'
    if (r >= 60) return 'border-neutral-500'
    return 'border-neutral-700'
  }

  return (
    <div class="flex-1 ml-12 p-4 max-w-2xl flex flex-col" style="height: 100vh;">
      {/* Header */}
      <div class="flex items-center gap-3 mb-6 flex-shrink-0">
        <button
          onClick={props.onBack}
          class="text-neutral-400 hover:text-neutral-100 text-sm flex items-center gap-1"
        >
          ← Library
        </button>
        <input
          type="text"
          autofocus
          placeholder="Search your library…"
          value={query()}
          onInput={handleInput}
          class="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
      </div>

      <Show when={loading()}>
        <p class="text-neutral-500 text-sm">Searching…</p>
      </Show>

      <Show when={!loading()}>
        <Show when={searched() && results().length === 0}>
          <p class="text-neutral-500 text-sm">No results found.</p>
        </Show>

        <div class="flex flex-col gap-2 overflow-y-auto">
          <For each={results()}>
            {(result) => (
              <div
                class={`border-l-2 pl-3 py-2 cursor-pointer hover:bg-neutral-800/50 rounded-r ${accentClass(result.score)}`}
                onClick={() => openDocument(result.documentId)}
              >
                <div class="flex items-baseline justify-between gap-2 mb-1">
                  <span class="text-sm text-neutral-200 truncate">{result.title} · p. {result.page}</span>
                  <span class="text-xs text-neutral-500 flex-shrink-0">{relevance(result.score)}%</span>
                </div>
                <p class="text-xs text-neutral-400 leading-relaxed line-clamp-2">{result.snippet}</p>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
