'use server'

import { Resend } from 'resend'
import { getClienteById, updateCliente, CLIENTES_FIELDS } from '@/lib/airtable'

const CUESTIONARIO_URL   = 'https://aqslim.com/cuestionario'
const SQUARE_BOOKING_URL = 'https://square.site/appointments/buyer/widget/46af1166-2cd2-4127-b94f-531a768d54c9/8PN49DRQ1C6TC'

function reinitiationEmailHtml(nombre: string, lang: 'es' | 'en'): string {
  const es = lang === 'es'

  const card  = 'background:#1A1A1A;border:1px solid rgba(201,168,76,0.18);padding:24px;margin-bottom:16px;'
  const num   = 'font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;margin:0 0 6px;'
  const title = 'font-size:17px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;margin:0 0 10px;'
  const desc  = 'font-size:13px;line-height:1.75;color:#9A9590;font-family:Arial,sans-serif;margin:0 0 18px;'
  const btn   = 'display:inline-block;padding:11px 22px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0A0A0A;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;background:#C9A84C;'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.1em;color:#FAFAF8;">AQ<span style="color:#C9A84C;">SLIM</span></span>
        </td></tr>
        <tr><td style="background:#111111;border:1px solid rgba(201,168,76,0.25);padding:40px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;">
            ${es ? 'Bienvenido de regreso' : 'Welcome back'}
          </p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;line-height:1.3;">
            ${es ? `¡Nos alegra verte de regreso, ${nombre}!` : `Great to have you back, ${nombre}!`}
          </h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#9A9590;font-family:Arial,sans-serif;">
            ${es
              ? 'Estamos listos para apoyarte en retomar tu camino hacia tu meta. Completa los siguientes pasos para tu cita de re-inicio:'
              : "We're ready to support you in getting back on track. Complete the following steps for your re-start appointment:"}
          </p>
          <div style="${card}">
            <p style="${num}">${es ? 'Paso 1 — Agenda tu cita de re-inicio' : 'Step 1 — Book your re-start appointment'}</p>
            <p style="${title}">${es ? 'Reserva tu cita' : 'Reserve your appointment'}</p>
            <p style="${desc}">${es ? 'Selecciona el día y horario que mejor se adapte a ti para tu cita de regreso.' : 'Choose a day and time that works best for you for your return visit.'}</p>
            <a href="${SQUARE_BOOKING_URL}" style="${btn}">${es ? 'Agendar cita →' : 'Book appointment →'}</a>
          </div>
          <div style="${card}margin-bottom:0;">
            <p style="${num}">${es ? 'Paso 2 — Cuestionario de síntomas' : 'Step 2 — Symptom questionnaire'}</p>
            <p style="${title}">${es ? 'Actualiza tu cuestionario' : 'Update your questionnaire'}</p>
            <p style="${desc}">${es ? 'Cuéntanos cómo te has sentido desde tu última visita para que podamos ajustar tu programa.' : 'Tell us how you have been feeling since your last visit so we can update your program.'}</p>
            <a href="${CUESTIONARIO_URL}" style="${btn}">${es ? 'Completar cuestionario →' : 'Complete questionnaire →'}</a>
          </div>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6A6560;font-family:Arial,sans-serif;">
            ${es ? 'Si tienes preguntas, responde a este correo.' : 'If you have any questions, reply to this email.'}
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#3A3530;font-family:Arial,sans-serif;">© AQSLIM · aqslim.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function noShowEmailHtml(nombre: string, lang: 'es' | 'en'): string {
  const es = lang === 'es'

  const card  = 'background:#1A1A1A;border:1px solid rgba(201,168,76,0.18);padding:24px;margin-bottom:16px;'
  const num   = 'font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;margin:0 0 6px;'
  const title = 'font-size:17px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;margin:0 0 10px;'
  const desc  = 'font-size:13px;line-height:1.75;color:#9A9590;font-family:Arial,sans-serif;margin:0 0 18px;'
  const btn   = 'display:inline-block;padding:11px 22px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0A0A0A;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;background:#C9A84C;'
  const note  = 'font-size:12px;line-height:1.7;color:#6A6560;font-family:Arial,sans-serif;margin:0;padding:16px;background:#111111;border-left:2px solid rgba(201,168,76,0.35);'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.1em;color:#FAFAF8;">AQ<span style="color:#C9A84C;">SLIM</span></span>
        </td></tr>
        <tr><td style="background:#111111;border:1px solid rgba(201,168,76,0.25);padding:40px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;">${es ? 'Te echamos de menos' : 'We missed you'}</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;line-height:1.3;">${es ? `Lo sentimos, no pudimos verte hoy, ${nombre}.` : `Sorry we missed you today, ${nombre}.`}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#9A9590;font-family:Arial,sans-serif;">${es ? 'Esperamos que estés bien y que podamos verte pronto. Tu progreso es importante para nosotros y estamos aquí para apoyarte cuando estés listo.' : "We hope you're doing well and that we'll see you again soon. Your progress matters to us and we're here to support you whenever you're ready."}</p>

          <div style="${card}">
            <p style="${num}">${es ? 'Reagenda tu cita' : 'Reschedule your appointment'}</p>
            <p style="${title}">${es ? 'Reserva un nuevo horario' : 'Book a new time slot'}</p>
            <p style="${desc}">${es ? 'Puedes agendar tu próxima visita en persona o una consulta remota desde la comodidad de tu hogar.' : 'You can book your next in-person visit or a remote consultation from the comfort of your home.'}</p>
            <a href="${SQUARE_BOOKING_URL}" style="${btn}">${es ? 'Agendar cita →' : 'Book appointment →'}</a>
          </div>

          <p style="${note}">${es
            ? '📌 Recordatorio: Si necesitas cancelar o reprogramar tu cita, por favor hazlo con anticipación antes de tu hora de inicio. Esto nos permite ofrecer ese horario a otros pacientes que lo necesitan. ¡Gracias por tu consideración!'
            : '📌 Reminder: If you need to cancel or reschedule, please do so in advance before your appointment start time. This allows us to offer that slot to other patients who need it. Thank you for your consideration!'
          }</p>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6A6560;font-family:Arial,sans-serif;">${es ? 'Si tienes preguntas, responde a este correo.' : 'If you have any questions, reply to this email.'}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#3A3530;font-family:Arial,sans-serif;">© AQSLIM · aqslim.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendNoShowEmail(clienteId: string): Promise<void> {
  const patient = await getClienteById(clienteId)
  const email  = patient.fields['Email']
  const nombre = String(patient.fields['Nombre Completo'] ?? '')
  const lang: 'es' | 'en' = patient.fields['Idioma Preferido'] === 'English' ? 'en' : 'es'

  if (!email) throw new Error('El paciente no tiene email registrado.')

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'AQSLIM <contact@aqslim.com>',
    to: String(email),
    subject: lang === 'es' ? 'Lo sentimos, no pudimos verte hoy — AQSLIM' : 'Sorry we missed you today — AQSLIM',
    html: noShowEmailHtml(nombre, lang),
  })
}

export async function sendReinitiationEmail(clienteId: string): Promise<void> {
  const patient = await getClienteById(clienteId)
  const email  = patient.fields['Email']
  const nombre = patient.fields['Nombre Completo'] ?? ''
  const lang: 'es' | 'en' = patient.fields['Idioma Preferido'] === 'English' ? 'en' : 'es'

  if (!email) throw new Error('El paciente no tiene email registrado.')

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'AQSLIM <contact@aqslim.com>',
    to: String(email),
    subject: lang === 'es' ? 'Bienvenido de regreso a AQSLIM' : 'Welcome back to AQSLIM',
    html: reinitiationEmailHtml(nombre, lang),
  })
}

function mmddyyyyToISO(date: string): string | undefined {
  const parts = date.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return undefined
  const [mm, dd, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

export async function updatePaciente(formData: FormData): Promise<void> {
  const clienteId      = (formData.get('clienteId')       as string).trim()
  const firstName      = (formData.get('firstName')       as string).trim()
  const lastName       = (formData.get('lastName')        as string).trim()
  const email          = (formData.get('email')           as string).trim().toLowerCase()
  const telefono       = (formData.get('telefono')        as string).trim()
  const fechaNacimiento= (formData.get('fechaNacimiento') as string).trim()
  const sexo           = (formData.get('sexo')            as string).trim()
  const direccion      = ((formData.get('direccion')      as string) ?? '').trim()
  const ciudad         = ((formData.get('ciudad')         as string) ?? '').trim()
  const zip            = ((formData.get('zip')            as string) ?? '').trim()
  const idioma         = (formData.get('idioma')          as string).trim()
  const unidadDePeso   = (formData.get('unidadDePeso')   as string).trim()
  const pesoMeta       = ((formData.get('pesoMeta')      as string) ?? '').trim()
  const comoNosConocio = ((formData.get('comoNosConocio') as string) ?? '').trim()
  const estadoDelCliente=(formData.get('estadoDelCliente') as string).trim()
  const metaDelCliente = ((formData.get('metaDelCliente') as string) ?? '').trim()
  const condiciones    = ((formData.get('condiciones')   as string) ?? '').trim()
  const estaturaCm     = ((formData.get('estaturaCm')    as string) ?? '').trim()

  const nombre = [firstName, lastName].filter(Boolean).join(' ')

  const fields: Record<string, unknown> = {
    [CLIENTES_FIELDS.NOMBRE_COMPLETO]:    nombre,
    [CLIENTES_FIELDS.EMAIL]:              email,
    [CLIENTES_FIELDS.TELEFONO]:           telefono,
    [CLIENTES_FIELDS.SEXO]:               sexo,
    [CLIENTES_FIELDS.IDIOMA_PREFERIDO]:   idioma,
    [CLIENTES_FIELDS.UNIDAD_DE_PESO]:     unidadDePeso,
    [CLIENTES_FIELDS.COMO_NOS_CONOCIO]:   comoNosConocio,
    [CLIENTES_FIELDS.META_DEL_CLIENTE]:   metaDelCliente,
    [CLIENTES_FIELDS.ESTADO_DEL_CLIENTE]: estadoDelCliente,
    [CLIENTES_FIELDS.CONDICIONES_ALERGIAS]: condiciones,
    [CLIENTES_FIELDS.DIRECCION]:          direccion,
    [CLIENTES_FIELDS.CIUDAD]:             ciudad,
  }

  const fechaISO = mmddyyyyToISO(fechaNacimiento)
  if (fechaISO)   fields[CLIENTES_FIELDS.FECHA_NACIMIENTO] = fechaISO
  if (zip)        fields[CLIENTES_FIELDS.ZIP]              = parseInt(zip, 10)
  if (pesoMeta)   fields[CLIENTES_FIELDS.PESO_META]        = parseInt(pesoMeta, 10)
  if (estaturaCm) fields[CLIENTES_FIELDS.ESTATURA_CM]      = parseInt(estaturaCm, 10)

  await updateCliente(clienteId, fields)
}
