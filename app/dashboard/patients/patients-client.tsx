'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { PatientsTable } from '../patients-table'
import type { Cliente } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'
import { fetchPatientsPage } from './actions'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  initialPatients: Cliente[]
  initialOffset: string | null
  airtableError: string | null
}

export function PatientsPageClient({ user, initialPatients, initialOffset, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [patients, setPatients] = useState(initialPatients)
  const [offset, setOffset] = useState(initialOffset)
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState<'refresh' | 'more' | null>(null)
  const [isPending, startTransition] = useTransition()
  const requestId = useRef(0)
  const initialRender = useRef(true)

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }

    const id = requestId.current
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const page = await fetchPatientsPage({ query: search })
          if (id !== requestId.current) return
          setPatients(page.records)
          setOffset(page.offset)
          setLoadError(null)
        } catch {
          if (id === requestId.current) setLoadError('refresh')
        }
      })
    }, search ? 350 : 0)

    return () => window.clearTimeout(timer)
  }, [search])

  function updateSearch(value: string) {
    requestId.current += 1
    setSearch(value)
  }

  function loadMore() {
    if (!offset || isPending) return
    const id = requestId.current
    startTransition(async () => {
      try {
        const page = await fetchPatientsPage({ offset, query: search })
        if (id !== requestId.current) return
        setPatients(current => [...current, ...page.records])
        setOffset(page.offset)
        setLoadError(null)
      } catch {
        if (id === requestId.current) setLoadError('more')
      }
    })
  }

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32, marginTop: 8 }}>
        <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400 }}>
          {lang === 'es' ? 'Pacientes' : 'Patients'}
        </h1>
        <span style={{ fontSize: pt.base, color: '#9A9590' }}>
          {patients.length} {lang === 'es' ? 'cargados' : 'loaded'}
        </span>
      </div>

      {(airtableError || loadError) && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', marginBottom: 24, fontSize: pt.base, fontFamily: 'monospace' }}>
          {airtableError || (loadError === 'more'
            ? (lang === 'es' ? 'No se pudieron cargar más pacientes.' : 'More patients could not be loaded.')
            : (lang === 'es' ? 'No se pudo actualizar la lista.' : 'The list could not be updated.'))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <input
          type="search"
          placeholder={lang === 'es' ? 'Buscar por nombre, correo o teléfono…' : 'Search by name, email, or phone…'}
          value={search}
          onChange={event => updateSearch(event.target.value)}
          style={{
            width: '100%', maxWidth: 430,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#FAFAF8',
            padding: '11px 16px',
            fontSize: pt.base,
            outline: 'none',
          }}
        />
        {isPending && <span style={{ marginLeft: 14, color: '#C9A84C', fontSize: pt.sm }}>{lang === 'es' ? 'Buscando…' : 'Searching…'}</span>}
      </div>

      <PatientsTable patients={patients} lang={lang} />

      {offset ? (
        <div style={{ display: 'grid', placeItems: 'center', marginTop: 28 }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            style={{
              minWidth: 190,
              padding: '12px 22px',
              border: '1px solid #C9A84C',
              color: isPending ? '#6A6560' : '#C9A84C',
              background: 'rgba(201,168,76,.06)',
              cursor: isPending ? 'wait' : 'pointer',
              fontFamily: pt.sans,
            }}
          >
            {isPending ? (lang === 'es' ? 'Cargando…' : 'Loading…') : (lang === 'es' ? 'Cargar más pacientes' : 'Load more patients')}
          </button>
        </div>
      ) : null}
    </DashboardShell>
  )
}
