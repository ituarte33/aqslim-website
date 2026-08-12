'use client'

import { ClerkProvider } from '@clerk/nextjs'
import type { LocalizationResource } from '@clerk/types'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Language = 'es' | 'en'

const spanishLocalization: LocalizationResource = {
  locale: 'es-MX',
  socialButtonsBlockButton: 'Continuar con {{provider|titleize}}',
  dividerText: 'o',
  formFieldLabel__emailAddress: 'Correo electrónico',
  formFieldLabel__emailAddress_username: 'Correo electrónico',
  formFieldLabel__password: 'Contraseña',
  formFieldInputPlaceholder__emailAddress: 'Ingresa tu correo electrónico',
  formFieldInputPlaceholder__emailAddress_username: 'Ingresa tu correo electrónico',
  formButtonPrimary: 'Continuar',
  formButtonPrimary__verify: 'Verificar',
  backButton: 'Regresar',
  footerActionLink__useAnotherMethod: 'Usar otro método',
  signIn: {
    start: {
      title: 'Inicia sesión',
      titleCombined: 'Continúa a {{applicationName}}',
      subtitle: 'para continuar a My AQSLIM',
      subtitleCombined: 'para continuar a My AQSLIM',
      actionText: '¿No tienes una cuenta?',
      actionLink: 'Crear cuenta',
    },
    emailCode: {
      title: 'Revisa tu correo',
      subtitle: 'Enviamos un código a {{identifier}}',
      formTitle: 'Código de verificación',
      resendButton: '¿No recibiste el código? Reenviar',
    },
    alternativeMethods: {
      title: 'Usar otro método',
      subtitle: 'Selecciona otra forma de iniciar sesión',
      actionLink: 'Obtener ayuda',
      actionText: '¿Necesitas ayuda?',
      blockButton__emailCode: 'Enviar código a {{identifier}}',
      blockButton__password: 'Usar contraseña',
      blockButton__passkey: 'Usar llave de acceso',
      blockButton__totp: 'Usar aplicación de autenticación',
      blockButton__backupCode: 'Usar código de respaldo',
    },
  },
}

function isLanguage(value: unknown): value is Language {
  return value === 'es' || value === 'en'
}

export function ClerkLanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [language, setLanguage] = useState<Language>('es')

  useEffect(() => {
    const storageKey = pathname.startsWith('/my-aqslim') ? 'myaq-language' : 'aqslim-lang'
    const savedLanguage = window.localStorage.getItem(storageKey)
    if (isLanguage(savedLanguage)) setLanguage(savedLanguage)

    const syncLanguage = (event: Event) => {
      const nextLanguage = (event as CustomEvent<unknown>).detail
      if (isLanguage(nextLanguage)) setLanguage(nextLanguage)
    }

    window.addEventListener('aqslim-lang', syncLanguage)
    return () => window.removeEventListener('aqslim-lang', syncLanguage)
  }, [pathname])

  return (
    <ClerkProvider
      afterSignOutUrl="/signed-out"
      localization={language === 'es' ? spanishLocalization : undefined}
    >
      {children}
    </ClerkProvider>
  )
}
