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
import { Button } from './components/ui/button'
import { Menu } from '@ark-ui/solid/menu'

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
    <div
      ref={setDropAreaRef}
      class="drop-area"
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
      <div class="grid grid-cols-4 gap-2">
        <For each={filesResource()} fallback={'No document'}>
          {(item, index) => (
            <div data-index={index()}>
              <Menu.Root>
                <Menu.ContextTrigger class="border-0 bg-inherit">
                  <div ondblclick={() => openOriginal(item.id)}>
                    <img
                      src={`resource://${item.id}.svg`}
                      alt={item.title}
                      width={100}
                      height={100}
                      class="bg-white"
                    />
                  </div>
                </Menu.ContextTrigger>
                <Menu.Positioner>
                  <Menu.Content class="menu dropdown-content base-100">
                    <Menu.Item value="react">Open</Menu.Item>
                    <Menu.Item value="solid"><button class="btn btn-error">Delete</button></Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
            </div>
          )}
        </For>
      </div>

      {/* CSS for drop area styling */}
      <link rel="stylesheet" href="/src/assets/main.css" />
      <button class="btn btn-primary">Click me</button>
    </div>
  )
}

export default App
