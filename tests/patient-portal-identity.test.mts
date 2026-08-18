import assert from 'node:assert/strict'
import test from 'node:test'
import {
  consultationBelongsToPatient,
  filterConsultationsForPatient,
} from '../lib/patient-portal-policy.ts'

const mariaId = 'recAAAAAAAAAAAAAA'
const otherMariaId = 'recBBBBBBBBBBBBBB'

test('consultations are scoped by the linked Airtable patient record ID', () => {
  const consultations = [
    { id: 'consultation-for-maria', fields: { 'ID Cliente': [mariaId] } },
    { id: 'consultation-for-other-maria', fields: { 'ID Cliente': [otherMariaId] } },
  ]

  assert.deepEqual(
    filterConsultationsForPatient(consultations, mariaId).map(item => item.id),
    ['consultation-for-maria'],
  )
})

test('missing or malformed patient links fail closed', () => {
  assert.equal(consultationBelongsToPatient({ fields: {} }, mariaId), false)
  assert.equal(consultationBelongsToPatient({ fields: { 'ID Cliente': 'Maria' } }, mariaId), false)
  assert.equal(consultationBelongsToPatient({ fields: { 'ID Cliente': [otherMariaId] } }, mariaId), false)
})
