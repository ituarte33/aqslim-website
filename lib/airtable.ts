const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`

export const CLIENTES_TABLE = 'tblek9goIGKMRJKXJ'

// Field IDs for the Clientes table. Use these as keys in write operations
// so that Airtable field renames never break the API.
export const CLIENTES_FIELDS = {
  NOMBRE_COMPLETO:      'fldKnMcOw30Oq0Nct',
  EMAIL:                'fldFaHBmXkiZPi7SD',
  FECHA_NACIMIENTO:     'fld4GgMFoHwbeb7uZ',
  SEXO:                 'fldEaI3u7ug0oksNe',
  TELEFONO:             'fldYoxcDIjes4GtYt',
  DIRECCION:            'fldo2P3H3KsX06Td6',
  CIUDAD:               'fld6IafwnNVs7DjaQ',
  ZIP:                  'fldwbSOM9G3h3qYCG',
  IDIOMA_PREFERIDO:     'fldRpFEL77yUkfaPG',
  COMO_NOS_CONOCIO:     'fldE5rU0yD6dZqNKw',
  ACEPTO_TERMINOS:      'fldaHiraHz4bhhjVD',
  ESTADO_DEL_CLIENTE:   'fldqyYielhA0GDF0h',
  META_DEL_CLIENTE:     'fldxBWCYYqlUJIqM1',
  UNIDAD_DE_PESO:       'fldFDfVOWUTJLBaEq',
  PESO_META:            'fldJOztXSqZKsmZV5',
  CONDICIONES_ALERGIAS: 'fldeWA9A4FvulirHk',
  ID_CLIENTE:           'fldeTMbkVItk4nPUW',
} as const

async function airtableFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    // Don't cache — always fetch fresh data from Airtable
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airtable ${res.status}: ${text}`)
  }
  return res.json()
}

// ---------- Types ----------
// Field names match what the Airtable API returns in READ responses.
// For WRITE operations, use CLIENTES_FIELDS field IDs above.

export interface Cliente {
  id: string
  fields: {
    'Nombre Completo'?: string
    'ID Cliente'?: number
    'Edad'?: number
    'Fecha Nacimiento'?: string
    'Sexo'?: string
    'Peso Meta'?: number
    'Peso Meta (con unidad)'?: string
    'Unidad de Peso'?: string
    'Email'?: string
    'Teléfono'?: string
    'Dirección'?: string
    'Ciudad'?: string
    'ZIP'?: number
    'Estado del Cliente'?: string
    'Idioma Preferido'?: string
    'Cómo Nos Conoció'?: string
    'He leído y acepto los términos anteriores'?: boolean
    'Meta del Cliente'?: string
    'Condiciones Especiales / Alergias'?: string
    [key: string]: unknown
  }
}

export interface Consulta {
  id: string
  fields: {
    'ID Consulta'?: string
    'ID Cliente'?: string
    'Fecha Consulta'?: string
    'Tipo de Consulta'?: string
    'Peso (kg)'?: number
    'Peso (con unidad)'?: string
    'Peso Meta'?: number
    '% Grasa Corporal'?: number
    'IMC'?: number
    'Cintura (cm)'?: number
    'Cadera (cm)'?: number
    'Brazos (cm)'?: number
    'Muslos (cm)'?: number
    'Pecho/Busto (cm)'?: number
    'Diferencia vs Semana Anterior (kg)'?: number
    'Dias desde Consulta'?: number
    'Cumplimiento Dieta (1-10)'?: number
    'Nivel de Energía'?: string
    'Calidad de Sueño'?: string
    'Cómo Se Siente (1-10)'?: number
    '¿Ansiedad?'?: boolean
    '¿Tuvo Hambre?'?: boolean
    'Recomendaciones al Cliente'?: string
    'Próxima Cita'?: string
    'Método de Pago'?: string
    'Monto Cobrado ($)'?: number
    'Email Cliente'?: string
    'Idioma Preferido'?: string
    'Unidad Cliente'?: string
    'Email Post-Consulta Enviado'?: boolean
    [key: string]: unknown
  }
}

// ---------- Clientes ----------

export async function getClientes(): Promise<Cliente[]> {
  const records: Cliente[] = []
  let offset: string | undefined

  do {
    const params = new URLSearchParams({ pageSize: '100' })
    if (offset) params.set('offset', offset)
    const data = await airtableFetch(`/${CLIENTES_TABLE}?${params}`)
    records.push(...data.records)
    offset = data.offset
  } while (offset)

  return records
}

export async function getClienteByEmail(email: string): Promise<Cliente | null> {
  const formula = encodeURIComponent(`{Email} = "${email}"`)
  const data = await airtableFetch(`/${CLIENTES_TABLE}?filterByFormula=${formula}`)
  return data.records[0] ?? null
}

export async function getClienteById(id: string): Promise<Cliente> {
  return airtableFetch(`/${CLIENTES_TABLE}/${id}`)
}

export async function updateCliente(id: string, fields: Record<string, unknown>): Promise<Cliente> {
  return airtableFetch(`/${CLIENTES_TABLE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export async function createProspecto(nombre: string, email: string): Promise<Cliente> {
  return airtableFetch(`/${CLIENTES_TABLE}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        [CLIENTES_FIELDS.NOMBRE_COMPLETO]:  nombre,
        [CLIENTES_FIELDS.EMAIL]:            email,
        [CLIENTES_FIELDS.ESTADO_DEL_CLIENTE]: 'Prospecto',
      },
    }),
  })
}

// ---------- Consultas ----------

export async function getConsultasByCliente(idCliente: number): Promise<Consulta[]> {
  const formula = encodeURIComponent(`{ID Cliente} = ${idCliente}`)
  const data = await airtableFetch(`/Consultas?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=Fecha%20Consulta&sort%5B0%5D%5Bdirection%5D=desc`)
  return data.records
}
