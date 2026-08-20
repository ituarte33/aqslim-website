import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My AQSLIM',
    short_name: 'My AQSLIM',
    description: 'Tu portal personal y acompañamiento AQSLIM.',
    start_url: '/my-aqslim/welcome',
    scope: '/',
    display: 'standalone',
    background_color: '#161513',
    theme_color: '#161513',
    icons: [
      {
        src: '/icons/myaqslim-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/myaqslim-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/myaqslim-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
