import { parseSalesNotes } from './finance-metrics'

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
  ESTATURA_CM:          'fldztTAylCfqvtraZ',
  CITA_AGENDADA:        'fldx8HY7jVOFV74cQ',
  PROXIMA_CITA:         'fldRXEdx8C11nXvjB',
  SERVICIO_PROXIMA_CITA:'fldPQkPl1h8fA04g0',
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
    const method = options?.method ?? 'GET'
    const correlationId = crypto.randomUUID()
    console.error('[airtable] provider_request_failed', {
      correlationId,
      method,
      status: res.status,
    })
    throw new Error(`Airtable request failed (${correlationId})`)
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
    'Estatura (cm)'?: number
    'Cita Agendada'?: boolean
    'Próxima Cita'?: string
    'Servicio Próxima Cita'?: string
    'Plan AQSLIM'?: string[]
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
    'Notas del Terapeuta'?: string
    'Nombre Cliente'?: string | string[]
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

export type ClientesPage = {
  records: Cliente[]
  offset: string | null
}

export async function getClientesPage({
  offset,
  query,
  pageSize = 100,
}: {
  offset?: string | null
  query?: string
  pageSize?: number
} = {}): Promise<ClientesPage> {
  const params = new URLSearchParams({ pageSize: String(Math.min(Math.max(pageSize, 1), 100)) })
  if (offset) params.set('offset', offset)

  const normalizedQuery = query?.trim().replace(/[\u0000-\u001F\u007F]/g, '')
  if (normalizedQuery) {
    const escapedQuery = escapeAirtableString(normalizedQuery)
    params.set(
      'filterByFormula',
      `OR(SEARCH("${escapedQuery.toLowerCase()}",LOWER({Nombre Completo})),SEARCH("${escapedQuery.toLowerCase()}",LOWER({Email})),SEARCH("${escapedQuery}",{Teléfono}&""))`,
    )
  }

  const data = await airtableFetch(`/${CLIENTES_TABLE}?${params}`)
  return {
    records: data.records ?? [],
    offset: typeof data.offset === 'string' ? data.offset : null,
  }
}

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function getClientesByEmail(email: string): Promise<Cliente[]> {
  const normalizedEmail = escapeAirtableString(email.trim().toLowerCase())
  const formula = encodeURIComponent(`LOWER({Email}) = "${normalizedEmail}"`)
  const data = await airtableFetch(`/${CLIENTES_TABLE}?filterByFormula=${formula}&maxRecords=2`)
  return data.records ?? []
}

export async function getClienteByEmail(email: string): Promise<Cliente | null> {
  const records = await getClientesByEmail(email)
  return records.length === 1 ? records[0] : null
}

export async function getClienteByNombre(nombre: string): Promise<Cliente | null> {
  const formula = encodeURIComponent(`{Nombre Completo} = "${nombre}"`)
  const data = await airtableFetch(`/${CLIENTES_TABLE}?filterByFormula=${formula}`)
  return data.records[0] ?? null
}

export async function getClienteById(id: string): Promise<Cliente> {
  return airtableFetch(`/${CLIENTES_TABLE}/${id}`)
}

export async function searchClientes(query: string): Promise<Cliente[]> {
  const q = query.replace(/"/g, '')
  const formula = encodeURIComponent(
    `OR(SEARCH("${q.toLowerCase()}",LOWER({Nombre Completo})),SEARCH("${q.toLowerCase()}",LOWER({Email})))`
  )
  const data = await airtableFetch(`/${CLIENTES_TABLE}?filterByFormula=${formula}&maxRecords=10`)
  return data.records ?? []
}

export async function updateCliente(id: string, fields: Record<string, unknown>): Promise<Cliente> {
  return airtableFetch(`/${CLIENTES_TABLE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export async function getClientesConCita(): Promise<Cliente[]> {
  const formula = encodeURIComponent('{Cita Agendada} = TRUE()')
  const field = encodeURIComponent('Próxima Cita')
  const data = await airtableFetch(
    `/${CLIENTES_TABLE}?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=${field}&sort%5B0%5D%5Bdirection%5D=asc`
  )
  return data.records
}

export async function createCliente(fields: Record<string, unknown>): Promise<Cliente> {
  return airtableFetch(`/${CLIENTES_TABLE}`, {
    method: 'POST',
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

export interface CuestionarioSintoma {
  id: string
  createdTime: string
  fields: {
    'TOTAL GENERAL'?: number
    'Sistema Prioritarios'?: string
    'Observaciones'?: string
    'Nivel de toxicidad'?: string
    'Sistema Secundario'?: string
    'Rec. de Protocolo'?: string
    [key: string]: unknown
  }
}

export async function getCuestionariosByCliente(nombreCliente: string, limit = 6): Promise<CuestionarioSintoma[]> {
  const formula = encodeURIComponent(`{${CUESTIONARIO_FIELDS.NOMBRE}} = "${nombreCliente}"`)
  const data = await airtableFetch(
    `/${CUESTIONARIO_TABLE}?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=${CUESTIONARIO_FIELDS.FECHA}&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=${limit}`
  )
  return data.records ?? []
}

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

export interface ConsultasRevenueSummary {
  total: number
  cash: number
  card: number
  other: number
  today: number
  week: number
  byMethod: Array<{ method: string; total: number; count: number }>
  consultaCount: number
}

function classifyPaymentMethod(method: string): 'cash' | 'card' | 'other' {
  const lower = method.toLowerCase()
  if (lower.includes('efectivo') || lower.includes('cash')) return 'cash'
  if (
    lower.includes('tarjeta') || lower.includes('card') ||
    lower.includes('crédito') || lower.includes('credito') ||
    lower.includes('débito')  || lower.includes('debito')
  ) return 'card'
  return 'other'
}

export async function getConsultasRevenueSummary(): Promise<ConsultasRevenueSummary> {
  const now   = new Date()

  // Use Pacific time for today/week so dates match the business timezone.
  const ptTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now) // YYYY-MM-DD
  const [ptYear, ptMonth, ptDay] = ptTodayStr.split('-').map(Number)
  const dow = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, 12)).getUTCDay() // 0=Sun…6=Sat
  const ptMondayDate = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay - (dow === 0 ? 6 : dow - 1), 12))
  const ptWeekStart = ptMondayDate.toISOString().slice(0, 10) // YYYY-MM-DD

  const formula = encodeURIComponent(
    `AND(YEAR({Fecha Consulta}) = ${ptYear}, MONTH({Fecha Consulta}) = ${ptMonth}, {Monto Cobrado ($)} > 0)`
  )
  const data = await airtableFetch(`/Consultas?filterByFormula=${formula}`)
  const consultas: Consulta[] = data.records ?? []

  const byMethodMap = new Map<string, { total: number; count: number }>()
  let today = 0, week = 0
  for (const c of consultas) {
    const method = (c.fields['Método de Pago'] as string | undefined) ?? 'Sin especificar'
    const amount = (c.fields['Monto Cobrado ($)'] as number | undefined) ?? 0
    const fechaRaw = (c.fields['Fecha Consulta'] as string | undefined) ?? ''
    const fecha = fechaRaw.slice(0, 10) // YYYY-MM-DD
    if (fecha === ptTodayStr) today += amount
    if (fecha >= ptWeekStart) week  += amount
    const prev = byMethodMap.get(method) ?? { total: 0, count: 0 }
    byMethodMap.set(method, { total: prev.total + amount, count: prev.count + 1 })
  }

  const byMethod = Array.from(byMethodMap.entries()).map(([method, { total, count }]) => ({ method, total, count }))

  let cash = 0, card = 0, other = 0, total = 0
  for (const { method, total: amt } of byMethod) {
    const cls = classifyPaymentMethod(method)
    if (cls === 'cash') cash += amt
    else if (cls === 'card') card += amt
    else other += amt
    total += amt
  }

  return { total, cash, card, other, today, week, byMethod, consultaCount: consultas.length }
}

export interface FinanceRecord {
  id: string
  date: string
  tipoConsulta: string
  montoCobrado: number
  metodoPago: string
  suppTotal: number
  shippingTotal: number
  suppItems: Array<{ nombre: string; precio: number }>
  paciente: string
}

export async function getConsultasFinanceData(): Promise<FinanceRecord[]> {
  // Fetch clients and consultas in parallel
  const [clientes, consultaRecs] = await Promise.all([
    getClientes(),
    (async () => {
      const recs: Consulta[] = []
      let offset: string | undefined
      do {
        const offsetParam = offset ? `&offset=${encodeURIComponent(offset)}` : ''
        const data = await airtableFetch(
          `/Consultas?pageSize=100&sort%5B0%5D%5Bfield%5D=Fecha%20Consulta&sort%5B0%5D%5Bdirection%5D=desc${offsetParam}`
        )
        recs.push(...(data.records as Consulta[]))
        offset = data.offset
      } while (offset)
      return recs
    })(),
  ])

  // Map Airtable record ID → Nombre Completo
  const nameMap = new Map<string, string>()
  for (const c of clientes) {
    nameMap.set(c.id, c.fields['Nombre Completo'] ?? '')
  }

  const allRecords: FinanceRecord[] = []
  for (const c of consultaRecs) {
    const fechaRaw = (c.fields['Fecha Consulta'] as string | undefined) ?? ''
    const date = fechaRaw.slice(0, 10)
    if (date.length < 10) continue

    const montoCobrado = (c.fields['Monto Cobrado ($)'] as number | undefined) ?? 0
    const metodoPago   = (c.fields['Método de Pago']    as string | undefined) ?? ''
    const tipoConsulta = (c.fields['Tipo de Consulta']  as string | undefined) ?? ''
    const notas        = (c.fields['Notas del Terapeuta'] as string | undefined) ?? ''

    // ID Cliente is a linked record field — Airtable returns it as string[]
    const idClienteRaw = c.fields['ID Cliente']
    const clienteIds   = Array.isArray(idClienteRaw) ? (idClienteRaw as string[]) : []
    const emailRaw     = c.fields['Email Cliente']
    const email        = Array.isArray(emailRaw) ? (emailRaw[0] as string ?? '') : ((emailRaw as string | undefined) ?? '')
    const paciente     = (clienteIds.length > 0 ? (nameMap.get(clienteIds[0]) ?? '') : '') || email || ''

    const { supplementTotal: suppTotal, shippingTotal, items: suppItems } = parseSalesNotes(notas)
    allRecords.push({ id: c.id, date, tipoConsulta, montoCobrado, metodoPago, suppTotal, shippingTotal, suppItems, paciente })
  }
  return allRecords
}

export async function getConsultaById(id: string): Promise<Consulta> {
  return airtableFetch(`/Consultas/${id}`)
}

export async function updateConsulta(id: string, fields: Record<string, unknown>): Promise<Consulta> {
  return airtableFetch(`/Consultas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
}

export async function createConsulta(fields: Record<string, unknown>): Promise<Consulta> {
  return airtableFetch(`/Consultas`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  })
}

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

// ---------- Plan AQSLIM ----------

export interface PlanAqslim {
  id: string
  fields: {
    'ID Plan'?: number
    'ID Cliente'?: string[]
    'Nombre Cliente'?: string
    'Fecha Inicio Tratamiento'?: string
    'Semanas Totales en Tratamiento'?: number
    'Fase Actual'?: string
    'Semana en Fase Actual'?: number
    'Fecha Inicio Fase Actual'?: string
    'Fecha Estimada Cambio de Fase'?: string
    'Peso Inicio (kg)'?: number
    'Peso Actual (kg)'?: number
    'Peso Meta (kg)'?: number
    'Total Bajado (kg)'?: number
    '% Progreso hacia Meta'?: string
    'Siguiente Fase'?: string[]
    'Instrucciones Especiales'?: string
    [key: string]: unknown
  }
}

export async function getPlanById(id: string): Promise<PlanAqslim> {
  return airtableFetch(`/Plan%20AQSLIM/${id}`)
}

// ---------- Suplementos ----------

export interface Suplemento {
  id: string
  fields: {
    'Nombre'?: string
    'Precio de Venta ($)'?: number
    'Categoría'?: string
    'SKU'?: number
    'Activo'?: string
  }
}

export async function getSupplementos(): Promise<Suplemento[]> {
  const formula = encodeURIComponent(`{Activo} = "Sí"`)
  const records: Suplemento[] = []
  let offset: string | undefined
  do {
    const params = new URLSearchParams({
      filterByFormula: `{Activo} = "Sí"`,
      pageSize: '100',
      'sort[0][field]': 'Nombre',
      'sort[0][direction]': 'asc',
    })
    if (offset) params.set('offset', offset)
    const data = await airtableFetch(`/Suplementos_AQSLIM?${params}`)
    records.push(...(data.records ?? []))
    offset = data.offset
  } while (offset)
  return records
}

// ---------- Meal Logs ----------
export const MEAL_LOGS_TABLE = 'tblHcUslnFOgGjL43'

export const MEAL_LOGS_FIELDS = {
  USER_ID:          'fldxHW800FYtVhYei',     // Text — Clerk user ID (used for rate-limit filtering)
  USER_EMAIL:       'fldNmYfen0Lg3prTf',
  DATE:             'fldpoqYuNUq54szWY',
  FOOD_DESCRIPTION: 'fldSbnbkh8nKkkjoM',
  CALORIES:         'fldicYAqfidZQokET',
  CARBS_G:          'fld87DAlwQ9apCVsA',
  FATS_G:           'fldmyRfLyNe8lVYCN',
  PROTEINS_G:       'fldDJpomPW2W88ze1',
  TIMESTAMP:        'fld596uC3GlqHr59T',
  PLAN:             'fldDToUQRdKhv89aF',
  NOTES:            'fldaKtk9h5u2riid3',
  MEAL_TYPE:        'fld7Pc0AxN4ujVWvZ',
} as const

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other'

export interface MealLog {
  id: string
  createdTime: string
  fields: {
    'User Email'?: string
    'Date'?: string
    'Food Description'?: string
    'Calories'?: number
    'Carbs (g)'?: number
    'Fats (g)'?: number
    'Proteins (g)'?: number
    'Timestamp'?: string
    'Plan'?: string
    'Notes'?: string
    'Meal Type'?: MealType
  }
}

export async function createMealLog(data: {
  userId: string
  userEmail: string
  date: string
  foodDescription: string
  calories: number
  carbs: number
  fats: number
  proteins: number
  plan: string
  notes?: string
  mealType?: MealType
}): Promise<MealLog> {
  return airtableFetch(`/${MEAL_LOGS_TABLE}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        [MEAL_LOGS_FIELDS.USER_ID]:          data.userId,
        [MEAL_LOGS_FIELDS.USER_EMAIL]:       data.userEmail,
        [MEAL_LOGS_FIELDS.DATE]:             data.date,
        [MEAL_LOGS_FIELDS.FOOD_DESCRIPTION]: data.foodDescription,
        [MEAL_LOGS_FIELDS.CALORIES]:         data.calories,
        [MEAL_LOGS_FIELDS.CARBS_G]:          data.carbs,
        [MEAL_LOGS_FIELDS.FATS_G]:           data.fats,
        [MEAL_LOGS_FIELDS.PROTEINS_G]:       data.proteins,
        [MEAL_LOGS_FIELDS.TIMESTAMP]:        new Date().toISOString(),
        [MEAL_LOGS_FIELDS.PLAN]:             data.plan,
        ...(data.notes    ? { [MEAL_LOGS_FIELDS.NOTES]:     data.notes }    : {}),
        ...(data.mealType ? { [MEAL_LOGS_FIELDS.MEAL_TYPE]: data.mealType } : {}),
      },
    }),
  })
}

export async function countTodayScans(userId: string, date: string): Promise<number> {
  // Use TIMESTAMP range instead of DATE field equality — avoids issues with
  // Airtable Date-type fields where = "YYYY-MM-DD" can silently match nothing.
  const [y, m, d] = date.split('-').map(Number)

  // Determine current PT UTC offset (7 = PDT, 8 = PST) by sampling noon UTC on this day
  const sampleUTC = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const ptNoonHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
      hourCycle: 'h23',
    }).format(sampleUTC),
    10
  )
  const offsetHours = 12 - ptNoonHour // 7 for PDT, 8 for PST

  // UTC boundaries for midnight-to-midnight PT
  const startUTC = new Date(Date.UTC(y, m - 1, d,     offsetHours, 0, 0)).toISOString()
  const endUTC   = new Date(Date.UTC(y, m - 1, d + 1, offsetHours, 0, 0)).toISOString()

  const formula = encodeURIComponent(
    `AND({${MEAL_LOGS_FIELDS.USER_ID}} = "${userId}", {${MEAL_LOGS_FIELDS.TIMESTAMP}} >= "${startUTC}", {${MEAL_LOGS_FIELDS.TIMESTAMP}} < "${endUTC}")`
  )
  const data = await airtableFetch(
    `/${MEAL_LOGS_TABLE}?filterByFormula=${formula}&fields%5B%5D=${MEAL_LOGS_FIELDS.USER_ID}`
  )
  return Array.isArray(data?.records) ? data.records.length : 0
}

export async function getMealLogsByUser(userId: string, limit = 20): Promise<MealLog[]> {
  const formula = encodeURIComponent(`{${MEAL_LOGS_FIELDS.USER_ID}} = "${userId}"`)
  const data = await airtableFetch(
    `/${MEAL_LOGS_TABLE}?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=${MEAL_LOGS_FIELDS.TIMESTAMP}&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=${limit}`
  )
  return data.records ?? []
}

// Fetch all logs since a given date (YYYY-MM-DD) — used for daily/weekly/monthly filtering on the client
export async function getMealLogsSince(userId: string, since: string, limit = 200): Promise<MealLog[]> {
  const formula = encodeURIComponent(
    `AND({${MEAL_LOGS_FIELDS.USER_ID}} = "${userId}", {${MEAL_LOGS_FIELDS.DATE}} >= "${since}")`
  )
  const data = await airtableFetch(
    `/${MEAL_LOGS_TABLE}?filterByFormula=${formula}&sort%5B0%5D%5Bfield%5D=${MEAL_LOGS_FIELDS.TIMESTAMP}&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=${limit}`
  )
  return data.records ?? []
}
