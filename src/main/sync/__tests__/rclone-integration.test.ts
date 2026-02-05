/**
 * Integration tests that call the real librclone to understand the API.
 * These tests require the native librclone.dylib to be present.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock electron app since we're running in Node, not Electron
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

import { initialize, finalize, rpc } from '../rclone-bridge'

describe('rclone integration', () => {
  beforeAll(() => {
    initialize()
  })

  afterAll(() => {
    finalize()
  })

  describe('config/providers', () => {
    it('should list available providers including pcloud', () => {
      const result = rpc('config/providers', {})

      expect(result.status).toBe(200)
      expect(result.output).toHaveProperty('providers')

      const providers = (result.output as any).providers
      const pcloud = providers.find((p: any) => p.Name === 'pcloud')

      expect(pcloud).toBeDefined()
      console.log('pCloud provider config:', JSON.stringify(pcloud, null, 2))
    })
  })

  describe('config/create for pcloud', () => {
    it('should fail without parameters', () => {
      const result = rpc('config/create', {
        name: 'test-pcloud',
        type: 'pcloud',
      })

      console.log('config/create without parameters:', JSON.stringify(result, null, 2))
      expect(result.status).not.toBe(200)
    })

    it('should show what parameters are expected with empty parameters', () => {
      const result = rpc('config/create', {
        name: 'test-pcloud',
        type: 'pcloud',
        parameters: {},
      })

      console.log('config/create with empty parameters:', JSON.stringify(result, null, 2))
    })

    it('should show what _config does', () => {
      const result = rpc('config/create', {
        name: 'test-pcloud',
        type: 'pcloud',
        parameters: {},
        _config: {},
      })

      console.log('config/create with _config:', JSON.stringify(result, null, 2))
    })
  })

  describe('rc/list', () => {
    it('should list all available RC commands', () => {
      const result = rpc('rc/list', {})

      expect(result.status).toBe(200)
      console.log('Available RC commands:', JSON.stringify(result.output, null, 2))
    })
  })

  describe('cleanup', () => {
    it('should delete test remote if it exists', () => {
      rpc('config/delete', { name: 'test-pcloud' })
    })
  })
})
