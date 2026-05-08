'use server'

import { currentUser } from '@clerk/nextjs/server'
import { Resend } from 'resend'
import { getClienteByEmail, updateCliente, CLIENTES_FIELDS } from '@/lib/airtable'

const CUESTIONARIO_URL = 'https://aqslim.com/cuestionario'

function mmddyyyyToISO(date: string): string | undefined {
  const parts = date.split('/')
  if (parts.length !== 3 || parts[2].length !== 4) return undefined
  const [mm, dd, yyyy] = parts
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function cuestionarioEmailHtml(nombre: string, lang: 'es' | 'en'): string {
  const es = lang === 'es'

  const heading    = es ? `¡Bienvenido a AQSLIM, ${nombre}!` : `Welcome to AQSLIM, ${nombre}!`
  const body1      = es
    ? 'Tu perfil ha sido registrado exitosamente. El siguiente paso es completar el <strong style="color:#C9A84C">cuestionario de síntomas</strong>, que nos ayuda a personalizar tu programa de salud antes de tu primera consulta.'
    : 'Your profile has been successfully registered. The next step is to complete the <strong style="color:#C9A84C">symptom questionnaire</strong>, which helps us personalize your health program before your first consultation.'
  const btnLabel   = es ? 'Completar cuestionario →' : 'Complete questionnaire →'
  const body2      = es
    ? 'Solo toma unos minutos. Si ya agendaste tu cita, intenta completarlo al menos 24 horas antes.'
    : 'It only takes a few minutes. If you have already scheduled your appointment, try to complete it at least 24 hours before.'
  const footer     = es ? 'Si tienes preguntas, responde a este correo.' : 'If you have any questions, reply to this email.'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.1em;color:#FAFAF8;">
            AQ<span style="color:#C9A84C;">SLIM</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111111;border:1px solid rgba(201,168,76,0.25);padding:40px;">

          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;">
            ${es ? 'Bienvenido' : 'Welcome'}
          </p>
          <h1 style="margin:0 0 24px;font-size:26px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;line-height:1.3;">
            ${heading}
          </h1>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#9A9590;font-family:Arial,sans-serif;">
            ${body1}
          </p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#C9A84C;">
              <a href="${CUESTIONARIO_URL}"
                 style="display:inline-block;padding:14px 28px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0A0A0A;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;">
                ${btnLabel}
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;line-height:1.7;color:#6A6560;font-family:Arial,sans-serif;">
            ${body2}
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6A6560;font-family:Arial,sans-serif;">
            ${footer}
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#3A3530;font-family:Arial,sans-serif;">
            © AQSLIM · aqslim.com
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function saveProfile(formData: FormData) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')

  const email = user.emailAddresses[0]?.emailAddress
  if (!email) throw new Error('No email')

  const firstName       = (formData.get('firstName') as string).trim()
  const lastName        = (formData.get('lastName') as string).trim()
  const telefono        = (formData.get('telefono') as string).trim()
  const fechaNacimiento = (formData.get('fechaNacimiento') as string).trim()
  const sexo            = (formData.get('sexo') as string).trim()
  const direccion       = ((formData.get('direccion') as string) ?? '').trim()
  const ciudad          = ((formData.get('ciudad') as string) ?? '').trim()
  const zip             = ((formData.get('zip') as string) ?? '').trim()
  const idioma          = (formData.get('idioma') as string).trim()
  const unidadDePeso    = (formData.get('unidadDePeso') as string).trim()
  const pesoMeta        = ((formData.get('pesoMeta') as string) ?? '').trim()
  const comoNosConocio  = (formData.get('comoNosConocio') as string).trim()
  const metaDelCliente  = ((formData.get('metaDelCliente') as string) ?? '').trim()
  const condiciones     = ((formData.get('condiciones') as string) ?? '').trim()

  const cliente = await getClienteByEmail(email)
  if (!cliente) throw new Error('Registro no encontrado')

  const fields: Record<string, unknown> = {
    [CLIENTES_FIELDS.NOMBRE_COMPLETO]:    [firstName, lastName].filter(Boolean).join(' '),
    [CLIENTES_FIELDS.TELEFONO]:           telefono,
    [CLIENTES_FIELDS.SEXO]:              sexo,
    [CLIENTES_FIELDS.IDIOMA_PREFERIDO]:  idioma,
    [CLIENTES_FIELDS.UNIDAD_DE_PESO]:    unidadDePeso,
    [CLIENTES_FIELDS.COMO_NOS_CONOCIO]:  comoNosConocio,
    [CLIENTES_FIELDS.META_DEL_CLIENTE]:  metaDelCliente,
    [CLIENTES_FIELDS.ACEPTO_TERMINOS]:   true,
  }

  const fechaISO = mmddyyyyToISO(fechaNacimiento)
  if (fechaISO) fields[CLIENTES_FIELDS.FECHA_NACIMIENTO] = fechaISO

  if (direccion)   fields[CLIENTES_FIELDS.DIRECCION]            = direccion
  if (ciudad)      fields[CLIENTES_FIELDS.CIUDAD]               = ciudad
  if (zip)         fields[CLIENTES_FIELDS.ZIP]                  = parseInt(zip, 10)
  if (pesoMeta)    fields[CLIENTES_FIELDS.PESO_META]            = parseInt(pesoMeta, 10)
  if (condiciones) fields[CLIENTES_FIELDS.CONDICIONES_ALERGIAS] = condiciones

  await updateCliente(cliente.id, fields)

  // Send questionnaire invitation email — non-blocking, profile save must not fail if email fails
  const nombre = [firstName, lastName].filter(Boolean).join(' ')
  const lang: 'es' | 'en' = idioma === 'English' ? 'en' : 'es'
  const subject = lang === 'es'
    ? 'Tu cuestionario de síntomas — AQSLIM'
    : 'Your symptom questionnaire — AQSLIM'

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'AQSLIM <contact@aqslim.com>',
      to: email,
      subject,
      html: cuestionarioEmailHtml(nombre, lang),
    })
    console.log(`[saveProfile] Sent questionnaire email to ${email}`)
  } catch (err) {
    console.error('[saveProfile] Failed to send questionnaire email:', err)
  }
}
