import 'server-only'
import { createHash } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { PRIVATE_JING_GUIDE } from './private-phase-guide-policy.ts'

// An unconnected project has no access, even with this non-secret resource ID.
const STORE_ID = 'store_kTNpZ9VqPWx4ByUt'
const blobOptions = { access: 'private' as const, storeId: STORE_ID }

export function isApprovedJingPdf(bytes: Uint8Array) {
  return bytes.length > 5 && bytes.length <= PRIVATE_JING_GUIDE.maxBytes
    && Buffer.from(bytes.subarray(0, 5)).toString('ascii') === '%PDF-'
    && createHash('sha256').update(bytes).digest('hex') === PRIVATE_JING_GUIDE.sha256
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
      if (size > PRIVATE_JING_GUIDE.maxBytes) {
        await reader.cancel()
        throw new Error('INVALID_GUIDE')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

export async function readPrivateJingPdf(): Promise<Buffer | null> {
  const result = await get(PRIVATE_JING_GUIDE.pathname, blobOptions)
  if (!result) return null
  if (result.statusCode !== 200) throw new Error('GUIDE_UNAVAILABLE')
  const bytes = await readBoundedGuideBody(result.stream)
  if (!isApprovedJingPdf(bytes)) throw new Error('GUIDE_UNAVAILABLE')
  return bytes
}

export async function importPrivateJingPdf(bytes: Uint8Array) {
  if (!isApprovedJingPdf(bytes)) throw new Error('INVALID_GUIDE')
  if (await readPrivateJingPdf()) return
  await put(PRIVATE_JING_GUIDE.pathname, Buffer.from(bytes), {
    ...blobOptions, addRandomSuffix: false, allowOverwrite: false, contentType: 'application/pdf',
  })
  const verified = await readPrivateJingPdf()
  if (!verified) throw new Error('GUIDE_UNAVAILABLE')
}
