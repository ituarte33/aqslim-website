'use client'

import Link from 'next/link'
import type { Cliente } from '@/lib/airtable'
import { patientAdministration } from '@/lib/clinic-patient-administration-policy'

export function PatientsTable({ patients, lang }: { patients: Cliente[]; lang: 'es' | 'en' }) {
  const es = lang === 'es'
  const labels = es ? ['Paciente', 'Teléfono', 'Correo', 'Estado', 'Acciones'] : ['Patient', 'Phone', 'Email', 'Status', 'Actions']
  return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
    <thead><tr>{labels.map(label => <th key={label} style={{ padding: 14, color: '#C9A84C', borderBottom: '1px solid #66552d' }}>{label}</th>)}</tr></thead>
    <tbody>{patients.map(patient => {
      const admin = patientAdministration(patient.fields['Notas Generales'])
      const active = admin.state === 'active'
      const status = es ? { active: 'Activo', archived: 'Archivado', merged: 'Unificado', merging: 'Unificación pendiente', invalid: 'Requiere revisión' }[admin.state] : admin.state
      return <tr key={patient.id} style={{ borderBottom: '1px solid #292619' }}>
        <td style={{ padding: 14 }}><Link href={`/dashboard/${patient.id}`}>{String(patient.fields['Nombre Completo'] ?? '—')}</Link></td>
        <td style={{ padding: 14 }}>{String(patient.fields['Teléfono'] ?? '—')}</td><td style={{ padding: 14 }}>{String(patient.fields.Email ?? '—')}</td><td style={{ padding: 14 }}>{status}</td>
        <td style={{ padding: 14 }}><Link href={`/dashboard/${patient.id}`}>{es ? 'Ver expediente' : 'View record'}</Link>{active && <> · <Link href={`/dashboard/consulta-subsecuente?clienteId=${patient.id}`}>{es ? 'Consulta' : 'Consultation'}</Link> · <Link href={`/dashboard/plans?clienteId=${patient.id}`}>{es ? 'Plan y guía' : 'Plan and guide'}</Link></>}{admin.targetId && <> · <Link href={`/dashboard/${admin.targetId}`}>{es ? 'Expediente principal' : 'Primary record'}</Link></>}</td>
      </tr>
    })}</tbody>
  </table>{patients.length === 0 && <p>{es ? 'No se encontraron pacientes con estos filtros.' : 'No patients match these filters.'}</p>}</div>
}
