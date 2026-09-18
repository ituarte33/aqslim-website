export type ClinicAccessInvitationDraft = {
  subject: string
  body: string
  language: 'es' | 'en'
}

function isEnglish(language: string): boolean {
  const normalized = language.trim().toLowerCase()
  return normalized.startsWith('en') || normalized.includes('ingl') || normalized.includes('english')
}

export function buildClinicAccessInvitationDraft({
  patientName,
  preferredLanguage,
}: {
  patientName: string
  preferredLanguage: string
}): ClinicAccessInvitationDraft {
  const name = patientName.trim() || 'Paciente'
  if (isEnglish(preferredLanguage)) {
    return {
      language: 'en',
      subject: 'Your My AQSLIM access',
      body: `Hello ${name},\n\nWe are preparing your access to My AQSLIM, where you will be able to review your AQSLIM plan and available support tools.\n\nWe will send you the activation instructions once your access is ready.\n\nStrong, Healthy and Happy.\nAQSLIM`,
    }
  }

  return {
    language: 'es',
    subject: 'Tu acceso a My AQSLIM',
    body: `Hola ${name},\n\nEstamos preparando tu acceso a My AQSLIM, donde podrás consultar tu plan AQSLIM y las herramientas de apoyo disponibles.\n\nTe enviaremos las instrucciones de activación cuando tu acceso esté listo.\n\nFuerte, Sano y Feliz.\nAQSLIM`,
  }
}
