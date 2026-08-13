export type FinancePeriod = 'day' | 'week' | 'month' | 'year'

export interface FinanceMetricRecord {
  date: string
  tipoConsulta: string
  montoCobrado: number
  suppTotal: number
  shippingTotal: number
  paciente: string
}

const SUPPLEMENT_ONLY_TYPES = new Set(['suplementos', 'suplementos + envio', 'suplementos + envío'])

export function isPatientVisit(record: Pick<FinanceMetricRecord, 'tipoConsulta'>): boolean {
  return !SUPPLEMENT_ONLY_TYPES.has(record.tipoConsulta.trim().toLocaleLowerCase('es-MX'))
}

export function getFinanceMetrics(records: FinanceMetricRecord[]) {
  const attending = records.filter(isPatientVisit)
  const uniquePatients = new Set(
    attending.map(record => record.paciente.trim().toLocaleLowerCase('es-MX')).filter(Boolean),
  ).size

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
    totalRevenue,
    supplementRevenue,
    shippingRevenue,
    consultationRevenue: Math.max(0, totalRevenue - supplementRevenue - shippingRevenue),
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
