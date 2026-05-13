'use server'

import { Resend } from 'resend'
import { createCliente, CLIENTES_FIELDS } from '@/lib/airtable'

const CUESTIONARIO_URL   = 'https://aqslim.com/cuestionario'
const SQUARE_BOOKING_URL = 'https://square.site/appointments/buyer/widget/46af1166-2cd2-4127-b94f-531a768d54c9/8PN49DRQ1C6TC'

function mmddyyyyToISO(date: string): string | undefined {
  const parts = date.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return undefined
  const [mm, dd, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function welcomeEmailHtml(nombre: string, lang: 'es' | 'en'): string {
  const es = lang === 'es'
  const heading  = es ? `¡Bienvenido a AQSLIM, ${nombre}!` : `Welcome to AQSLIM, ${nombre}!`
  const intro    = es
    ? 'Tu perfil ha sido registrado exitosamente. Completa los siguientes dos pasos antes de tu primera consulta:'
    : 'Your profile has been successfully registered. Please complete the following two steps before your first consultation:'
  const footer   = es ? 'Si tienes preguntas, responde a este correo.' : 'If you have any questions, reply to this email.'

  const step1Label = es ? 'Paso 1 — Agenda tu cita'          : 'Step 1 — Book your appointment'
  const step1Desc  = es
    ? 'Selecciona el día y horario que mejor se adapte a ti a través de nuestro sistema de citas en línea.'
    : 'Choose the day and time that works best for you through our online booking system.'
  const step2Label = es ? 'Paso 2 — Cuestionario de síntomas' : 'Step 2 — Symptom questionnaire'
  const step2Desc  = es
    ? 'Cuéntanos cómo te has sentido. Este cuestionario nos ayuda a personalizar tu programa antes de tu cita.'
    : 'Tell us how you have been feeling. This questionnaire helps us tailor your program before your appointment.'

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
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;">${es ? 'Bienvenido' : 'Welcome'}</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;line-height:1.3;">${heading}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#9A9590;font-family:Arial,sans-serif;">${intro}</p>
          <div style="${card}">
            <p style="${num}">${step1Label}</p>
            <p style="${title}">${es ? 'Reserva tu consulta inicial' : 'Reserve your initial consultation'}</p>
            <p style="${desc}">${step1Desc}</p>
            <a href="${SQUARE_BOOKING_URL}" style="${btn}">${es ? 'Agendar cita →' : 'Book appointment →'}</a>
          </div>
          <div style="${card}margin-bottom:0;">
            <p style="${num}">${step2Label}</p>
            <p style="${title}">${es ? 'Completa tu cuestionario' : 'Complete your questionnaire'}</p>
            <p style="${desc}">${step2Desc}</p>
            <a href="${CUESTIONARIO_URL}" style="${btn}">${es ? 'Completar cuestionario →' : 'Complete questionnaire →'}</a>
          </div>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6A6560;font-family:Arial,sans-serif;">${footer}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#3A3530;font-family:Arial,sans-serif;">© AQSLIM · aqslim.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function registerPaciente(formData: FormData): Promise<{ id: string; nombre: string }> {
  const firstName       = (formData.get('firstName')       as string).trim()
  const lastName        = (formData.get('lastName')        as string).trim()
  const email           = (formData.get('email')           as string).trim().toLowerCase()
  const telefono        = (formData.get('telefono')        as string).trim()
  const fechaNacimiento = (formData.get('fechaNacimiento') as string).trim()
  const sexo            = (formData.get('sexo')            as string).trim()
  const direccion       = ((formData.get('direccion')      as string) ?? '').trim()
  const ciudad          = ((formData.get('ciudad')         as string) ?? '').trim()
  const zip             = ((formData.get('zip')            as string) ?? '').trim()
  const idioma          = (formData.get('idioma')          as string).trim()
  const unidadDePeso    = (formData.get('unidadDePeso')    as string).trim()
  const pesoMeta        = ((formData.get('pesoMeta')       as string) ?? '').trim()
  const comoNosConocio  = (formData.get('comoNosConocio')  as string).trim()
  const metaDelCliente  = ((formData.get('metaDelCliente') as string) ?? '').trim()
  const condiciones     = ((formData.get('condiciones')    as string) ?? '').trim()
  const estaturaCm      = ((formData.get('estaturaCm')     as string) ?? '').trim()

  const nombre = [firstName, lastName].filter(Boolean).join(' ')

  const fields: Record<string, unknown> = {
    [CLIENTES_FIELDS.NOMBRE_COMPLETO]:    nombre,
    [CLIENTES_FIELDS.EMAIL]:              email,
    [CLIENTES_FIELDS.TELEFONO]:           telefono,
    [CLIENTES_FIELDS.SEXO]:              sexo,
    [CLIENTES_FIELDS.IDIOMA_PREFERIDO]:  idioma,
    [CLIENTES_FIELDS.UNIDAD_DE_PESO]:    unidadDePeso,
    [CLIENTES_FIELDS.COMO_NOS_CONOCIO]:  comoNosConocio,
    [CLIENTES_FIELDS.META_DEL_CLIENTE]:  metaDelCliente,
    [CLIENTES_FIELDS.ACEPTO_TERMINOS]:   false,
    [CLIENTES_FIELDS.ESTADO_DEL_CLIENTE]: 'Activo',
  }

  const fechaISO = mmddyyyyToISO(fechaNacimiento)
  if (fechaISO) fields[CLIENTES_FIELDS.FECHA_NACIMIENTO] = fechaISO
  if (direccion)   fields[CLIENTES_FIELDS.DIRECCION]            = direccion
  if (ciudad)      fields[CLIENTES_FIELDS.CIUDAD]               = ciudad
  if (zip)         fields[CLIENTES_FIELDS.ZIP]                  = parseInt(zip, 10)
  if (pesoMeta)    fields[CLIENTES_FIELDS.PESO_META]            = parseInt(pesoMeta, 10)
  if (condiciones) fields[CLIENTES_FIELDS.CONDICIONES_ALERGIAS] = condiciones
  if (estaturaCm)  fields[CLIENTES_FIELDS.ESTATURA_CM]          = parseInt(estaturaCm, 10)

  const cliente = await createCliente(fields)

  // Send welcome email — non-blocking
  const lang: 'es' | 'en' = idioma === 'English' ? 'en' : 'es'
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'AQSLIM <contact@aqslim.com>',
      to: email,
      subject: lang === 'es' ? 'Tu cuestionario de síntomas — AQSLIM' : 'Your symptom questionnaire — AQSLIM',
      html: welcomeEmailHtml(nombre, lang),
    })
  } catch (err) {
    console.error('[registerPaciente] Failed to send welcome email:', err)
  }

  return { id: cliente.id, nombre }
}
