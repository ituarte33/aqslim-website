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
  CITA_AGENDADA:        'fldx8HY7jVOFV74cQ',
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
    'Cita Agendada'?: boolean
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

export async function getClienteByNombre(nombre: string): Promise<Cliente | null> {
  const formula = encodeURIComponent(`{Nombre Completo} = "${nombre}"`)
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

// ---------- Cuestionario Sintomas ----------

export const CUESTIONARIO_TABLE = 'tblRn6LRSb8XhKOl7'

export const CUESTIONARIO_FIELDS = {
  ID_CLIENTE:   'fldFzCXg9ADeL2fq2',
  NOMBRE:       'fldkVApGgGDFmZhIR',
  FECHA:        'fldpXEQWFMSb4l4Sf',
  OBSERVACIONES:'fld5a7uUKjwGrFyF8',
  // Digestivo
  D_ESTRENIMIENTO:  'fldluEzmmArzfIzQz',
  D_DIARREA:        'flddDVMWsuO72KPBR',
  D_GASES:          'fldDiOE21l40db8m1',
  D_ACIDEZ:         'fld1gckNyHtmsXLOb',
  D_NAUSEA:         'fldAPVi83pKs6NmkO',
  D_DOLOR_ABD:      'fldtPuzaTx342X2wZ',
  D_HINCHAZON:      'fldjrzc05a98kv1xY',
  D_COLITIS:        'fldwkjYZ6TfvnCHwV',
  // Hepático
  H_FATIGA:         'fld8y2aLuEjh4lIhd',
  H_DOLOR_COSTADO:  'fld0csAjXnA48fvYQ',
  H_PIEL_OJOS:      'fldqVmygsnkui2Mc4',
  H_BOCA_AMARGA:    'fldv1FHnONjVR40NK',
  H_INTOLERANCIA:   'fld8zzQpy8nslUdja',
  // Hormonal
  HOR_TIROIDES:     'fldpTFVJxc7AaX3SV',
  HOR_SUDORACION:   'fldoNzzgXoaLBjOTz',
  HOR_IRREGULAR:    'fld99HsQQwlg8hCG4',
  HOR_PMS:          'fldXGKArf7a39xlfy',
  HOR_AUMENTO_PESO: 'fldCXsIsLlgtVgSZn',
  HOR_FRIO:         'fld0xXqE8DaxzFMPP',
  // Nervioso
  N_ANSIEDAD:       'fldUzmw1RLEJ0m3Rd',
  N_ESTRES:         'fldweQxO1yvadbt1m',
  N_INSOMNIO:       'fldL5KMuMyF6p130P',
  N_DEPRESION:      'fldqYUsEJHJJO27UR',
  N_DOLORES_CAB:    'fldZCDJXqHHZpVG1k',
  N_MIGRANAS:       'fldGt7WTbtRgcqRjC',
  N_MAREOS:         'fldcXas3JOtA12O7p',
  // Cardiovascular
  C_PRESION:        'fldU7blWhHz22B9gv',
  C_PALPITACIONES:  'fldwwOKn32UIxq4Nn',
  C_CIRCULACION:    'fldqoanqQrube5sjo',
  C_MANOS_PIES:     'fldgC0jnJd8a6ueMZ',
  C_RETENCION:      'fldSoIjDCd04r0I23',
  // Renal
  R_MICCION:        'fldb7GThzY6NfDLpC',
  R_INFECCIONES:    'fldhppvDFJYVqcX3I',
  R_ARDOR:          'fld9goQb0ezI5Hf8v',
  // Músculo-Esquelético
  M_ESPALDA:        'fldplCTHMJB4WciQI',
  M_ARTICULAR:      'fldZ5wCWOU0EB6dRB',
  M_MUSCULAR:       'fldJ1BQ8cQWuIcEnt',
  M_RIGIDEZ:        'fldhD7qPovwxbsrNM',
  // Piel
  P_ACNE:           'fldoNt3tBApOMcOkq',
  P_ECZEMA:         'fldIV9lUaiGtlzSbm',
  P_PIEL_RESECA:    'fldAel2zk1Aehwy3R',
  P_PICAZON:        'flds3bvAYn85pF4ox',
  // Estado General
  G_ENERGIA:        'fldksbjNbbK2dlc6E',
  G_CONCENTRACION:  'fldQVYo5LvgKeeb2U',
  G_AUMENTO_PESO:   'fld65YMBTMdVzDDdj',
} as const

export async function hasCuestionario(nombreCliente: string): Promise<boolean> {
  const formula = encodeURIComponent(`{${CUESTIONARIO_FIELDS.NOMBRE}} = "${nombreCliente}"`)
  const data = await airtableFetch(`/${CUESTIONARIO_TABLE}?filterByFormula=${formula}&maxRecords=1`)
  return data.records.length > 0
}

export async function createCuestionario(fields: Record<string, unknown>): Promise<void> {
  await airtableFetch(`/${CUESTIONARIO_TABLE}`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
}

// ---------- Consultas ----------

export async function hasConsulta(nombreCliente: string): Promise<boolean> {
  const formula = encodeURIComponent(`{ID Cliente} = "${nombreCliente}"`)
  const data = await airtableFetch(`/Consultas?filterByFormula=${formula}&maxRecords=1`)
  return data.records.length > 0
}

export async function getConsultasByCliente(nombreCliente: string): Promise<Consulta[]> {
  const formula = encodeURIComponent(`{ID Cliente} = "${nombreCliente}"`)
  const data = await airtableFetch(`/Consultas?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=Fecha%20Consulta&sort%5B0%5D%5Bdirection%5D=desc`)
  return data.records
}
