import { SignIn } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'

export default function ClinicPreviewLoginPage() {
  const environment = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }

  if (!isClinicRuntimeEnvironment(environment)) redirect('/my-aqslim/login')

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0A0A0A', color: '#FAFAF8' }}>
      <section style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, letterSpacing: '.08em' }}>AQ<span style={{ color: '#C9A84C' }}>SLIM</span> Clinic</div>
          <p style={{ margin: '9px 0 0', color: '#8E8881', fontFamily: 'Montserrat, Arial, sans-serif', fontSize: 13 }}>Acceso exclusivo para personal autorizado</p>
        </div>
        <SignIn
          path="/clinic-preview/login"
          routing="path"
          forceRedirectUrl="/clinic-preview"
        />
      </section>
    </main>
  )
}
