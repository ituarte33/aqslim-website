import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isPortalLanguage,
  portalLanguageStorageKey,
} from '../app/my-aqslim/use-portal-language.ts'

test('language preferences are isolated by authenticated profile', () => {
  assert.equal(portalLanguageStorageKey('recParticipantOne'), 'myaq-language:recParticipantOne')
  assert.equal(portalLanguageStorageKey('recParticipantTwo'), 'myaq-language:recParticipantTwo')
  assert.notEqual(
    portalLanguageStorageKey('recParticipantOne'),
    portalLanguageStorageKey('recParticipantTwo'),
  )
})

test('legacy unauthenticated surfaces retain the shared language key', () => {
  assert.equal(portalLanguageStorageKey(), 'myaq-language')
})

test('only supported portal languages are accepted', () => {
  assert.equal(isPortalLanguage('es'), true)
  assert.equal(isPortalLanguage('en'), true)
  assert.equal(isPortalLanguage('fr'), false)
})
