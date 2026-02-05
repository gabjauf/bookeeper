import { rpc, rpcAsync, type RPCResult } from './rclone-bridge'

/**
 * Start pCloud OAuth flow using rclone's built-in credentials.
 * Rclone handles the entire flow: opens browser, starts local callback server
 * on localhost:53682, and captures the OAuth token automatically.
 *
 * This call blocks until the user completes authorization in the browser.
 */
export async function startPCloudAuth(): Promise<void> {
  // Delete any existing pcloud remote to start fresh
  try {
    rpc('config/delete', { name: 'pcloud' })
  } catch {
    // Remote might not exist, which is fine
  }

  // Create pCloud remote with empty parameters.
  // rclone detects it's an OAuth provider, opens browser to its built-in
  // OAuth URL, starts a localhost callback server, and waits for the token.
  const response: RPCResult = await rpcAsync('config/create', {
    name: 'pcloud',
    type: 'pcloud',
    parameters: {},
  })

  if (response.status !== 200) {
    throw new Error(`Failed to configure pCloud: ${JSON.stringify(response.output)}`)
  }
}
