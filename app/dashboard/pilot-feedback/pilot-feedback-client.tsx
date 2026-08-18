'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { PilotFeedbackRecord } from '@/lib/airtable'
import { FEEDBACK_CATEGORIES, FEEDBACK_TOOLS, PILOT_FEEDBACK_STATUSES } from '@/lib/pilot-feedback'
import { DashboardShell } from '../dashboard-shell'
import { updatePilotFeedbackStatusAction } from './actions'
import styles from './pilot-feedback.module.css'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  reports: PilotFeedbackRecord[]
  airtableError: string | null
}

const copy = {
  es: {
    title: 'Reportes del piloto',
    subtitle: 'Observaciones enviadas desde My AQSLIM y sus herramientas de prueba.',
    search: 'Buscar paciente, comentario o ID…',
    allStatuses: 'Todos los estados',
    allTools: 'Todas las herramientas',
    allCategories: 'Todas las categorías',
    results: 'reportes',
    empty: 'No hay reportes que coincidan con estos filtros.',
    noReports: 'Todavía no se ha enviado ningún reporte.',
    viewPatient: 'Ver expediente →',
    screenshot: 'Abrir captura',
    noComment: 'Sin comentario adicional.',
    details: 'Contexto técnico',
    responseId: 'ID de respuesta',
    save: 'Guardar estado',
  },
  en: {
    title: 'Pilot reports',
    subtitle: 'Observations sent from My AQSLIM and its pilot tools.',
    search: 'Search patient, comment, or ID…',
    allStatuses: 'All statuses',
    allTools: 'All tools',
    allCategories: 'All categories',
    results: 'reports',
    empty: 'No reports match these filters.',
    noReports: 'No reports have been submitted yet.',
    viewPatient: 'View record →',
    screenshot: 'Open screenshot',
    noComment: 'No additional comment.',
    details: 'Technical context',
    responseId: 'Response ID',
    save: 'Save status',
  },
}

function formatDate(value: string, lang: 'es' | 'en') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || '—'
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles',
  }).format(date)
}

export function PilotFeedbackClient({ user, reports, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [tool, setTool] = useState('')
  const [category, setCategory] = useState('')
  const t = copy[lang]

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(lang === 'es' ? 'es-MX' : 'en-US')
    return reports.filter(report => {
      if (status && report.status !== status) return false
      if (tool && report.tool !== tool) return false
      if (category && report.category !== category) return false
      if (!needle) return true
      return [report.patientName, report.comment, report.responseId, report.report]
        .some(value => value.toLocaleLowerCase(lang === 'es' ? 'es-MX' : 'en-US').includes(needle))
    })
  }, [category, lang, query, reports, status, tool])

  const counts = useMemo(() => ({
    total: reports.length,
    new: reports.filter(report => report.status === 'Nuevo').length,
    reviewing: reports.filter(report => report.status === 'Revisando').length,
    resolved: reports.filter(report => report.status === 'Resuelto').length,
  }), [reports])

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>MYAQ SOFT START 01</p>
          <h1>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>
        <div className={styles.summary} aria-label={lang === 'es' ? 'Resumen de reportes' : 'Report summary'}>
          <Stat value={counts.total} label={lang === 'es' ? 'Total' : 'Total'} />
          <Stat value={counts.new} label={lang === 'es' ? 'Nuevos' : 'New'} accent />
          <Stat value={counts.reviewing} label={lang === 'es' ? 'Revisando' : 'Reviewing'} />
          <Stat value={counts.resolved} label={lang === 'es' ? 'Resueltos' : 'Resolved'} />
        </div>
      </div>

      {airtableError ? <div className={styles.error}>{airtableError}</div> : null}

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <span className={styles.srOnly}>{t.search}</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search} />
        </label>
        <Filter value={status} onChange={setStatus} label={t.allStatuses} options={PILOT_FEEDBACK_STATUSES} />
        <Filter value={tool} onChange={setTool} label={t.allTools} options={FEEDBACK_TOOLS} />
        <Filter value={category} onChange={setCategory} label={t.allCategories} options={FEEDBACK_CATEGORIES} />
      </div>

      <p className={styles.resultCount}>{filtered.length} {t.results}</p>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>⚑</span>
          <p>{reports.length === 0 ? t.noReports : t.empty}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(report => (
            <article className={styles.report} key={report.id}>
              <div className={styles.reportTop}>
                <div>
                  <div className={styles.badges}>
                    <span className={report.rating === 'Problema' ? styles.problem : styles.worked}>
                      {report.rating || '—'}
                    </span>
                    <span className={styles.tool}>{report.tool || 'My AQSLIM'}</span>
                    {report.category ? <span className={styles.category}>{report.category}</span> : null}
                  </div>
                  <h2>{report.patientName}</h2>
                  <time dateTime={report.date}>{formatDate(report.date, lang)}</time>
                </div>
                <form action={updatePilotFeedbackStatusAction} className={styles.statusForm}>
                  <input type="hidden" name="recordId" value={report.id} />
                  <select name="status" defaultValue={report.status} aria-label={lang === 'es' ? 'Estado del reporte' : 'Report status'}>
                    {PILOT_FEEDBACK_STATUSES.map(option => <option key={option}>{option}</option>)}
                  </select>
                  <button type="submit">{t.save}</button>
                </form>
              </div>

              <p className={report.comment ? styles.comment : styles.noComment}>
                {report.comment || t.noComment}
              </p>

              <div className={styles.links}>
                {report.patientId ? <Link href={`/dashboard/${report.patientId}`}>{t.viewPatient}</Link> : null}
                {report.screenshots.map((screenshot, index) => (
                  <a key={screenshot.id ?? screenshot.url} href={screenshot.url} target="_blank" rel="noopener noreferrer">
                    {t.screenshot}{report.screenshots.length > 1 ? ` ${index + 1}` : ''} ↗
                  </a>
                ))}
              </div>

              {report.technicalContext || report.responseId ? (
                <details className={styles.details}>
                  <summary>{t.details}</summary>
                  {report.responseId ? <p><strong>{t.responseId}:</strong> {report.responseId}</p> : null}
                  {report.technicalContext ? <pre>{report.technicalContext}</pre> : null}
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return <div><strong className={accent ? styles.accent : ''}>{value}</strong><span>{label}</span></div>
}

function Filter({ value, onChange, label, options }: {
  value: string
  onChange: (value: string) => void
  label: string
  options: readonly string[]
}) {
  return (
    <label>
      <span className={styles.srOnly}>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        <option value="">{label}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
