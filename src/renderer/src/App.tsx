import type { Component } from 'solid-js'
import { createResource, createSignal, For } from 'solid-js'
import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { IPCAction } from '../../shared/ipc-actions'

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

  const [filesResource, { refetch: refetchFiles }] = createResource<{ title: string}[]>(async () => {
    const data = await (window as any).electron.ipcRenderer.invoke(IPCAction.DOCUMENT_GETALL)
    console.log(data)
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
      console.log('Files dropped:', data)

      // You can send these files to the backend via IPC if needed
      await (window as any).electron.ipcRenderer.invoke(IPCAction.FILE_UPLOAD, data)
      await refetchFiles()
    }
  }

  return (
    <>
      <For each={filesResource()} fallback={'No document'}>
        {(item, index) => <div data-index={index()}>{item.title}</div>}
      </For>

      {/* New drop area for file upload */}
      <div
        ref={setDropAreaRef}
        class="drop-area"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span>Drag and drop files here!</span>
      </div>

      {/* CSS for drop area styling */}
      <link rel="stylesheet" href="/src/assets/main.css" />

      <Versions />
    </>
  )
}

export default App
