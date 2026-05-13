'use server'

import { auth } from '@clerk/nextjs/server'
import {
  getBookableServices,
  searchAvailability,
  searchSquareCustomers,
  findOrCreateSquareCustomer,
  createSquareBooking,
  type SquareService,
  type AvailableSlot,
} from '@/lib/square'
import { updateCliente, searchClientes, CLIENTES_FIELDS } from '@/lib/airtable'

export type PatientResult = {
  nombre: string
  email: string
  telefono?: string
  clienteId?: string
  source: 'airtable' | 'square' | 'both'
}

export async function fetchServices(allowedServices?: string[]): Promise<SquareService[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return getBookableServices(allowedServices)
}

export async function fetchAvailability(
  serviceVariationId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return searchAvailability(serviceVariationId, dateStr, process.env.SQUARE_LOCATION_ID!)
}

export async function bookAppointment(
  slot: AvailableSlot,
  serviceName: string,
  email: string,
  nombre: string,
  telefono?: string,
  clienteId?: string | null,
): Promise<{ startAt: string; serviceName: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const nameParts  = nombre.trim().split(' ')
  const givenName  = nameParts[0] ?? 'Cliente'
  const familyName = nameParts.slice(1).join(' ') || undefined

  const squareCustomerId = await findOrCreateSquareCustomer(email, givenName, familyName, telefono)
  const { startAt } = await createSquareBooking(squareCustomerId, slot, process.env.SQUARE_LOCATION_ID!)

  if (clienteId) {
    await updateCliente(clienteId, {
      [CLIENTES_FIELDS.CITA_AGENDADA]:         true,
      [CLIENTES_FIELDS.PROXIMA_CITA]:          startAt,
      [CLIENTES_FIELDS.SERVICIO_PROXIMA_CITA]: serviceName,
    })
  }

  return { startAt, serviceName }
}

// Search both Airtable Clientes and Square customers, merge by email.
export async function searchPatients(query: string): Promise<PatientResult[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  if (query.trim().length < 2) return []

  const [airtableRecords, squareCustomers] = await Promise.all([
    searchClientes(query).catch(() => []),
    searchSquareCustomers(query).catch(() => []),
  ])

  const map = new Map<string, PatientResult>()

  for (const r of airtableRecords) {
    const email = String(r.fields['Email'] ?? '').toLowerCase().trim()
    if (!email) continue
    map.set(email, {
      nombre:    String(r.fields['Nombre Completo'] ?? ''),
      email,
      telefono:  r.fields['Teléfono'] ? String(r.fields['Teléfono']) : undefined,
      clienteId: r.id,
      source:    'airtable',
    })
  }

  for (const c of squareCustomers) {
    const email = (c.email_address ?? '').toLowerCase().trim()
    if (!email) continue
    const existing = map.get(email)
    if (existing) {
      existing.source   = 'both'
      existing.telefono ??= c.phone_number || undefined
    } else {
      const nombre = [c.given_name, c.family_name].filter(Boolean).join(' ')
      if (!nombre) continue
      map.set(email, {
        nombre,
        email,
        telefono: c.phone_number || undefined,
        source:   'square',
      })
    }
  }

  return Array.from(map.values()).slice(0, 10)
}
