'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '../hooks/use-auth.js'

/**
 * Restores auth session on mount — syncs persisted token to client.
 * Rendered internally by WhaleProvider.
 */
export function AuthInitializer() {
  const { restoreSession } = useAuth()
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    restoreSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
