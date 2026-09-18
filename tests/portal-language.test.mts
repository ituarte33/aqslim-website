import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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

test('portal language follows the user into shared tools without reopening the selector', async () => {
  const [portalLanguage, languageModal] = await Promise.all([
    readFile(new URL('../app/my-aqslim/use-portal-language.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/language-modal.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(portalLanguage, /SHARED_LANGUAGE_STORAGE_KEY = 'aqslim-lang'/)
  assert.match(portalLanguage, /localStorage\.setItem\(SHARED_LANGUAGE_STORAGE_KEY, language\)/)
  assert.match(portalLanguage, /localStorage\.setItem\(SHARED_LANGUAGE_STORAGE_KEY, nextLanguage\)/)
  assert.match(languageModal, /pathname\.startsWith\('\/my-aqslim'\) \|\| localStorage\.getItem\(LANG_KEY\)/)
  assert.match(languageModal, /\}, \[pathname\]\)/)
})
