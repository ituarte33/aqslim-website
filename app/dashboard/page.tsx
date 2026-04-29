import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { getClientes } from '@/lib/airtable'
import { PatientsTable } from './patients-table'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()

  let patients = await getClientes().catch(() => [])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)',
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
          <span style={{ fontSize: 11, color: '#9A9590', marginLeft: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
            Portal
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#9A9590' }}>{user?.firstName} {user?.lastName}</span>
          <UserButton />
        </div>
      </nav>

      {/* Content */}
      <main style={{ padding: '48px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400 }}>
            Pacientes
          </h1>
          <span style={{ fontSize: 13, color: '#9A9590' }}>
            {patients.length} registros
          </span>
        </div>

        <PatientsTable patients={patients} />
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
