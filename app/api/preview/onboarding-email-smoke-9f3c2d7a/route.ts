import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const PREVIEW_BRANCH = 'myaq-ent-p5-1-extended-ai-live-canary'
const TEST_RECIPIENT = 'rom@ituarteconsulting.com'
const PROFILE_URL = 'https://aqslim-git-myaq-ent-p5-1-extended-ai-7a53b6-ituarte33s-projects.vercel.app/my-aqslim/nutrition-profile-preview'
const SQUARE_BOOKING_URL = 'https://square.site/appointments/buyer/widget/46af1166-2cd2-4127-b94f-531a768d54c9/8PN49DRQ1C6TC'

function emailHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.1em;color:#FAFAF8;">AQ<span style="color:#C9A84C;">SLIM</span></span>
        </td></tr>
        <tr><td style="background:#111111;border:1px solid rgba(201,168,76,0.25);padding:40px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;">Prueba Preview</p>
          <h1 style="margin:0 0 16px;font-size:26px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;line-height:1.3;">Bienvenido a AQSLIM</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#9A9590;font-family:Arial,sans-serif;">Prueba controlada del nuevo flujo de onboarding. Completa los siguientes dos pasos:</p>
          <div style="background:#1A1A1A;border:1px solid rgba(201,168,76,0.18);padding:24px;margin-bottom:16px;">
            <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;margin:0 0 6px;">Paso 1 — Agenda tu cita</p>
            <p style="font-size:17px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;margin:0 0 10px;">Reserva tu consulta inicial</p>
            <p style="font-size:13px;line-height:1.75;color:#9A9590;font-family:Arial,sans-serif;margin:0 0 18px;">Square se utiliza únicamente para seleccionar día y horario.</p>
            <a href="${SQUARE_BOOKING_URL}" style="display:inline-block;padding:11px 22px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0A0A0A;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;background:#C9A84C;">Agendar cita →</a>
          </div>
          <div style="background:#1A1A1A;border:1px solid rgba(201,168,76,0.18);padding:24px;margin-bottom:0;">
            <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-family:Arial,sans-serif;margin:0 0 6px;">Paso 2 — Perfil de bienestar y alimentación</p>
            <p style="font-size:17px;font-weight:400;color:#FAFAF8;font-family:Georgia,serif;margin:0 0 10px;">Cuéntanos sobre ti y cómo comes</p>
            <p style="font-size:13px;line-height:1.75;color:#9A9590;font-family:Arial,sans-serif;margin:0 0 18px;">Tus respuestas nos ayudarán a personalizar tu experiencia en My AQSLIM.</p>
            <a href="${PROFILE_URL}" style="display:inline-block;padding:11px 22px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#0A0A0A;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;background:#C9A84C;">Completar perfil →</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== PREVIEW_BRANCH) {
    return NextResponse.json({ ok: false, error: 'preview_only' }, { status: 404 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: 'AQSLIM <contact@aqslim.com>',
    to: TEST_RECIPIENT,
    subject: '[PREVIEW TEST] Tu perfil de bienestar y alimentación — AQSLIM',
    html: emailHtml(),
  })

  if (result.error) {
    console.error('[preview onboarding email smoke] failed', { name: result.error.name })
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: true, destination: 'founder-control-inbox' })
}
