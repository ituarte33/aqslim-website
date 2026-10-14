import type { Cliente, Consulta, CuestionarioSintoma } from './airtable'

const PUBLICATION_LINE = /^Origen verificado: CLINIC-PREVIEW:[A-Za-z0-9]+\s*$/gm

function text(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item)).join(', ')
  return value == null ? '' : String(value).trim()
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function visibleClinicTherapistNotes(value: unknown) {
  return text(value)
    .replace(PUBLICATION_LINE, '')
    .replace(/^\s*\n/gm, '')
    .trim()
}

export function buildClinicRecordSnapshot(input: {
  patient: Cliente
  consultations: Consulta[]
  questionnaires: CuestionarioSintoma[]
}) {
  const patientFields = input.patient.fields
  return {
    patient: {
      id: input.patient.id,
      birthDate: text(patientFields['Fecha Nacimiento']),
      age: number(patientFields['Edad']),
      sex: text(patientFields['Sexo']),
      heightCm: number(patientFields['Estatura (cm)']),
      goalWeight: number(patientFields['Peso Meta']),
      weightUnit: text(patientFields['Unidad de Peso']),
      conditionsAllergies: text(patientFields['Condiciones Especiales / Alergias']),
    },
    consultations: input.consultations.map(record => {
      const fields = record.fields
      return {
        id: record.id,
        source: 'clinic' as const,
        consultationDate: text(fields['Fecha Consulta']) || null,
        consultationType: text(fields['Tipo de Consulta']),
        weightKg: number(fields['Peso (kg)']),
        bodyFat: number(fields['% Grasa Corporal']),
        bmi: number(fields['IMC']),
        waistCm: number(fields['Cintura (cm)']),
        hipsCm: number(fields['Cadera (cm)']),
        armsCm: number(fields['Brazos (cm)']),
        thighsCm: number(fields['Muslos (cm)']),
        chestCm: number(fields['Pecho/Busto (cm)']),
        dietCompliance: number(fields['Cumplimiento Dieta (1-10)']),
        feeling: number(fields['Cómo Se Siente (1-10)']),
        energy: text(fields['Nivel de Energía']),
        sleep: text(fields['Calidad de Sueño']),
        anxiety: typeof fields['¿Ansiedad?'] === 'boolean' ? fields['¿Ansiedad?'] : null,
        hunger: typeof fields['¿Tuvo Hambre?'] === 'boolean' ? fields['¿Tuvo Hambre?'] : null,
        recommendations: text(fields['Recomendaciones al Cliente']),
        therapistNotes: visibleClinicTherapistNotes(fields['Notas del Terapeuta']),
        nextAppointment: text(fields['Próxima Cita']) || null,
        paymentMethod: text(fields['Método de Pago']),
        totalCollected: number(fields['Monto Cobrado ($)']),
        consultationCollected: number(fields['Consulta Cobrado ($)']),
        supplementsCollected: number(fields['Suplemento(s) Cobrado ($)']),
        shippingCollected: number(fields['Envio (Shipping) Cobrado ($)']),
      }
    }),
    questionnaires: input.questionnaires.map(record => ({
      id: record.id,
      source: 'clinic' as const,
      recordedAt: record.createdTime || null,
      total: number(record.fields['TOTAL GENERAL']),
      toxicityLevel: text(record.fields['Nivel de toxicidad']),
      prioritySystem: text(record.fields['Sistema Prioritarios']),
      secondarySystem: text(record.fields['Sistema Secundario']),
      protocol: text(record.fields['Rec. de Protocolo']),
      observations: text(record.fields['Observaciones']),
    })),
  }
}
