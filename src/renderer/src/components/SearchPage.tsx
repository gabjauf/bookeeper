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
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const data = await ipc.invoke(IPCAction.DOCUMENT_SEARCH, { query: q })
      setResults(data)
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

  const openDocument = (documentId: string) => {
    ipc.invoke(IPCAction.DOCUMENT_OPEN_ORIGINAL, documentId)
  }

  return (
    <div class="flex-1 ml-12 p-4">
      {/* Header */}
      <div class="flex items-center gap-3 mb-6">
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

      {/* Loading */}
      <Show when={loading()}>
        <p class="text-neutral-500 text-sm">Searching…</p>
      </Show>

      {/* Results */}
      <Show when={!loading()}>
        <Show when={searched() && results().length === 0}>
          <p class="text-neutral-500 text-sm">No results found.</p>
        </Show>

        <div class="flex flex-col gap-3">
          <For each={results()}>
            {(result) => (
              <div
                class="flex gap-4 bg-neutral-800 rounded p-3 cursor-pointer hover:bg-neutral-700"
                onClick={() => openDocument(result.documentId)}
              >
                <img
                  src={`resource://${result.documentId}.svg`}
                  alt={result.title}
                  width={60}
                  height={60}
                  class="bg-white rounded shadow flex-shrink-0 object-contain"
                />
                <div class="flex flex-col gap-1 overflow-hidden">
                  <p class="text-sm font-medium text-neutral-100 truncate">{result.title}</p>
                  <p class="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                    {result.snippet}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
