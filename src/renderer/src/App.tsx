import type { Component } from 'solid-js'
import { createSignal } from 'solid-js'
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

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    // Remove visual feedback after drop
    const ref = dropAreaRef()
    if (ref) {
      ref.classList.remove('dragging')
    }

    if (event.dataTransfer?.files) {
      const files = Array.from(event.dataTransfer.files);
    
      const data = await Promise.all(files.map(async el => {
        const buffer = await el.arrayBuffer();
        return {
          name: el.name,
          size: el.size,
          data: new Uint8Array(buffer)
        }
      }));
            console.log(
        'Files dropped:',
        data
      )

      // You can send these files to the backend via IPC if needed
      await (window as any).electron.ipcRenderer.invoke(IPCAction.FILE_UPLOAD, data)
    }
  }

  return (
    <>
      <img alt="logo" class="logo" src={electronLogo} />
      <div class="creator">Powered by electron-vite</div>
      <div class="text">
        Build an Electron app with <span class="solid">Solid</span>
        &nbsp;and <span class="ts">TypeScript</span>
      </div>
      <p class="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>

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
