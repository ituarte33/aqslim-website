'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Cliente } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'

function safeStr(val: unknown): string {
  if (val == null) return ''
  if (Array.isArray(val)) {
    // Linked record fields return arrays of Airtable record IDs — show count
    if (val.length > 0 && typeof val[0] === 'string' && val[0].startsWith('rec')) {
      return String(val.length)
    }
    return val.join(', ')
  }
  if (typeof val === 'object') return ''
  return String(val)
}

const PREFERRED_FIRST = ['Nombre Completo', 'ID Cliente', 'Edad']

export function PatientsTable({ patients, lang }: { patients: Cliente[]; lang: 'es' | 'en' }) {
  const router = useRouter()

  const columns = useMemo(() => {
    if (patients.length === 0) return []
    const allKeys = Array.from(new Set(patients.flatMap(p => Object.keys(p.fields))))
    const preferred = PREFERRED_FIRST.filter(k => allKeys.includes(k))
    const rest = allKeys.filter(k => !PREFERRED_FIRST.includes(k)).sort()
    return [...preferred, ...rest]
  }, [patients])

  return (
    <div>
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.base }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
              {columns.map(col => (
                <th key={col} style={{
                  textAlign: 'left', padding: '10px 16px', whiteSpace: 'nowrap',
                  fontSize: pt.xs, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/dashboard/${p.id}`)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
              >
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '12px 16px', whiteSpace: 'nowrap',
                    color: col === 'Nombre Completo' ? '#FAFAF8' : '#9A9590',
                  }}>
                    {safeStr(p.fields[col]) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {patients.length === 0 && (
        <p style={{ color: '#6A6560', fontSize: pt.base, marginTop: 32, textAlign: 'center' }}>
          {lang === 'es' ? 'No se encontraron pacientes.' : 'No patients were found.'}
        </p>
      )}
    </div>
  )
}
