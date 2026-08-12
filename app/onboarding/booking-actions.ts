'use server'

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
import { getOwnPatient, requireCapability, type AuthenticatedActor } from '@/lib/auth'

const PATIENT_SERVICE_NAMES = ['Returning Client', 'New Beggining']

export type PatientResult = {
  nombre: string
  email: string
  telefono?: string
  clienteId?: string
  source: 'airtable' | 'square' | 'both'
}

export async function fetchServices(allowedServices?: string[]): Promise<SquareService[]> {
  const actor = await requireCapability('appointments:book:self')
  return getBookableServices(actor.role === 'admin' ? allowedServices : PATIENT_SERVICE_NAMES)
}

async function requireAuthorizedService(actor: AuthenticatedActor, variationId: string): Promise<SquareService> {
  const services = await getBookableServices(actor.role === 'admin' ? undefined : PATIENT_SERVICE_NAMES)
  const service = services.find(candidate => candidate.variationId === variationId)
  if (!service) throw new Error('Service is not available')
  return service
}

export async function fetchAvailability(
  serviceVariationId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  const actor = await requireCapability('appointments:book:self')
  await requireAuthorizedService(actor, serviceVariationId)
  return searchAvailability(serviceVariationId, dateStr, process.env.SQUARE_LOCATION_ID!)
}

export async function bookAppointment(
  slot: AvailableSlot,
  _serviceName: string,
  email: string,
  nombre: string,
  telefono?: string,
  clienteId?: string | null,
): Promise<{ startAt: string; serviceName: string }> {
  const actor = await requireCapability('appointments:book:self')
  const service = await requireAuthorizedService(actor, slot.serviceVariationId)

  if (actor.role === 'admin') {
    await requireCapability('appointments:book:any')
  } else {
    const patient = await getOwnPatient()
    email = actor.email
    nombre = patient.fields['Nombre Completo']?.trim() || actor.email
    telefono = patient.fields['Teléfono'] ? String(patient.fields['Teléfono']) : undefined
    clienteId = patient.id
  }

  const nameParts  = nombre.trim().split(' ')
  const givenName  = nameParts[0] ?? 'Cliente'
  const familyName = nameParts.slice(1).join(' ') || undefined

  const squareCustomerId = await findOrCreateSquareCustomer(email, givenName, familyName, telefono)
  const { startAt } = await createSquareBooking(squareCustomerId, slot, process.env.SQUARE_LOCATION_ID!)

  if (clienteId) {
    await updateCliente(clienteId, {
      [CLIENTES_FIELDS.CITA_AGENDADA]:         true,
      [CLIENTES_FIELDS.PROXIMA_CITA]:          startAt,
      [CLIENTES_FIELDS.SERVICIO_PROXIMA_CITA]: service.name,
    })
  }

  return { startAt, serviceName: service.name }
}

// Search both Airtable Clientes and Square customers, merge by email.
export async function searchPatients(query: string): Promise<PatientResult[]> {
  await requireCapability('patients:read:any')
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
