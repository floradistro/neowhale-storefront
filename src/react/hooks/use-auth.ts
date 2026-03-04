'use client'

import { useContext } from 'react'
import { useStore } from 'zustand'
import { WhaleContext } from '../context.js'

export function useAuth() {
  const ctx = useContext(WhaleContext)
  if (!ctx) throw new Error('useAuth must be used within <WhaleProvider>')

  return useStore(ctx.authStore, (s) => ({
    customer: s.customer,
    authLoading: s.authLoading,
    sessionToken: s.sessionToken,
    isAuthenticated: s.isSessionValid(),
    sendCode: s.sendOTP,
    verifyCode: s.verifyOTP,
    restoreSession: s.restoreSession,
    logout: s.logout,
    fetchCustomer: s.fetchCustomer,
  }))
}
