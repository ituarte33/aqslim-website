'use client'

import { useState, useMemo } from 'react'
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

export function PatientsTable({ patients }: { patients: Cliente[] }) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const columns = useMemo(() => {
    if (patients.length === 0) return []
    const allKeys = Array.from(new Set(patients.flatMap(p => Object.keys(p.fields))))
    const preferred = PREFERRED_FIRST.filter(k => allKeys.includes(k))
    const rest = allKeys.filter(k => !PREFERRED_FIRST.includes(k)).sort()
    return [...preferred, ...rest]
  }, [patients])

  const filtered = useMemo(() => {
    if (!search.trim()) return patients
    const q = search.toLowerCase()
    return patients.filter(p =>
      columns.some(col => safeStr(p.fields[col]).toLowerCase().includes(q))
    )
  }, [patients, search, columns])

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 380,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#FAFAF8',
            padding: '10px 16px',
            fontSize: pt.base,
            outline: 'none',
          }}
        />
        {search && (
          <span style={{ marginLeft: 16, fontSize: pt.sm, color: '#9A9590' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

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
            {filtered.map((p, i) => (
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

      {filtered.length === 0 && (
        <p style={{ color: '#6A6560', fontSize: pt.base, marginTop: 32, textAlign: 'center' }}>
          No se encontraron resultados para &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  )
}
