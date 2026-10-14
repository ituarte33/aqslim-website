'use client'

import type { ReactNode } from 'react'

export type ClinicLiveConsultation = {
  id: string
  source: 'clinic'
  consultationDate: string | null
  consultationType: string
  weightKg: number | null
  bodyFat: number | null
  bmi: number | null
  waistCm: number | null
  hipsCm: number | null
  armsCm: number | null
  thighsCm: number | null
  chestCm: number | null
  dietCompliance: number | null
  feeling: number | null
  energy: string
  sleep: string
  anxiety: boolean | null
  hunger: boolean | null
  recommendations: string
  therapistNotes: string
  nextAppointment: string | null
  paymentMethod: string
  totalCollected: number | null
  consultationCollected: number | null
  supplementsCollected: number | null
  shippingCollected: number | null
}

export type ClinicQuestionnaire = {
  id: string
  source: 'clinic'
  recordedAt: string | null
  total: number | null
  toxicityLevel: string
  prioritySystem: string
  secondarySystem: string
  protocol: string
  observations: string
}

export type ClinicRecord = {
  patient: {
    id: string
    birthDate: string
    age: number | null
    sex: string
    heightCm: number | null
    goalWeight: number | null
    weightUnit: string
    conditionsAllergies: string
  }
  consultations: ClinicLiveConsultation[]
  questionnaires: ClinicQuestionnaire[]
}

function value(value: string | number | null, suffix = '') {
  return value === '' || value === null ? 'No registrado' : `${value}${suffix}`
}

function yesNo(value: boolean | null) {
  return value === null ? '' : value ? 'Sí' : 'No'
}

function money(value: number | null) {
  return value === null ? '' : `$${value.toFixed(2)}`
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div>
    <div style={{ color: '#6F6A64', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ color: '#D9D5CF', fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{children}</div>
  </div>
}

export function ClinicRecordView({ record, loading, error }: { record: ClinicRecord | null; loading: boolean; error: string }) {
  if (loading) return <div style={{ padding: '18px 0', color: '#9A9590' }}>Cargando expediente clínico real…</div>
  if (error) return <div style={{ padding: 13, border: '1px solid rgba(224,160,160,.3)', borderRadius: 10, color: '#E0A0A0', lineHeight: 1.5 }}>{error}</div>
  if (!record) return null

  const clinicalNotes = record.consultations.filter(item => item.recommendations || item.therapistNotes)

  return <div style={{ display: 'grid', gap: 16 }}>
    <section style={{ border: '1px solid rgba(201,168,76,.24)', borderRadius: 12, padding: 16, background: 'rgba(201,168,76,.035)' }}>
      <div className="clinic-record-section-heading" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#C9A84C', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase' }}>Datos clínicos</div>
          <div style={{ color: '#77716A', fontSize: 10, marginTop: 5 }}>Expediente real · sólo lectura</div>
        </div>
        <span style={{ color: record.patient.conditionsAllergies ? '#E2C87A' : '#77716A', fontSize: 10 }}>{record.patient.conditionsAllergies ? 'Información clínica registrada' : 'Sin condiciones o alergias registradas'}</span>
      </div>
      <div className="clinic-record-profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginTop: 14 }}>
        <Detail label="Edad / nacimiento">{record.patient.age !== null ? `${record.patient.age} años` : value(record.patient.birthDate)}</Detail>
        <Detail label="Sexo">{value(record.patient.sex)}</Detail>
        <Detail label="Estatura">{value(record.patient.heightCm, ' cm')}</Detail>
        <Detail label="Peso meta">{record.patient.goalWeight === null ? 'No registrado' : `${record.patient.goalWeight} ${record.patient.weightUnit || ''}`.trim()}</Detail>
      </div>
      <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <Detail label="Condiciones especiales / alergias"><span style={{ color: record.patient.conditionsAllergies ? '#FAFAF8' : '#8E8881', whiteSpace: 'pre-wrap' }}>{record.patient.conditionsAllergies || 'No hay información registrada en este campo.'}</span></Detail>
      </div>
    </section>

    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400 }}>Historial clínico real</h4>
          <div style={{ color: '#77716A', fontSize: 10, marginTop: 4 }}>No se puede editar desde esta candidata.</div>
        </div>
        <span style={{ color: '#8E8881', fontSize: 11 }}>{record.consultations.length} consultas</span>
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {record.consultations.length === 0 ? <div style={{ color: '#9A9590' }}>Sin consultas en el expediente real.</div> : record.consultations.map(item => {
          const measurements = [
            item.weightKg !== null ? `Peso ${item.weightKg.toFixed(2)} kg` : '',
            item.bodyFat !== null ? `Grasa ${item.bodyFat}%` : '',
            item.bmi !== null ? `IMC ${item.bmi}` : '',
            item.waistCm !== null ? `Cintura ${item.waistCm} cm` : '',
            item.hipsCm !== null ? `Cadera ${item.hipsCm} cm` : '',
            item.armsCm !== null ? `Brazos ${item.armsCm} cm` : '',
            item.thighsCm !== null ? `Muslos ${item.thighsCm} cm` : '',
            item.chestCm !== null ? `Pecho/Busto ${item.chestCm} cm` : '',
          ].filter(Boolean)
          const wellness = [
            item.dietCompliance !== null ? `Cumplimiento ${item.dietCompliance}/10` : '',
            item.feeling !== null ? `Cómo se siente ${item.feeling}/10` : '',
            item.energy ? `Energía: ${item.energy}` : '',
            item.sleep ? `Sueño: ${item.sleep}` : '',
            item.anxiety !== null ? `Ansiedad: ${yesNo(item.anxiety)}` : '',
            item.hunger !== null ? `Hambre: ${yesNo(item.hunger)}` : '',
          ].filter(Boolean)
          const financial = [
            item.totalCollected !== null ? `Total ${money(item.totalCollected)}` : '',
            item.consultationCollected !== null ? `Consulta ${money(item.consultationCollected)}` : '',
            item.supplementsCollected !== null ? `Suplementos ${money(item.supplementsCollected)}` : '',
            item.shippingCollected !== null ? `Envío ${money(item.shippingCollected)}` : '',
            item.paymentMethod,
          ].filter(Boolean)
          return <article key={item.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 11, padding: 14, background: 'rgba(255,255,255,.018)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><strong style={{ color: '#FAFAF8', fontSize: 12 }}>{item.consultationType || 'Consulta'}</strong><span style={{ color: '#9ED4A8', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em' }}>Expediente real</span></div>
              <span style={{ color: '#8E8881', fontSize: 11 }}>{item.consultationDate || 'Sin fecha'}</span>
            </div>
            {measurements.length > 0 && <div style={{ color: '#D9D5CF', fontSize: 11, lineHeight: 1.55, marginTop: 9 }}>{measurements.join(' · ')}</div>}
            {wellness.length > 0 && <div style={{ color: '#9A9590', fontSize: 11, lineHeight: 1.55, marginTop: 7 }}>{wellness.join(' · ')}</div>}
            {(item.recommendations || item.therapistNotes) && <div style={{ display: 'grid', gap: 9, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              {item.recommendations && <Detail label="Recomendaciones"><span style={{ whiteSpace: 'pre-wrap' }}>{item.recommendations}</span></Detail>}
              {item.therapistNotes && <Detail label="Notas del terapeuta"><span style={{ whiteSpace: 'pre-wrap' }}>{item.therapistNotes}</span></Detail>}
            </div>}
            {financial.length > 0 && <div style={{ color: '#77716A', fontSize: 10, lineHeight: 1.5, marginTop: 9 }}>{financial.join(' · ')}</div>}
          </article>
        })}
      </div>
    </section>

    <section style={{ borderTop: '1px solid rgba(201,168,76,.18)', paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 400 }}>Cuestionarios de síntomas</h4>
        <span style={{ color: '#8E8881', fontSize: 11 }}>{record.questionnaires.length} cuestionarios</span>
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {record.questionnaires.length === 0 ? <div style={{ color: '#9A9590' }}>Sin cuestionarios registrados.</div> : record.questionnaires.map(item => <article key={item.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 11, padding: 14, background: 'rgba(255,255,255,.018)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong style={{ color: '#E2C87A', fontSize: 12 }}>Total: {item.total ?? '—'}</strong><span style={{ color: '#8E8881', fontSize: 11 }}>{item.recordedAt ? new Date(item.recordedAt).toLocaleDateString('es-US') : 'Sin fecha'}</span></div>
          <div className="clinic-record-questionnaire-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 11 }}>
            <Detail label="Nivel de toxicidad">{value(item.toxicityLevel)}</Detail>
            <Detail label="Sistema prioritario">{value(item.prioritySystem)}</Detail>
            <Detail label="Sistema secundario">{value(item.secondarySystem)}</Detail>
            <Detail label="Protocolo">{value(item.protocol)}</Detail>
          </div>
          {item.observations && <div style={{ marginTop: 10 }}><Detail label="Observaciones"><span style={{ whiteSpace: 'pre-wrap' }}>{item.observations}</span></Detail></div>}
        </article>)}
      </div>
      {clinicalNotes.length > 0 && <div style={{ color: '#77716A', fontSize: 10, marginTop: 10 }}>{clinicalNotes.length} consulta{clinicalNotes.length === 1 ? '' : 's'} con recomendaciones o notas clínicas visibles arriba.</div>}
    </section>
  </div>
}
