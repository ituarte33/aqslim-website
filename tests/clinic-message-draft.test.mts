import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeClinicMessageDraft,
  encodeClinicMessageDraft,
} from '../lib/clinic-message-draft.ts'

test('Clinic message draft metadata round-trips safely', () => {
  const encoded = encodeClinicMessageDraft({
    channel: 'SMS',
    purpose: 'Seguimiento',
    status: 'Borrador',
    subject: '',
    body: 'Hola, este texto todavía no se envía.',
  })
  assert.deepEqual(decodeClinicMessageDraft(encoded), {
    channel: 'SMS',
    purpose: 'Seguimiento',
    status: 'Borrador',
    subject: '',
    body: 'Hola, este texto todavía no se envía.',
  })
})

test('Clinic message decoder fails closed for normal or invalid notes', () => {
  assert.equal(decodeClinicMessageDraft('Nota clínica normal'), null)
  assert.equal(decodeClinicMessageDraft('AQSLIM_MESSAGE_DRAFT_V1:{invalid'), null)
  assert.equal(decodeClinicMessageDraft('AQSLIM_MESSAGE_DRAFT_V1:{"channel":"Fax","purpose":"General","status":"Borrador","subject":"","body":"Hola"}'), null)
  assert.equal(decodeClinicMessageDraft('AQSLIM_MESSAGE_DRAFT_V1:{"channel":"SMS","purpose":"General","status":"Enviado","subject":"","body":"Hola"}'), null)
})
