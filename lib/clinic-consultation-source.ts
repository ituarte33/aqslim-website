import 'server-only'

export type LinkedClinicConsultation = {
  id: string
  fields: {
    'Fecha Consulta'?: string
    'Tipo de Consulta'?: string
    'ID Cliente'?: string[]
  }
}

const CLIENTES_TABLE = 'tblek9goIGKMRJKXJ'
const CONSULTAS_TABLE = 'tblCA6HruBsrZdXbZ'

function baseUrl(): string {
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!baseId) throw new Error('AIRTABLE_BASE_ID is not configured')
  return `https://api.airtable.com/v0/${baseId}`
}

function headers(): HeadersInit {
  const pat = process.env.AIRTABLE_PAT
  if (!pat) throw new Error('AIRTABLE_PAT is not configured')
  return { Authorization: `Bearer ${pat}` }
}

async function airtableGet(path: string) {
  const response = await fetch(`${baseUrl()}${path}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Clinic consultation source unavailable (${response.status})`)
  return response.json()
}

export async function getLinkedClinicConsultationsByPatientId(
  patientRecordId: string,
): Promise<LinkedClinicConsultation[]> {
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientRecordId)) return []

  const patient = await airtableGet(`/${CLIENTES_TABLE}/${patientRecordId}`) as {
    fields?: { Consultas?: unknown }
  }
  const linkedIds = Array.isArray(patient.fields?.Consultas)
    ? patient.fields?.Consultas.filter((value): value is string => (
        typeof value === 'string' && /^rec[A-Za-z0-9]{14}$/.test(value)
      ))
    : []

  if (linkedIds.length === 0) return []

  return Promise.all(linkedIds.map(async consultationId => (
    airtableGet(`/${CONSULTAS_TABLE}/${consultationId}`) as Promise<LinkedClinicConsultation>
  )))
}
