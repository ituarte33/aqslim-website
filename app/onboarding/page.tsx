import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClienteByEmail, hasCuestionario, hasConsulta } from '@/lib/airtable'
import { hasUpcomingBookingByEmail } from '@/lib/square'
import { OnboardingClient } from './onboarding-client'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  if (!email) redirect('/sign-in')

  const cliente = await getClienteByEmail(email)
  if (!cliente) redirect('/dashboard')

  const profileFilled  = cliente.fields['He leído y acepto los términos anteriores'] === true
  const airtableBooked = cliente.fields['Cita Agendada'] === true
  const nombreCliente  = cliente.fields['Nombre Completo'] ?? ''

  // Run Square check + cuestionario check in parallel to avoid sequential latency.
  const [cuestionarioDone, squareBooked] = await Promise.all([
    profileFilled && nombreCliente ? hasCuestionario(nombreCliente) : Promise.resolve(false),
    hasUpcomingBookingByEmail(email).catch(() => false),
  ])

  const step1Done = airtableBooked || squareBooked

  if (nombreCliente) {
    const consulta = await hasConsulta(nombreCliente)
    if (consulta) redirect(`/dashboard/${cliente.id}`)
  }

  const allDone = step1Done && cuestionarioDone

  const isPreRegistered = !profileFilled && (
    cliente.fields['Estado del Cliente'] === 'Activo' ||
    Boolean(cliente.fields['Teléfono'])
  )

  const clienteData = isPreRegistered ? {
    nombre:          cliente.fields['Nombre Completo'],
    telefono:        cliente.fields['Teléfono'],
    fechaNacimiento: cliente.fields['Fecha Nacimiento'],
    sexo:            cliente.fields['Sexo'],
    direccion:       cliente.fields['Dirección'],
    ciudad:          cliente.fields['Ciudad'],
    zip:             typeof cliente.fields['ZIP'] === 'number' ? cliente.fields['ZIP'] : undefined,
    idioma:          cliente.fields['Idioma Preferido'],
    unidadDePeso:    cliente.fields['Unidad de Peso'],
    pesoMeta:        typeof cliente.fields['Peso Meta'] === 'number' ? cliente.fields['Peso Meta'] : undefined,
    metaDelCliente:  cliente.fields['Meta del Cliente'],
    condiciones:     cliente.fields['Condiciones Especiales / Alergias'],
    comoNosConocio:  cliente.fields['Cómo Nos Conoció'],
  } : undefined

  return (
    <OnboardingClient
      defaultFirstName={user?.firstName ?? ''}
      defaultLastName={user?.lastName ?? ''}
      initialStep={profileFilled ? 'next-steps' : isPreRegistered ? 'confirm' : 'profile'}
      step1Done={step1Done}
      cuestionarioDone={cuestionarioDone}
      allDone={allDone}
      clienteData={clienteData}
      bookingInfo={{
        clienteId: cliente.id,
        nombre:    nombreCliente || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        email,
        telefono:  cliente.fields['Teléfono'] || undefined,
      }}
    />
  )
}
