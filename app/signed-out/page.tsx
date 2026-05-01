'use client'

import { useEffect } from 'react'

export default function SignedOutPage() {
  useEffect(() => {
    window.location.replace('/')
  }, [])

  return null
}
