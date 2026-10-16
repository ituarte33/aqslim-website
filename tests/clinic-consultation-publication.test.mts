import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLINIC_CONSULTATION_PUBLICATION_CONFIRMATION,
  buildClinicLiveConsultationFields,
  clinicConsultationPublicationIsConfirmed,
  clinicConsultationPublicationMarker,
  clinicConsultationPublicationNote,
  clinicConsultationWeightKg,
  clinicPublishedConsultationId,
  clinicPublishedPreviewKey,
} from '../lib/clinic-consultation-publication.ts'

test('requires the exact consultation publication confirmation', () => {
  assert.equal(clinicConsultationPublicationIsConfirmed(CLINIC_CONSULTATION_PUBLICATION_CONFIRMATION), true)
  assert.equal(clinicConsultationPublicationIsConfirmed('publicar consulta'), false)
  assert.equal(clinicConsultationPublicationIsConfirmed(true), false)
})

test('converts pounds to kilograms and preserves kilograms', () => {
  assert.equal(clinicConsultationWeightKg(184.5, 'lb'), 83.69)
  assert.equal(clinicConsultationWeightKg(83.7, 'kg'), 83.7)
  assert.equal(clinicConsultationWeightKg('', 'lb'), null)
})

test('stores and reads the live consultation id in the Preview audit key', () => {
  const key = clinicPublishedPreviewKey('recPATIENT123456:1234', 'recLIVE1234567890')
  assert.equal(key, 'recPATIENT123456:1234:published:recLIVE1234567890')
  assert.equal(clinicPublishedConsultationId(key), 'recLIVE1234567890')
  assert.equal(clinicPublishedPreviewKey(key, 'recLIVE0987654321'), 'recPATIENT123456:1234:published:recLIVE0987654321')
})

test('builds a searchable clinical provenance note without losing useful context', () => {
  const note = clinicConsultationPublicationNote({
    previewRecordId: 'recPREVIEW1234567',
    phase: 'Jing',
    phaseWeek: 3,
    consultationFee: 40,
    amountCollected: 35,
  })
  assert.match(note, new RegExp(clinicConsultationPublicationMarker('recPREVIEW1234567')))
  assert.match(note, /Jing · semana 3/)
  assert.match(note, /\$40\.00 · monto cobrado: \$35\.00/)
})

test('maps Preview values to the live clinical schema without treating the scheduled fee as revenue', () => {
  const { fields, weightKg, amountCollected } = buildClinicLiveConsultationFields({
    patientId: 'recPATIENT123456',
    previewRecordId: 'recPREVIEW1234567',
    consultationDate: '2026-10-14',
    consultationType: 'Cliente subsecuente',
    weight: 184.5,
    weightUnit: 'lb',
    bodyFat: 28.4,
    waistCm: 101,
    phase: 'Jing',
    phaseWeek: 3,
    recommendations: '  Continuar con el plan.  ',
    consultationFee: 40,
    amountCollected: 35,
    paymentMethod: 'Card',
  })
  assert.equal(weightKg, 83.69)
  assert.equal(amountCollected, 35)
  assert.deepEqual(fields['ID Cliente'], ['recPATIENT123456'])
  assert.equal(fields['Peso (kg)'], 83.69)
  assert.equal(fields['% Grasa Corporal'], 28.4)
  assert.equal(fields['Cintura (cm)'], 101)
  assert.equal(fields['Recomendaciones al Cliente'], 'Continuar con el plan.')
  assert.equal(fields['Método de Pago'], 'Card')
  assert.equal(fields['Monto Cobrado ($)'], 35)
  assert.equal(fields['Consulta Cobrado ($)'], 35)
})
