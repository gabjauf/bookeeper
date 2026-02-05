import { createSignal, Show } from 'solid-js'
import { RemoteSettings } from './RemoteSettings'

// Gear icon SVG
function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// Cloud icon SVG
function CloudIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

export function Sidebar() {
  const [showSettings, setShowSettings] = createSignal(false)

  return (
    <>
      {/* Sidebar strip */}
      <div class="fixed left-0 top-0 h-full w-12 bg-neutral-900 flex flex-col items-center py-4 gap-2 z-40">
        <button
          onClick={() => setShowSettings(!showSettings())}
          class={`p-2 rounded-lg transition-colors ${
            showSettings()
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Cloud Sync Settings"
        >
          <CloudIcon />
        </button>

        {/* Spacer */}
        <div class="flex-1" />

        {/* Settings at bottom */}
        <button
          onClick={() => setShowSettings(!showSettings())}
          class={`p-2 rounded-lg transition-colors ${
            showSettings()
              ? 'bg-neutral-700 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>

      {/* Settings panel (slides out) */}
      <Show when={showSettings()}>
        <div class="fixed left-12 top-0 h-full w-80 bg-neutral-800 border-r border-neutral-700 z-30 overflow-y-auto">
          <div class="p-4">
            <h2 class="text-lg font-semibold text-white mb-4">Cloud Sync</h2>
            <RemoteSettings />
          </div>
        </div>
      </Show>

      {/* Click outside to close */}
      <Show when={showSettings()}>
        <div
          class="fixed inset-0 z-20"
          onClick={() => setShowSettings(false)}
        />
      </Show>
    </>
  )
}
