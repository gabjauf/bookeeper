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

  const openDocument = (documentId: string, page?: number) =>
    ipc.invoke(IPCAction.DOCUMENT_OPEN_ORIGINAL, documentId, page)

  const accentClass = (score: number) => {
    const scores = results().map((r) => r.score)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const range = max - min
    const normalized = range === 0 ? 1 : (max - score) / range
    if (normalized >= 0.7) return 'border-blue-500'
    if (normalized >= 0.4) return 'border-neutral-500'
    return 'border-neutral-700'
  }

  return (
    <div class="flex-1 ml-12 p-4 max-w-2xl flex flex-col" style="height: 100vh;">
      {/* Header */}
      <div class="flex items-center gap-3 mb-6 flex-shrink-0">
        <button
          onClick={props.onBack}
          class="text-neutral-400 hover:text-neutral-100 text-sm"
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

        <div class="flex flex-col gap-2 overflow-y-auto pr-1">
          <For each={results()}>
            {(result) => (
              <div
                class={`flex gap-3 bg-neutral-800 border border-neutral-700 rounded-lg p-3 cursor-pointer hover:border-neutral-500 hover:bg-neutral-750 border-l-[3px] transition-colors ${accentClass(result.score)}`}
                onClick={() => openDocument(result.documentId, result.page)}
              >
                {/* Cover */}
                <img
                  src={`resource://${result.documentId}.svg`}
                  alt={result.title}
                  width={40}
                  height={52}
                  class="bg-white rounded shadow flex-shrink-0 object-contain self-start"
                />

                {/* Content */}
                <div class="flex flex-col gap-1 min-w-0">
                  <p class="text-sm text-white font-medium truncate">
                    {result.title}
                    <span class="text-neutral-400 font-normal"> · p. {result.page}</span>
                  </p>
                  <p class="text-sm text-neutral-300 leading-relaxed line-clamp-2">{result.snippet}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
