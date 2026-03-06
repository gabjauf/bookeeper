import type { Component } from 'solid-js'
import { createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { toaster } from '@kobalte/core'
import { IPCAction } from '../../shared/ipc-actions'
import {
  ToastList,
  ToastRegion,
  ToastTitle,
  ToastContent,
  ToastProgress,
  Toast
} from '@renderer/components/ui/toast'
import { Menu } from '@ark-ui/solid/menu'
import { Sidebar } from './components/Sidebar'
import { SearchPage } from './components/SearchPage'
import { ipc } from './lib/ipc'

const App: Component = () => {
  const [dropAreaRef, setDropAreaRef] = createSignal<HTMLDivElement | null>(null)
  const [showSearch, setShowSearch] = createSignal(false)
  const [indexingCount, setIndexingCount] = createSignal(0)
  const [currentFile, setCurrentFile] = createSignal<string | undefined>(undefined)
  const [pillVisible, setPillVisible] = createSignal(false)

  onMount(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const off = ipc.on(
      IPCAction.INDEXING_QUEUE_UPDATE,
      (_, { count, currentFile: file }) => {
        setIndexingCount(count)
        setCurrentFile(file)
        if (count > 0) {
          if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
          setPillVisible(true)
        } else {
          hideTimer = setTimeout(() => setPillVisible(false), 1500)
        }
      }
    )
    onCleanup(() => {
      off?.()
      if (hideTimer) clearTimeout(hideTimer)
    })
  })

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dropAreaRef()?.classList.add('dragging')
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dropAreaRef()?.classList.remove('dragging')
  }

  const [filesResource, { refetch: refetchFiles }] = createResource<
    { title: string; id: string }[]
  >(async () => {
    const data = await ipc.invoke(IPCAction.DOCUMENT_GETALL)
    return data
  })

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dropAreaRef()?.classList.remove('dragging')

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files)
      const data = await Promise.all(
        files.map(async (el) => {
          const buffer = await el.arrayBuffer()
          return { name: el.name, size: el.size, data: new Uint8Array(buffer) }
        })
      )
      try {
        await ipc.invoke(IPCAction.FILE_UPLOAD, data)
        await refetchFiles()
      } catch (error) {
        console.error(error)
        toaster.show((props) => (
          <Toast toastId={props.toastId} variant="destructive">
            <ToastContent>
              <ToastTitle>{error instanceof Error ? error.message : 'Unknown error'}</ToastTitle>
            </ToastContent>
            <ToastProgress />
          </Toast>
        ))
      }
    }
  }

  const openOriginal = (documentId: string) => {
    ipc.invoke(IPCAction.DOCUMENT_OPEN_ORIGINAL, documentId)
  }

  const deleteDocument = async (documentId: string) => {
    await ipc.invoke(IPCAction.DOCUMENT_DELETE_BY_ID, documentId)
    refetchFiles()
  }

  return (
    <div class="flex min-h-screen">
      <Sidebar />

      <Show when={pillVisible()}>
        <div class="fixed bottom-4 left-16 flex items-center gap-1.5 text-xs text-neutral-500 pointer-events-none">
          <span class="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
          {currentFile()
            ? indexingCount() > 1
              ? `Indexing ${currentFile()}… (${indexingCount() - 1} more)`
              : `Indexing ${currentFile()}…`
            : 'Indexing…'}
        </div>
      </Show>

      <Show when={showSearch()}>
        <SearchPage onBack={() => setShowSearch(false)} />
      </Show>

      <Show when={!showSearch()}>
        <div
          ref={setDropAreaRef}
          class="drop-area flex-1 ml-12 p-4"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div class="fixed bottom-0 right-0">
            <ToastRegion>
              <ToastList />
            </ToastRegion>
          </div>

          {/* Search button */}
          <div class="flex justify-end mb-4">
            <button
              onClick={() => setShowSearch(true)}
              class="text-neutral-400 hover:text-neutral-100 text-sm px-3 py-1 rounded border border-neutral-700 hover:border-neutral-500"
            >
              Search
            </button>
          </div>

          <div class="grid grid-cols-4 gap-4">
            <For each={filesResource()} fallback={<p class="text-neutral-500 col-span-4">Drop documents here to add them</p>}>
              {(item, index) => (
                <div data-index={index()}>
                  <Menu.Root>
                    <Menu.ContextTrigger class="border-0 bg-inherit">
                      <div ondblclick={() => openOriginal(item.id)} class="cursor-pointer">
                        <img
                          src={`resource://${item.id}.svg`}
                          alt={item.title}
                          width={100}
                          height={100}
                          class="bg-white rounded shadow"
                        />
                        <p class="text-sm mt-1 text-neutral-300 truncate max-w-[100px]">{item.title}</p>
                      </div>
                    </Menu.ContextTrigger>
                    <Menu.Positioner>
                      <Menu.Content class="bg-neutral-800 border border-neutral-700 rounded shadow-lg p-1 min-w-[120px]">
                        <Menu.Item
                          value="open"
                          class="px-3 py-1.5 hover:bg-neutral-700 rounded cursor-pointer text-sm text-neutral-100"
                          onClick={() => openOriginal(item.id)}
                        >
                          Open
                        </Menu.Item>
                        <div class="my-1 border-t border-neutral-700" />
                        <Menu.Item
                          value="delete"
                          class="px-3 py-1.5 hover:bg-red-900/50 rounded cursor-pointer text-sm text-red-400"
                          onClick={() => deleteDocument(item.id)}
                        >
                          Delete
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Menu.Root>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default App
