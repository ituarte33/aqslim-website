'use client'

import { useEffect } from 'react'

export function HomeScripts() {
  // Add synchronously before first paint to avoid cursor flash
  if (typeof document !== 'undefined') {
    document.body.classList.add('marketing')
  }

  useEffect(() => {
    document.body.classList.add('marketing')

    // Custom cursor
    const dotEl = document.getElementById('cursorDot')?.firstElementChild as HTMLElement | null
    const ringEl = document.getElementById('cursorRing')?.firstElementChild as HTMLElement | null
    let mx = 0, my = 0, rx = 0, ry = 0
    let running = true

    function onMouseMove(e: MouseEvent) {
      mx = e.clientX; my = e.clientY
      if (dotEl) { dotEl.style.left = mx + 'px'; dotEl.style.top = my + 'px' }
    }
    function animRing() {
      if (!running) return
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12
      if (ringEl) { ringEl.style.left = rx + 'px'; ringEl.style.top = ry + 'px' }
      requestAnimationFrame(animRing)
    }
    document.addEventListener('mousemove', onMouseMove)
    animRing()

    // Language toggle
    function setLang(lang: string) {
      document.body.className = 'lang-' + lang + ' marketing'
      document.getElementById('btn-es')?.classList.toggle('active', lang === 'es')
      document.getElementById('btn-en')?.classList.toggle('active', lang === 'en')
      document.documentElement.lang = lang
      const msg = document.getElementById('message') as HTMLTextAreaElement | null
      if (msg) msg.placeholder = lang === 'es' ? 'Cuéntanos sobre tus metas de salud...' : 'Tell us about your health goals...'
    }
    document.getElementById('btn-es')?.addEventListener('click', () => setLang('es'))
    document.getElementById('btn-en')?.addEventListener('click', () => setLang('en'))

    // Mobile menu
    function closeMenu() {
      document.getElementById('mobile-menu')?.classList.remove('open')
      document.getElementById('hamburger')?.classList.remove('open')
    }
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('mobile-menu')?.classList.toggle('open')
      document.getElementById('hamburger')?.classList.toggle('open')
    })
    document.querySelectorAll('#mobile-menu a').forEach(a => a.addEventListener('click', closeMenu))

    // Scroll reveal — immediately show elements already in the viewport (fixes after-navigation blank hero)
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal, .reveal-left').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect()
      if (rect.top < window.innerHeight) el.classList.add('visible')
      else obs.observe(el)
    })

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault()
        closeMenu()
        const href = a.getAttribute('href')
        if (href && href !== '#') {
          document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
        }
      })
    })

    // Contact form
    document.getElementById('form-btn')?.addEventListener('click', async (e) => {
      e.preventDefault()
      const get = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
      const name = (get('name') as HTMLInputElement)?.value.trim() ?? ''
      const email = (get('email') as HTMLInputElement)?.value.trim() ?? ''
      const isEs = document.body.classList.contains('lang-es')

      if (!name || !email) {
        alert(isEs ? 'Por favor completa nombre y email.' : 'Please fill in your name and email.')
        return
      }

      const btn = document.getElementById('form-btn') as HTMLButtonElement | null
      const successEl = document.getElementById('form-success') as HTMLElement | null
      const errorEl = document.getElementById('form-error') as HTMLElement | null

      if (btn) { btn.disabled = true; btn.style.opacity = '0.6' }
      if (errorEl) errorEl.style.display = 'none'

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email,
            phone: (get('phone') as HTMLInputElement)?.value ?? '',
            service: (get('service') as HTMLSelectElement)?.value ?? '',
            message: (get('message') as HTMLTextAreaElement)?.value ?? '',
          }),
        })
        if (res.ok) {
          if (successEl) successEl.style.display = 'block'
          ;['name', 'email', 'phone', 'service', 'message'].forEach(id => {
            const el = get(id)
            if (el) el.value = ''
          })
        } else {
          if (errorEl) errorEl.style.display = 'block'
        }
      } catch (_) {
        if (errorEl) errorEl.style.display = 'block'
      } finally {
        if (btn) { btn.disabled = false; btn.style.opacity = '1' }
      }
    })

    return () => {
      running = false
      document.removeEventListener('mousemove', onMouseMove)
      document.body.classList.remove('marketing')
      obs.disconnect()
    }
  }, [])

  return null
}
