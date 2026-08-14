export type FinancePeriod = 'day' | 'week' | 'month' | 'year'

export interface FinanceMetricRecord {
  date: string
  tipoConsulta: string
  montoCobrado: number
  suppTotal: number
  shippingTotal: number
  paciente: string
  patientKey?: string
  acquisitionSource?: string
  advertisingChannel?: string
  attributionOwner?: string
}

const SUPPLEMENT_ONLY_TYPES = new Set(['suplementos', 'suplementos + envio', 'suplementos + envío'])

export function isPatientVisit(record: Pick<FinanceMetricRecord, 'tipoConsulta'>): boolean {
  return !SUPPLEMENT_ONLY_TYPES.has(record.tipoConsulta.trim().toLocaleLowerCase('es-MX'))
}

export function getFinanceMetrics(records: FinanceMetricRecord[]) {
  const attending = records.filter(isPatientVisit)
  const uniquePatients = new Set(
    attending.map(record => (
      record.patientKey?.trim() || record.paciente.trim().toLocaleLowerCase('es-MX')
    )).filter(Boolean),
  ).size

  const normalizedType = (record: FinanceMetricRecord) =>
    record.tipoConsulta.trim().toLocaleLowerCase('es-MX')
  const newVisitCount = attending.filter(record => normalizedType(record) === 'cliente nuevo').length
  const subsequentVisitCount = attending.filter(record => normalizedType(record) === 'cliente subsecuente').length
  const restartVisitCount = attending.filter(record => normalizedType(record) === 'cliente re-inicio').length

  let totalRevenue = 0
  let supplementRevenue = 0
  let shippingRevenue = 0

  for (const record of records) {
    totalRevenue += record.montoCobrado
    supplementRevenue += record.suppTotal
    shippingRevenue += record.shippingTotal
  }

  return {
    visitCount: attending.length,
    uniquePatients,
    newVisitCount,
    subsequentVisitCount,
    restartVisitCount,
    totalRevenue,
    supplementRevenue,
    shippingRevenue,
    consultationRevenue: Math.max(0, totalRevenue - supplementRevenue - shippingRevenue),
  }
}

const DIGITAL_SOURCES = new Set(['anuncio', 'google search', 'redes sociales'])

export function getGrowthMetrics(records: FinanceMetricRecord[]) {
  const newPatients = records.filter(record =>
    record.tipoConsulta.trim().toLocaleLowerCase('es-MX') === 'cliente nuevo',
  )

  const referred = newPatients.filter(record =>
    record.acquisitionSource?.trim().toLocaleLowerCase('es-MX') === 'referido',
  ).length
  const advertising = newPatients.filter(record =>
    DIGITAL_SOURCES.has(record.acquisitionSource?.trim().toLocaleLowerCase('es-MX') ?? ''),
  ).length
  const hillary = records.filter(record =>
    record.attributionOwner?.trim().toLocaleLowerCase('es-MX') === 'hillary',
  ).length
  const attributionRecorded = records.filter(record => record.attributionOwner?.trim()).length
  const unclassified = newPatients.filter(record => !record.acquisitionSource?.trim()).length

  const channels = new Map<string, number>()
  for (const record of newPatients) {
    const source = record.acquisitionSource?.trim() ?? ''
    if (!DIGITAL_SOURCES.has(source.toLocaleLowerCase('es-MX'))) continue
    const channel = record.advertisingChannel?.trim() || source
    channels.set(channel, (channels.get(channel) ?? 0) + 1)
  }
  const channelRanking = [...channels.entries()]
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count || a.channel.localeCompare(b.channel))

  return {
    newPatients: newPatients.length,
    referred,
    advertising,
    hillary,
    attributionRecorded,
    unclassified,
    bestAdvertisingChannel: channelRanking[0] ?? null,
    channelRanking,
  }
}

export function parseSalesNotes(notes: string): {
  supplementTotal: number
  shippingTotal: number
  items: Array<{ nombre: string; precio: number }>
} {
  if (!notes) return { supplementTotal: 0, shippingTotal: 0, items: [] }

  const items: Array<{ nombre: string; precio: number }> = []
  let supplementTotal = 0
  let shippingTotal = 0

  for (const rawLine of notes.split('\n')) {
    const line = rawLine.trim()
    const item = line.match(/^- (.+) \(\$([0-9]+(?:\.[0-9]+)?)\)$/)
    if (item) items.push({ nombre: item[1], precio: Number(item[2]) })

    const subtotal = line.match(/^Subtotal: \$([0-9]+(?:\.[0-9]+)?)$/i)
    if (subtotal) supplementTotal = Number(subtotal[1])

    const legacyTotal = line.match(/^Total: \$([0-9]+(?:\.[0-9]+)?)$/i)
    if (legacyTotal && supplementTotal === 0) supplementTotal = Number(legacyTotal[1])

    const shipping = line.match(/^Env[ií]o \(.+\): \$([0-9]+(?:\.[0-9]+)?)$/i)
    if (shipping) shippingTotal += Number(shipping[1])
  }

  if (supplementTotal === 0 && items.length > 0) {
    supplementTotal = items.reduce((sum, item) => sum + item.precio, 0)
  }

  return { supplementTotal, shippingTotal, items }
}
