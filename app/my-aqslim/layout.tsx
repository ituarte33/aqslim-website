import Link from 'next/link'
import { getActor } from '@/lib/auth'
import { portalAccessIsRestricted } from '@/lib/portal-access-policy'
import { getPortalAccessRecordByPatientRecordId } from '@/lib/preview-entitlement-store'

export default async function MyAqslimLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor()
  const entitlement = actor?.boundPatientId
    ? await getPortalAccessRecordByPatientRecordId({
        patientRecordId: actor.boundPatientId,
        canonicalSubjectId: actor.clerkUserId,
      }).catch(() => null)
    : null

  if (!portalAccessIsRestricted(entitlement?.record)) return children

  return <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, color: '#F5F2EB', background: 'radial-gradient(circle at 50% 18%, rgba(201,168,76,.12), transparent 24rem), #070807', fontFamily: 'Montserrat, sans-serif' }}>
    <section style={{ width: 'min(100%, 520px)', padding: '36px 28px', border: '1px solid rgba(201,168,76,.42)', borderRadius: 22, background: 'linear-gradient(145deg, rgba(25,26,23,.98), rgba(11,12,11,.98))', textAlign: 'center' }}>
      <div style={{ width: 58, height: 58, display: 'grid', placeItems: 'center', margin: '0 auto 22px', border: '1px solid #E2C87A', borderRadius: '50%', color: '#E2C87A', fontFamily: 'Georgia, serif', fontSize: 22 }}>AQ</div>
      <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>Acceso restringido</div>
      <h1 style={{ margin: '14px 0 12px', fontFamily: 'Georgia, serif', fontSize: 'clamp(34px, 9vw, 48px)', fontWeight: 400 }}>Tu portal está en pausa</h1>
      <p style={{ margin: 0, color: '#AAA69E', fontSize: 14, lineHeight: 1.7 }}>Tu información permanece protegida. Comunícate con AQSLIM Wellness Center si deseas reactivar tu programa y volver a entrar.</p>
      <Link href="/" style={{ minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 26, border: '1px solid #E2C87A', borderRadius: 12, color: '#16140D', background: 'linear-gradient(100deg, #AD7E18, #F2D77A, #B48622)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>VOLVER A AQSLIM</Link>
    </section>
  </main>
}
