import 'server-only'
import { createHash } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { PRIVATE_GUIDE_MAX_BYTES, type PrivatePhaseGuide } from './private-phase-guide-policy.ts'

// An unconnected project has no access, even with this non-secret resource ID.
const STORE_ID = 'store_kTNpZ9VqPWx4ByUt'
const blobOptions = { access: 'private' as const, storeId: STORE_ID }

export function isApprovedGuidePdf(guide: PrivatePhaseGuide, bytes: Uint8Array) {
  return bytes.length > 5 && bytes.length <= PRIVATE_GUIDE_MAX_BYTES
    && Buffer.from(bytes.subarray(0, 5)).toString('ascii') === '%PDF-'
    && createHash('sha256').update(bytes).digest('hex') === guide.sha256
}

export async function readBoundedGuideBody(body: ReadableStream<Uint8Array> | null) {
  if (!body) throw new Error('INVALID_GUIDE')
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > PRIVATE_GUIDE_MAX_BYTES) {
        await reader.cancel()
        throw new Error('INVALID_GUIDE')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

export async function readPrivatePhasePdf(guide: PrivatePhaseGuide): Promise<Buffer | null> {
  const result = await get(guide.pathname, blobOptions)
  if (!result) return null
  if (result.statusCode !== 200) throw new Error('GUIDE_UNAVAILABLE')
  const bytes = await readBoundedGuideBody(result.stream)
  if (!isApprovedGuidePdf(guide, bytes)) throw new Error('GUIDE_UNAVAILABLE')
  return bytes
}

export async function importPrivatePhasePdf(guide: PrivatePhaseGuide, bytes: Uint8Array) {
  if (!isApprovedGuidePdf(guide, bytes)) throw new Error('INVALID_GUIDE')
  if (await readPrivatePhasePdf(guide)) return
  await put(guide.pathname, Buffer.from(bytes), {
    ...blobOptions, addRandomSuffix: false, allowOverwrite: false, contentType: 'application/pdf',
  })
  const verified = await readPrivatePhasePdf(guide)
  if (!verified) throw new Error('GUIDE_UNAVAILABLE')
}
