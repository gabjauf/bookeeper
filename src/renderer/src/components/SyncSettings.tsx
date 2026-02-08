import { createSignal, createResource, Show, Match, Switch } from 'solid-js'
import { Button } from './ui/button'
import { IPCAction } from '../../../shared/ipc-actions'

interface AuthCheckResult {
  valid: boolean
  needsReauth: boolean
  error?: string
}

export function SyncSettings() {
  const [syncing, setSyncing] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [needsReauth, setNeedsReauth] = createSignal(false)
  const [failedRemote, setFailedRemote] = createSignal<string | null>(null)
  const [reauthenticating, setReauthenticating] = createSignal(false)

  const [status, { refetch: refetchStatus }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(IPCAction.SYNC_STATUS) as Promise<string>
  })

  const [lastSync, { refetch: refetchLastSync }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(IPCAction.SYNC_GET_LAST_TIME) as Promise<
      string | null
    >
  })

  const [remotes, { refetch: refetchRemotes }] = createResource(async () => {
    return (window as any).electron.ipcRenderer.invoke(IPCAction.SYNC_LIST_REMOTES) as Promise<
      string[]
    >
  })

  // Proactive auth check - runs when remotes are loaded
  const [authStatus, { refetch: refetchAuth }] = createResource(
    () => remotes()?.[0],
    async (remoteName): Promise<AuthCheckResult | null> => {
      if (!remoteName) return null
      return (window as any).electron.ipcRenderer.invoke(
        IPCAction.SYNC_CHECK_AUTH,
        remoteName
      ) as Promise<AuthCheckResult>
    }
  )

  // Show re-auth button if either proactive check or reactive check indicates it
  const showReauth = () => needsReauth() || authStatus()?.needsReauth === true

  const refetchAll = () => {
    refetchStatus()
    refetchLastSync()
    refetchRemotes()
    refetchAuth()
    setNeedsReauth(false)
    setFailedRemote(null)
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setNeedsReauth(false)
    setFailedRemote(null)
    try {
      const result = await (window as any).electron.ipcRenderer.invoke(IPCAction.SYNC_START)
      if (!result.success) {
        setError(result.error || 'Sync failed')
        if (result.needsReauth) {
          setNeedsReauth(true)
          setFailedRemote(result.failedRemote || null)
        }
      }
      refetchLastSync()
      refetchStatus()
    } catch (e) {
      console.error('Sync failed:', e)
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSyncing(false)
    }
  }

  const handleReauth = async () => {
    const remote = failedRemote() || remotes()?.[0]
    if (!remote) return

    setReauthenticating(true)
    setError(null)
    try {
      await (window as any).electron.ipcRenderer.invoke(IPCAction.SYNC_REAUTH_REMOTE, remote)
      setNeedsReauth(false)
      setFailedRemote(null)
      refetchAll()
    } catch (e) {
      console.error('Re-authentication failed:', e)
      setError(e instanceof Error ? e.message : 'Re-authentication failed')
    } finally {
      setReauthenticating(false)
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

  const isConfigured = () => status() !== 'not-configured'

  return (
    <div class="p-4 bg-neutral-900 rounded-lg w-64 text-white">
      <h3 class="font-bold mb-3 flex items-center gap-2">Cloud Sync</h3>

      <Switch>
        <Match when={status.loading}>
          <p class="text-sm text-gray-400">Checking status...</p>
        </Match>

        <Match when={!isConfigured()}>
          <SetupInstructions onSuccess={refetchAll} />
        </Match>

        <Match when={isConfigured()}>
          <div class="space-y-3">
            {/* Remote display */}
            <div class="text-sm">
              <span class="text-gray-400">Remote: </span>
              <span class="font-medium">{remotes()?.[0] || 'None'}</span>
            </div>

            {/* Status */}
            <div class="flex items-center gap-2 text-sm">
              <span
                class={
                  status() === 'idle'
                    ? 'text-green-500'
                    : status() === 'syncing'
                      ? 'text-yellow-500'
                      : 'text-red-500'
                }
              >
                ●
              </span>
              <span class="capitalize">{status() || 'Unknown'}</span>
            </div>

            {/* Last sync */}
            <p class="text-sm text-gray-400">Last sync: {formatLastSync(lastSync() ?? null)}</p>

            {/* Error */}
            <Show when={error()}>
              <p class="text-sm text-red-500">{error()}</p>
            </Show>

            {/* Re-auth prompt */}
            <Show when={showReauth()}>
              <div class="p-2 bg-yellow-900/20 rounded border border-yellow-600">
                <p class="text-sm text-yellow-400 mb-2">Authentication expired</p>
                <Button
                  onClick={handleReauth}
                  disabled={reauthenticating()}
                  variant="outline"
                  class="w-full"
                >
                  {reauthenticating()
                    ? 'Authenticating...'
                    : `Re-authenticate ${failedRemote() || remotes()?.[0] || ''}`}
                </Button>
              </div>
            </Show>

            {/* Sync button */}
            <Button
              onClick={handleSync}
              disabled={syncing() || showReauth()}
              class="w-full"
              variant="secondary"
            >
              {syncing() ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </Match>
      </Switch>
    </div>
  )
}

function SetupInstructions(props: { onSuccess: () => void }) {
  const [connecting, setConnecting] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleConnectPCloud = async () => {
    setConnecting(true)
    setError(null)
    try {
      await (window as any).electron.ipcRenderer.invoke(IPCAction.SYNC_AUTH_PCLOUD)
      props.onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth failed')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div class="space-y-3">
      <p class="text-sm text-gray-400">Connect cloud storage to sync your library.</p>

      <Show when={error()}>
        <p class="text-sm text-red-500">{error()}</p>
      </Show>

      {/* pCloud button */}
      <Button
        onClick={handleConnectPCloud}
        disabled={connecting()}
        class="w-full"
        variant="outline"
      >
        {connecting() ? 'Waiting for authorization...' : 'Connect pCloud'}
      </Button>

      {/* Future providers */}
      <p class="text-xs text-gray-500 text-center">More providers coming soon</p>
    </div>
  )
}
