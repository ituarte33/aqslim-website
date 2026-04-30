const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`

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
// Field names are in Spanish to match Romulo's Airtable base.
// Update these as you confirm the exact field names in each table.

export interface Cliente {
  id: string
  fields: {
    'Nombre Completo'?: string
    'ID Cliente'?: number
    'Edad'?: number
    'Peso Meta (con unidad)'?: string
    'Unidad de Peso'?: string
    'Email'?: string
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
    const data = await airtableFetch(`/Clientes?${params}`)
    records.push(...data.records)
    offset = data.offset
  } while (offset)

  return records
}

export async function getClienteByEmail(email: string): Promise<Cliente | null> {
  const formula = encodeURIComponent(`{Email} = "${email}"`)
  const data = await airtableFetch(`/Clientes?filterByFormula=${formula}`)
  return data.records[0] ?? null
}

export async function getClienteById(id: string): Promise<Cliente> {
  return airtableFetch(`/Clientes/${id}`)
}

// ---------- Consultas ----------

export async function getConsultasByCliente(idCliente: number): Promise<Consulta[]> {
  const formula = encodeURIComponent(`{ID Cliente} = ${idCliente}`)
  const data = await airtableFetch(`/Consultas?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=Fecha%20Consulta&sort%5B0%5D%5Bdirection%5D=desc`)
  return data.records
}
