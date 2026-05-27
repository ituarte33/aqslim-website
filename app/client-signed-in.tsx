'use client'

import { useAuth } from '@clerk/nextjs'

export function ClientSignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth()
  if (!isSignedIn) return null
  return <>{children}</>
}
