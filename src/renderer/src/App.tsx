import type { Component } from 'solid-js'
import { createResource, createSignal, For } from 'solid-js'
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

const App: Component = () => {
  // Create ref for drop area using createSignal
  const [dropAreaRef, setDropAreaRef] = createSignal<HTMLDivElement | null>(null)

  // Define drag state and handlers
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Add visual feedback when dragging over the drop area
    const ref = dropAreaRef()
    if (ref) {
      ref.classList.add('dragging')
    }
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Remove visual feedback when dragging leaves the drop area
    const ref = dropAreaRef()
    if (ref) {
      ref.classList.remove('dragging')
    }
  }

  const [filesResource, { refetch: refetchFiles }] = createResource<
    { title: string; id: string }[]
  >(async () => {
    const data = await (window as any).electron.ipcRenderer.invoke(IPCAction.DOCUMENT_GETALL)
    return data
  })

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Remove visual feedback after drop
    const ref = dropAreaRef()
    if (ref) {
      ref.classList.remove('dragging')
    }

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files)

      const data = await Promise.all(
        files.map(async (el) => {
          const buffer = await el.arrayBuffer()
          return {
            name: el.name,
            size: el.size,
            data: new Uint8Array(buffer)
          }
        })
      )

      // You can send these files to the backend via IPC if needed
      try {
        await (window as any).electron.ipcRenderer.invoke(IPCAction.FILE_UPLOAD, data)
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
    ;(window as any).electron.ipcRenderer.invoke(IPCAction.DOCUMENT_OPEN_ORIGINAL, documentId)
  }

  const deleteDocument = (documentId: string) => {
    ;(window as any).electron.ipcRenderer.invoke(IPCAction.DOCUMENT_DELETE_BY_ID, documentId)
  }

  return (
    <div class="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
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
                    <Menu.Content class="bg-neutral-800 border border-neutral-700 rounded shadow-lg p-1">
                      <Menu.Item value="open" class="px-3 py-1 hover:bg-neutral-700 rounded cursor-pointer text-sm">
                        Open
                      </Menu.Item>
                      <Menu.Item
                        value="delete"
                        class="px-3 py-1 hover:bg-red-900 rounded cursor-pointer text-sm text-red-400"
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
    </div>
  )
}

export default App
