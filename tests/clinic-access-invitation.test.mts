import assert from 'node:assert/strict'
import test from 'node:test'
import { buildClinicAccessInvitationDraft } from '../lib/clinic-access-invitation.ts'
import { decodeClinicMessageDraft, encodeClinicMessageDraft } from '../lib/clinic-message-draft.ts'

test('builds the patient access invitation in Spanish by default', () => {
  const draft = buildClinicAccessInvitationDraft({ patientName: 'Paciente Prueba', preferredLanguage: 'Español' })
  assert.equal(draft.language, 'es')
  assert.match(draft.subject, /My AQSLIM/)
  assert.match(draft.body, /Hola Paciente Prueba/)
  assert.match(draft.body, /instrucciones de activación/)
})

test('builds the patient access invitation in English when preferred', () => {
  const draft = buildClinicAccessInvitationDraft({ patientName: 'Test Patient', preferredLanguage: 'English' })
  assert.equal(draft.language, 'en')
  assert.match(draft.body, /Hello Test Patient/)
  assert.match(draft.body, /activation instructions/)
})

test('access invitations round-trip as internal message drafts', () => {
  const encoded = encodeClinicMessageDraft({
    channel: 'Email',
    purpose: 'Acceso',
    status: 'Borrador',
    subject: 'Tu acceso a My AQSLIM',
    body: 'Texto interno todavía no enviado.',
  })
  assert.equal(decodeClinicMessageDraft(encoded)?.purpose, 'Acceso')
})
