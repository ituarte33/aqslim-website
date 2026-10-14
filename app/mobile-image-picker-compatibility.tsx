'use client'

import { useEffect } from 'react'

const SUPPORTED_PATH_PREFIXES = ['/my-aqslim', '/food-scanner']

export function MobileImagePickerCompatibility() {
  useEffect(() => {
    if (!SUPPORTED_PATH_PREFIXES.some(prefix => window.location.pathname.startsWith(prefix))) return

    const enableNativeImagePicker = () => {
      document.querySelectorAll<HTMLInputElement>('input[type="file"][capture]').forEach(input => {
        if (input.accept.includes('image')) input.removeAttribute('capture')
      })
    }

    enableNativeImagePicker()

    const observer = new MutationObserver(enableNativeImagePicker)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
