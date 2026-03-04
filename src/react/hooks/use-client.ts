'use client'

import { useContext } from 'react'
import { WhaleContext } from '../context.js'
import type { WhaleClient } from '../../client.js'

export function useWhaleClient(): WhaleClient {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useWhaleClient must be used within <WhaleProvider>')
  return ctx.client
}
