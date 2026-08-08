import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from './system-prompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ChatMessage = Anthropic.MessageParam

const DIABETES_TERMS = /\b(diabetes|diabetic|diabetico|diabetica|diabeticos|diabeticas|glucose|glucosa|blood sugar|azucar(?: en la sangre)?)\b/i
const MEDICATION_TERMS = /\b(medication|medications|medicine|medicines|medicina|medicinas|medicamento|medicamentos|insulin|insulina|dose|dosage|dosis|metformin|metformina|glucose[- ]lowering|baja(?:n|r)? la glucosa|controlar el azucar)\b/i
const CARB_REDUCTION_TERMS = /\b(jing|fasting|fast|ayuno|low[- ]carb|keto|ketogenic|carbohydrate reduction|reduce carbohydrates|reducing carbohydrates|menos de 20|less than 20|reducir (?:mucho |drasticamente )?(?:los )?carbohidratos|bajar (?:mucho |drasticamente )?(?:los )?carbohidratos)\b/i

const DIABETES_MEDICATION_SAFETY_ES = `**Información de seguridad importante**

No empieces la Fase Jing, un ayuno ni una reducción importante de carbohidratos hasta hablar con el médico o profesional autorizado que controla tu diabetes. No suspendas, reduzcas, aumentes ni cambies tus medicamentos por tu cuenta. Al reducir considerablemente los carbohidratos mientras usas insulina o ciertos medicamentos, puede presentarse hipoglucemia (azúcar peligrosamente baja) y tu profesional puede necesitar ajustar tanto el tratamiento como el monitoreo de glucosa.

Si ya presentas temblor, sudoración, mareo, confusión, debilidad intensa, dificultad para caminar o hablar, desmayo, convulsiones o una lectura peligrosamente baja, suspende cualquier orientación nutricional, sigue el plan de emergencia para hipoglucemia que te haya indicado tu equipo médico y busca ayuda médica inmediata. Si estás inconsciente, tienes convulsiones, no puedes tragar con seguridad o no puedes tratarte por ti mismo, alguien cercano debe llamar inmediatamente a los servicios de emergencia; en Estados Unidos, al 911. No se debe dar comida ni bebida a una persona inconsciente.

AQ Buddy puede ayudarte a entender las fases de AQSLIM y a preparar preguntas para tu médico, pero no puede autorizar el cambio nutricional ni ajustar medicamentos.`

const DIABETES_MEDICATION_SAFETY_EN = `**Important safety information**

Do not begin the Jing Phase, fasting, or a major carbohydrate reduction until you speak with the physician or licensed professional who manages your diabetes. Do not stop, reduce, increase, or otherwise change medication on your own. Substantially reducing carbohydrates while using insulin or certain medications can cause hypoglycemia (dangerously low blood sugar), and your clinician may need to adjust both treatment and glucose monitoring.

If you are already experiencing shaking, sweating, dizziness, confusion, marked weakness, trouble walking or speaking, fainting, seizure, or a dangerously low reading, stop nutrition coaching, follow the hypoglycemia emergency plan provided by your medical team, and seek immediate medical help. If you are unconscious, having a seizure, cannot swallow safely, or cannot treat yourself, someone nearby should call emergency services immediately; in the United States, call 911. An unconscious person should not be given food or drink.

AQ Buddy can help you understand AQSLIM phases and prepare questions for your clinician, but it cannot authorize the nutrition change or adjust medication.`

function messageText(message: ChatMessage | undefined) {
  if (!message) return ''
  if (typeof message.content === 'string') return message.content
  return message.content
    .filter((block): block is Anthropic.TextBlockParam => block.type === 'text')
    .map((block) => block.text)
    .join(' ')
}

function requiresDiabetesMedicationSafety(messages: ChatMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  const text = messageText(latestUserMessage)

  return (
    DIABETES_TERMS.test(text) &&
    MEDICATION_TERMS.test(text) &&
    CARB_REDUCTION_TERMS.test(text)
  )
}

function safetyBlockFor(text: string) {
  const looksSpanish = /[¿¡áéíóúñ]|\b(tengo|tomo|quiero|como|medicamentos|azucar|carbohidratos|ayuno)\b/i.test(text)
  return looksSpanish
    ? DIABETES_MEDICATION_SAFETY_ES
    : DIABETES_MEDICATION_SAFETY_EN
}

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json()
  const latestUserText = messageText(
    [...messages].reverse().find((message) => message.role === 'user')
  )
  const requiredSafetyBlock = requiresDiabetesMedicationSafety(messages)
    ? safetyBlockFor(latestUserText)
    : null

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        if (requiredSafetyBlock) {
          controller.enqueue(encoder.encode(`\n\n---\n\n${requiredSafetyBlock}`))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
