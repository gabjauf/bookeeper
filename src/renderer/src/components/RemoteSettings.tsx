import { createSignal, createResource, For, Show } from 'solid-js'
import { Button } from './ui/button'
import { IPCAction } from '../../../shared/ipc-actions'

interface CloudProvider {
  name: string
  description: string
  prefix: string
}

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  pcloud: 'pCloud',
  drive: 'Google Drive',
  dropbox: 'Dropbox',
  onedrive: 'OneDrive',
  box: 'Box',
  yandex: 'Yandex Disk',
}

// Plus icon
function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function RemoteSettings() {
  const [adding, setAdding] = createSignal(false)
  const [syncing, setSyncing] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  // Fetch configured rclone remotes
  const [remotes, { refetch: refetchRemotes }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(
      IPCAction.SYNC_LIST_REMOTES
    ) as Promise<string[]>
  })

  // Fetch enabled remotes for sync
  const [enabledRemotes, { refetch: refetchEnabledRemotes }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(
      IPCAction.SYNC_GET_ENABLED_REMOTES
    ) as Promise<string[]>
  })

  // Fetch available providers
  const [providers] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(
      IPCAction.SYNC_LIST_PROVIDERS
    ) as Promise<CloudProvider[]>
  })

  // Sync status
  const [status, { refetch: refetchStatus }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(
      IPCAction.SYNC_STATUS
    ) as Promise<string>
  })

  // Last sync time
  const [lastSync, { refetch: refetchLastSync }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(
      IPCAction.SYNC_GET_LAST_TIME
    ) as Promise<string | null>
  })

  const handleAddRemote = async (providerType: string) => {
    setAdding(true)
    setError(null)
    try {
      // Use provider type as remote name for simplicity
      await (window as any).electron.ipcRenderer.invoke(
        IPCAction.SYNC_ADD_REMOTE,
        providerType,
        providerType
      )
      // Enable the new remote for sync
      await (window as any).electron.ipcRenderer.invoke(
        IPCAction.SYNC_ENABLE_REMOTE,
        providerType
      )
      refetchRemotes()
      refetchEnabledRemotes()
      refetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add remote')
    } finally {
      setAdding(false)
    }
  }

  const handleEnableRemote = async (remoteName: string) => {
    setError(null)
    try {
      await (window as any).electron.ipcRenderer.invoke(
        IPCAction.SYNC_ENABLE_REMOTE,
        remoteName
      )
      refetchEnabledRemotes()
      refetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable remote')
    }
  }

  const handleDisableRemote = async (remoteName: string) => {
    setError(null)
    try {
      await (window as any).electron.ipcRenderer.invoke(
        IPCAction.SYNC_DISABLE_REMOTE,
        remoteName
      )
      refetchEnabledRemotes()
      refetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disable remote')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await (window as any).electron.ipcRenderer.invoke(
        IPCAction.SYNC_START
      )
      if (!result.success) {
        setError(result.error || 'Sync failed')
      }
      refetchLastSync()
      refetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return 'Never'
    const date = new Date(isoString)
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return date.toLocaleDateString()
  }

  const isConfigured = () =>
    status() !== 'not-configured' && (enabledRemotes() || []).length > 0

  return (
    <div class="space-y-4 text-white">
      {/* Error display */}
      <Show when={error()}>
        <div class="p-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">
          {error()}
        </div>
      </Show>

      {/* Configured remotes with sync toggle */}
      <div>
        <h3 class="text-sm font-medium text-neutral-400 mb-2">
          Connected Accounts
        </h3>
        <Show
          when={(remotes() || []).length > 0}
          fallback={
            <p class="text-sm text-neutral-500">No accounts connected</p>
          }
        >
          <div class="space-y-2">
            <For each={remotes()}>
              {(remote) => {
                const isEnabled = () => (enabledRemotes() || []).includes(remote)
                return (
                  <label class="flex items-center justify-between p-2 bg-neutral-700 rounded cursor-pointer hover:bg-neutral-600 transition-colors">
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isEnabled()}
                        onChange={(e) =>
                          e.target.checked
                            ? handleEnableRemote(remote)
                            : handleDisableRemote(remote)
                        }
                        class="w-4 h-4 rounded border-neutral-500 bg-neutral-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-neutral-800"
                      />
                      <span class="text-sm">
                        {PROVIDER_NAMES[remote] || remote}
                      </span>
                    </div>
                    <Show when={isEnabled()}>
                      <span class="text-xs text-blue-400">sync enabled</span>
                    </Show>
                  </label>
                )
              }}
            </For>
          </div>
        </Show>
      </div>

      {/* Add new remote */}
      <div>
        <h3 class="text-sm font-medium text-neutral-400 mb-2">Add Account</h3>
        <div class="grid grid-cols-2 gap-2">
          <For each={providers()}>
            {(provider) => {
              const alreadyAdded = () =>
                (remotes() || []).includes(provider.name)
              return (
                <button
                  onClick={() => handleAddRemote(provider.name)}
                  disabled={adding() || alreadyAdded()}
                  class={`p-2 text-sm rounded border transition-colors ${
                    alreadyAdded()
                      ? 'border-neutral-600 text-neutral-500 cursor-not-allowed'
                      : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-700'
                  }`}
                >
                  <Show when={adding()} fallback={<PlusIcon />}>
                    <span class="animate-spin">...</span>
                  </Show>
                  <span class="ml-1">
                    {PROVIDER_NAMES[provider.name] || provider.description}
                  </span>
                </button>
              )
            }}
          </For>
        </div>
      </div>

      {/* Sync controls */}
      <Show when={isConfigured()}>
        <div class="border-t border-neutral-700 pt-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-neutral-400">Last sync:</span>
            <span class="text-sm">{formatLastSync(lastSync() ?? null)}</span>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing()}
            class="w-full"
            variant="secondary"
          >
            {syncing() ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </Show>
    </div>
  )
}
