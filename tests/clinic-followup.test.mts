import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clinicFollowupIsPending,
  decodeClinicFollowup,
  encodeClinicFollowup,
} from '../lib/clinic-followup.ts'

test('Clinic follow-up metadata round-trips safely', () => {
  const encoded = encodeClinicFollowup({ action: 'Confirmar próxima cita', priority: 'Alta', status: 'Pendiente' })
  assert.deepEqual(decodeClinicFollowup(encoded), {
    action: 'Confirmar próxima cita',
    priority: 'Alta',
    status: 'Pendiente',
  })
  assert.equal(decodeClinicFollowup('Nota clínica normal'), null)
  assert.equal(decodeClinicFollowup('AQSLIM_FOLLOWUP_V1:{invalid'), null)
})

test('Only completed Clinic follow-ups are closed', () => {
  assert.equal(clinicFollowupIsPending('Pendiente'), true)
  assert.equal(clinicFollowupIsPending('En progreso'), true)
  assert.equal(clinicFollowupIsPending('Completado'), false)
})
