'use client'

import { useEffect, useRef } from 'react'

export function HomeContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.classList.add('marketing')

    if (!ref.current) return
    const root = ref.current

    // Custom cursor
    const dotEl = root.querySelector<HTMLElement>('#cursorDot > *')
    const ringEl = root.querySelector<HTMLElement>('#cursorRing > *')
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
    const LANG_KEY = 'aqslim-lang'
    function setLang(lang: string) {
      localStorage.setItem(LANG_KEY, lang)
      document.body.className = 'lang-' + lang + ' marketing'
      root.querySelector('#btn-es')?.classList.toggle('active', lang === 'es')
      root.querySelector('#btn-en')?.classList.toggle('active', lang === 'en')
      document.documentElement.lang = lang
      const msg = root.querySelector<HTMLTextAreaElement>('#message')
      if (msg) msg.placeholder = lang === 'es' ? 'Cuéntanos sobre tus metas de salud...' : 'Tell us about your health goals...'
    }
    // Apply saved preference on init
    const savedLang = localStorage.getItem(LANG_KEY) ?? 'es'
    setLang(savedLang)
    root.querySelector('#btn-es')?.addEventListener('click', () => setLang('es'))
    root.querySelector('#btn-en')?.addEventListener('click', () => setLang('en'))
    // Sync when modal fires
    function onModalLang(e: Event) { setLang((e as CustomEvent<string>).detail) }
    window.addEventListener('aqslim-lang', onModalLang)

    // Mobile menu
    function closeMenu() {
      root.querySelector('#mobile-menu')?.classList.remove('open')
      root.querySelector('#hamburger')?.classList.remove('open')
    }
    root.querySelector('#hamburger')?.addEventListener('click', () => {
      root.querySelector('#mobile-menu')?.classList.toggle('open')
      root.querySelector('#hamburger')?.classList.toggle('open')
    })
    root.querySelectorAll('#mobile-menu a').forEach(a => a.addEventListener('click', closeMenu))

    // Scroll reveal
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    )
    root.querySelectorAll('.reveal, .reveal-left').forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect()
      if (rect.top < window.innerHeight) el.classList.add('visible')
      else obs.observe(el)
    })

    // Smooth scroll
    root.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault()
        closeMenu()
        const href = a.getAttribute('href')
        if (href && href !== '#') document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      })
    })

    // Contact form
    root.querySelector('#form-btn')?.addEventListener('click', async (e) => {
      e.preventDefault()
      const get = (id: string) => root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('#' + id)
      const name = get('name')?.value.trim() ?? ''
      const email = get('email')?.value.trim() ?? ''
      const isEs = document.body.classList.contains('lang-es')

      if (!name || !email) {
        alert(isEs ? 'Por favor completa nombre y email.' : 'Please fill in your name and email.')
        return
      }

      const btn = root.querySelector<HTMLButtonElement>('#form-btn')
      const successEl = root.querySelector<HTMLElement>('#form-success')
      const errorEl = root.querySelector<HTMLElement>('#form-error')

      if (btn) { btn.disabled = true; btn.style.opacity = '0.6' }
      if (errorEl) errorEl.style.display = 'none'

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email,
            phone: get('phone')?.value ?? '',
            service: get('service')?.value ?? '',
            message: get('message')?.value ?? '',
          }),
        })
        if (res.ok) {
          if (successEl) successEl.style.display = 'block'
          ;['name', 'email', 'phone', 'service', 'message'].forEach(id => {
            const el = get(id); if (el) el.value = ''
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
      window.removeEventListener('aqslim-lang', onModalLang)
      document.body.classList.remove('marketing')
      obs.disconnect()
    }
  }, [])


  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
