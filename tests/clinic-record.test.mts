import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildClinicRecordSnapshot, visibleClinicTherapistNotes } from '../lib/clinic-record.ts'
import { isLiveClinicConsultationType } from '../lib/clinic-consultation-publication.ts'

test('the Clinic record snapshot exposes legacy clinical continuity without publication metadata', () => {
  const snapshot = buildClinicRecordSnapshot({
    patient: {
      id: 'rec12345678901234',
      fields: {
        'Nombre Completo': 'Paciente Prueba',
        'Edad': 52,
        'Estatura (cm)': 170,
        'Peso Meta': 175,
        'Unidad de Peso': 'lb',
        'Condiciones Especiales / Alergias': 'Alergia de prueba',
      },
    },
    consultations: [{
      id: 'recABCDEFGHIJKLMN',
      fields: {
        'Fecha Consulta': '2026-10-14',
        'Tipo de Consulta': 'Cliente subsecuente',
        'Peso (kg)': 83.23,
        'Recomendaciones al Cliente': 'Continuar plan.',
        'Notas del Terapeuta': 'Origen verificado: CLINIC-PREVIEW:rec12345678901234\nNota visible.',
        'Monto Cobrado ($)': 50,
        'Consulta Cobrado ($)': 30,
        'Suplemento(s) Cobrado ($)': 20,
      },
    }],
    questionnaires: [{
      id: 'recZYXWVUTSRQPONM',
      createdTime: '2026-10-14T18:00:00.000Z',
      fields: {
        'TOTAL GENERAL': 12,
        'Nivel de toxicidad': 'Bajo',
        'Sistema Prioritarios': 'Digestivo',
      },
    }],
  })

  assert.equal(snapshot.patient.conditionsAllergies, 'Alergia de prueba')
  assert.equal(snapshot.consultations[0].therapistNotes, 'Nota visible.')
  assert.equal(snapshot.consultations[0].supplementsCollected, 20)
  assert.equal(snapshot.questionnaires[0].prioritySystem, 'Digestivo')
})

test('publication provenance is hidden even when it is the only therapist note', () => {
  assert.equal(visibleClinicTherapistNotes('Origen verificado: CLINIC-PREVIEW:rec12345678901234'), '')
})

test('only Airtable-compatible clinical visit types can be published', () => {
  assert.equal(isLiveClinicConsultationType('Cliente Nuevo'), true)
  assert.equal(isLiveClinicConsultationType('Cliente subsecuente'), true)
  assert.equal(isLiveClinicConsultationType('Cliente Re-Inicio'), true)
  assert.equal(isLiveClinicConsultationType('Seguimiento'), false)
  assert.equal(isLiveClinicConsultationType('Suplementos'), false)
})

test('Clinic Preview wires the complete read-only record separately from Preview drafts', async () => {
  const [route, preview, view] = await Promise.all([
    readFile(new URL('../app/api/preview/clinic-record/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/clinic-preview/clinic-record-view.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(route, /await requireFounder\(\)/)
  assert.match(route, /getConsultasByPatientId/)
  assert.match(route, /getCuestionariosByCliente/)
  assert.match(route, /readOnly: true/)
  assert.match(preview, /\/api\/preview\/clinic-record\?patientId=/)
  assert.match(preview, /Expediente clínico completo/)
  assert.match(preview, /Borradores y registros Preview/)
  assert.match(view, /Condiciones especiales \/ alergias/)
  assert.match(view, /Historial clínico real/)
  assert.match(view, /Cuestionarios de síntomas/)
})

test('Seguimiento remains in notes but is removed from consultation creation and publication', async () => {
  const [route, preview] = await Promise.all([
    readFile(new URL('../app/api/preview/clinic-consultations/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(route, /isLiveClinicConsultationType\(consultationType\)/)
  assert.doesNotMatch(route, /const allowedTypes = \[[^\]]*'Seguimiento'/)
  const consultationSelect = preview.match(/<select value=\{consultationType\}[\s\S]*?<\/select>/)?.[0] ?? ''
  assert.match(consultationSelect, /<option>Cliente Re-Inicio<\/option>/)
  assert.doesNotMatch(consultationSelect, /<option>Seguimiento<\/option>/)
  assert.match(preview, /Los seguimientos sin consulta se registran en Notas o Seguimiento/)
})
