import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from './system-prompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type ChatMessage = Anthropic.MessageParam

const DIABETES_TERMS = /\b(diabetes|diabetic|diabetico|diabetica|diabeticos|diabeticas|glucose|glucosa|blood sugar|azucar(?: en la sangre)?)\b/i
const MEDICATION_TERMS = /\b(medication|medications|medicine|medicines|medicina|medicinas|medicamento|medicamentos|insulin|insulina|dose|dosage|dosis|metformin|metformina|glucose[- ]lowering|baja(?:n|r)? la glucosa|controlar el azucar)\b/i
const CARB_REDUCTION_TERMS = /\b(jing|fasting|fast|ayuno|low[- ]carb|keto|ketogenic|carbohydrate reduction|reduce carbohydrates|reducing carbohydrates|menos de 20|less than 20|reducir (?:mucho |drasticamente )?(?:los )?carbohidratos|bajar (?:mucho |drasticamente )?(?:los )?carbohidratos)\b/i
const PREGNANCY_TERMS = /\b(pregnant|pregnancy|expecting|embarazada|embarazo|gestante|gestacion)\b/i
const PREGNANCY_RESTRICTION_TERMS = /\b(jing|fasting|fast|ayuno|low[- ]carb|keto|ketogenic|carbohydrate reduction|reduce carbohydrates|reducing carbohydrates|menos de 20|less than 20|weight loss|lose weight|losing weight|bajar de peso|perder peso|adelgazar|reducir (?:mucho |drasticamente )?(?:los )?carbohidratos|bajar (?:mucho |drasticamente )?(?:los )?carbohidratos)\b/i
const BREASTFEEDING_TERMS = /\b(breastfeed|breastfeeding|breastfed|lactation|lactating|amamantando|amamantar|lactancia|dando pecho|dar el pecho)\b|\bnursing (?:my |a |an )?(?:baby|infant|newborn)\b/i
const BREASTFEEDING_RESTRICTION_TERMS = /\b(jing|fasting|fast|ayuno|low[- ]carb|keto|ketogenic|carbohydrate reduction|reduce carbohydrates|reducing carbohydrates|menos de 20|less than 20|weight loss|lose weight|losing weight|bajar de peso|perder peso|adelgazar|reducir (?:mucho |drasticamente )?(?:los )?carbohidratos|bajar (?:mucho |drasticamente )?(?:los )?carbohidratos)\b/i
const FAST36_TERMS = /\bfast\s*36\b|\b36[- ]?hour fast(?:ing|s)?\b|\bayuno(?:s)? de 36 horas\b/i

const DIABETES_MEDICATION_SAFETY_ES = `**Información de seguridad importante**

No empieces la Fase Jing, un ayuno ni una reducción importante de carbohidratos hasta hablar con el médico o profesional autorizado que controla tu diabetes. No suspendas, reduzcas, aumentes ni cambies tus medicamentos por tu cuenta. Al reducir considerablemente los carbohidratos mientras usas insulina o ciertos medicamentos, puede presentarse hipoglucemia (azúcar peligrosamente baja) y tu profesional puede necesitar ajustar tanto el tratamiento como el monitoreo de glucosa.

Si ya presentas temblor, sudoración, mareo, confusión, debilidad intensa, dificultad para caminar o hablar, desmayo, convulsiones o una lectura peligrosamente baja, suspende cualquier orientación nutricional, sigue el plan de emergencia para hipoglucemia que te haya indicado tu equipo médico y busca ayuda médica inmediata. Si estás inconsciente, tienes convulsiones, no puedes tragar con seguridad o no puedes tratarte por ti mismo, alguien cercano debe llamar inmediatamente a los servicios de emergencia; en Estados Unidos, al 911. No se debe dar comida ni bebida a una persona inconsciente.

AQ Buddy puede ayudarte a entender las fases de AQSLIM y a preparar preguntas para tu médico, pero no puede autorizar el cambio nutricional ni ajustar medicamentos.`

const DIABETES_MEDICATION_SAFETY_EN = `**Important safety information**

Do not begin the Jing Phase, fasting, or a major carbohydrate reduction until you speak with the physician or licensed professional who manages your diabetes. Do not stop, reduce, increase, or otherwise change medication on your own. Substantially reducing carbohydrates while using insulin or certain medications can cause hypoglycemia (dangerously low blood sugar), and your clinician may need to adjust both treatment and glucose monitoring.

If you are already experiencing shaking, sweating, dizziness, confusion, marked weakness, trouble walking or speaking, fainting, seizure, or a dangerously low reading, stop nutrition coaching, follow the hypoglycemia emergency plan provided by your medical team, and seek immediate medical help. If you are unconscious, having a seizure, cannot swallow safely, or cannot treat yourself, someone nearby should call emergency services immediately; in the United States, call 911. An unconscious person should not be given food or drink.

AQ Buddy can help you understand AQSLIM phases and prepare questions for your clinician, but it cannot authorize the nutrition change or adjust medication.`

const PREGNANCY_SAFETY_ES = `**Información de seguridad importante — embarazo**

Durante el embarazo, AQSLIM no debe iniciar la Fase Jing, ayunos prolongados, dietas cetogénicas o muy bajas en carbohidratos ni un protocolo intencional para bajar de peso. No hagas una restricción importante de alimentos o carbohidratos siguiendo indicaciones de AQ Buddy. La meta de peso durante el embarazo debe establecerse con tu obstetra, partera u otro profesional prenatal autorizado según tu situación individual. Cualquier plan nutricional especial durante el embarazo debe quedar bajo la dirección de ese profesional.

Busca atención médica inmediata si durante el embarazo presentas sangrado vaginal mayor que un manchado, pérdida de líquido, desmayo, dificultad para respirar, dolor intenso de pecho, dolor abdominal intenso que no desaparece, dolor de cabeza intenso que no cede o empeora, o cambios importantes en la visión. Esta lista no incluye todas las posibles señales de alarma. Si los síntomas son graves o existe peligro inmediato, llama a los servicios de emergencia; en Estados Unidos, al 911.

AQ Buddy puede ayudarte a comprender información general de AQSLIM y a preparar preguntas para tu profesional prenatal, pero no puede autorizar Jing, ayunos, pérdida de peso ni una dieta restrictiva durante el embarazo.`

const PREGNANCY_SAFETY_EN = `**Important safety information — pregnancy**

During pregnancy, AQSLIM should not start the Jing Phase, prolonged fasting, ketogenic or very-low-carbohydrate diets, or an intentional weight-loss protocol. Do not make major food or carbohydrate restrictions based on AQ Buddy guidance. Your pregnancy weight goal should be established with your obstetrician, midwife, or other licensed prenatal clinician based on your individual circumstances. Any special nutrition plan during pregnancy should remain under that clinician's direction.

Seek immediate medical care during pregnancy for vaginal bleeding that is more than spotting, leaking fluid, fainting, trouble breathing, severe chest pain, severe belly pain that does not go away, a severe headache that will not go away or is getting worse, or major vision changes. This is not a complete list of warning signs. If symptoms are severe or there is immediate danger, call emergency services; in the United States, call 911.

AQ Buddy can help you understand general AQSLIM information and prepare questions for your prenatal clinician, but it cannot authorize Jing, fasting, weight loss, or a restrictive diet during pregnancy.`

const BREASTFEEDING_SAFETY_ES = `**Información de seguridad importante — lactancia**

Durante la lactancia exclusiva temprana, especialmente en las primeras semanas después del parto, AQSLIM no debe iniciar la Fase Jing, ayunos de 36 horas, dietas cetogénicas o muy bajas en carbohidratos ni prescribir una velocidad de pérdida de peso. No hagas una restricción importante de alimentos o carbohidratos siguiendo indicaciones de AQ Buddy. Antes de intentar bajar de peso o cambiar de forma considerable tu alimentación, consulta al médico u obstetra que atiende tu recuperación posparto y, cuando corresponda, al pediatra y a un especialista acreditado en lactancia. Cualquier plan debe individualizarse para proteger la nutrición, energía y bienestar de la madre, la producción de leche y la alimentación y crecimiento del bebé.

Suspende cualquier protocolo restrictivo y comunícate prontamente con el pediatra o especialista en lactancia si notas una reducción marcada en la producción de leche, si el bebé mama mucho menos o no se escucha que trague, moja menos pañales de lo esperado, presenta somnolencia inusual o no aumenta de peso como espera su pediatra. Busca atención médica inmediata por señales maternas posparto como desmayo, dificultad para respirar, dolor de pecho, convulsiones, sangrado vaginal abundante, fiebre de 100.4 °F (38 °C) o más, dolor de cabeza intenso que no cede o empeora, cambios importantes en la visión o pensamientos de hacerte daño o dañar al bebé. Esta lista no incluye todas las posibles señales de alarma. Si los síntomas son graves o existe peligro inmediato, llama a los servicios de emergencia; en Estados Unidos, al 911.

AQ Buddy puede ayudarte a comprender información general de AQSLIM y a preparar preguntas para tus profesionales, pero no puede autorizar Jing, ayunos, una dieta restrictiva ni establecer una meta o velocidad de pérdida de peso durante la lactancia.`

const BREASTFEEDING_SAFETY_EN = `**Important safety information — breastfeeding**

During early exclusive breastfeeding, especially in the first weeks after delivery, AQSLIM should not start the Jing Phase, 36-hour fasts, ketogenic or very-low-carbohydrate diets, or prescribe a rate of weight loss. Do not make major food or carbohydrate restrictions based on AQ Buddy guidance. Before trying to lose weight or substantially changing your diet, consult the physician or obstetric clinician managing your postpartum recovery and, when appropriate, the baby's pediatrician and a credentialed lactation specialist. Any plan should be individualized to protect the mother's nutrition, energy, and well-being, milk production, and the baby's feeding and growth.

Stop any restrictive protocol and promptly contact the pediatrician or lactation specialist if you notice a marked drop in milk production, the baby feeds much less or you cannot hear swallowing, has fewer wet diapers than expected, is unusually sleepy, or is not gaining weight as expected by the pediatrician. Seek immediate medical care for postpartum maternal warning signs such as fainting, trouble breathing, chest pain, seizure, heavy vaginal bleeding, a fever of 100.4°F (38°C) or higher, a severe headache that will not go away or is getting worse, major vision changes, or thoughts of harming yourself or the baby. This is not a complete list of warning signs. If symptoms are severe or there is immediate danger, call emergency services; in the United States, call 911.

AQ Buddy can help you understand general AQSLIM information and prepare questions for your clinicians, but it cannot authorize Jing, fasting, a restrictive diet, or set a weight-loss goal or rate while breastfeeding.`

const FAST36_SAFETY_ES = `**Información importante — Fast36**

Fast36 está en evaluación y actualmente no es un protocolo oficial de AQSLIM disponible para pacientes. No forma parte de la Fase Jing y AQ Buddy no debe enseñarte cómo realizarlo, programarlo ni iniciarlo.

No recurras a Rom, Hillary ni al equipo de AQSLIM para obtener autorización clínica sobre un ayuno prolongado. Si tienes una condición médica, tomas medicamentos o existe cualquier duda sobre si un ayuno sería seguro para ti, esa decisión debe revisarse con el profesional de salud autorizado que conozca tu situación.

El equipo de AQSLIM puede ayudarte únicamente con información general y apoyo operativo sobre los programas actualmente disponibles.`

const FAST36_SAFETY_EN = `**Important information — Fast36**

Fast36 is under evaluation and is not currently an official AQSLIM patient-facing protocol. It is not part of the Jing Phase, and AQ Buddy should not teach you how to perform, schedule, or start it.

Do not rely on Rom, Hillary, or the AQSLIM team for clinical clearance for prolonged fasting. If you have a medical condition, take medications, or there is any question about whether fasting would be safe for you, that decision must be reviewed with the licensed healthcare professional who knows your situation.

The AQSLIM team may help only with general information and non-clinical operational support about programs that are currently available.`

const MEDICAL_SAFETY_RESPONSE_BOUNDARY = `
MEDICAL SAFETY RESPONSE BOUNDARY — MANDATORY

One or more deterministic medical safety protections apply to this response.

- Do not mention Rom, Romulo, Hillary, or any AQSLIM employee or team member by name.
- Refer only to "the AQSLIM team" in English or "el equipo de AQSLIM" in Spanish, and only for non-clinical operational support.
- Never state or imply that the AQSLIM team can perform a medical or professional clinical evaluation, authorize a restrictive diet or fasting protocol, or design a clinical nutrition plan for the user, a pregnancy, or a baby.
- Clinical decisions must be directed to the appropriate licensed healthcare professional identified in the applicable safety block.
- The AQSLIM team may only help explain general AQSLIM information, document relevant circumstances, and help the user prepare questions for licensed healthcare professionals.
- Do not claim that dietary restriction will necessarily change breast-milk quality. When relevant, use cautious language about possible effects on maternal intake or energy, milk production, and the well-being of mother and baby.
- Do not contradict, weaken, or qualify the deterministic safety information that will be appended after the response.
`

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

function requiresPregnancySafety(messages: ChatMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  const text = messageText(latestUserMessage)

  return PREGNANCY_TERMS.test(text) && PREGNANCY_RESTRICTION_TERMS.test(text)
}

function requiresBreastfeedingSafety(messages: ChatMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  const text = messageText(latestUserMessage)

  return (
    BREASTFEEDING_TERMS.test(text) &&
    BREASTFEEDING_RESTRICTION_TERMS.test(text)
  )
}

function requiresFast36Safety(messages: ChatMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  return FAST36_TERMS.test(messageText(latestUserMessage))
}

function looksSpanish(text: string) {
  return /[¿¡áéíóúñ]|\b(tengo|tomo|quiero|deseo|como|medicamentos|azucar|carbohidratos|ayuno|embarazada|embarazo|amamantando|amamantar|lactancia|bajar de peso|dando pecho|dar el pecho)\b/i.test(text)
}

function diabetesSafetyBlockFor(text: string) {
  return looksSpanish(text)
    ? DIABETES_MEDICATION_SAFETY_ES
    : DIABETES_MEDICATION_SAFETY_EN
}

function pregnancySafetyBlockFor(text: string) {
  return looksSpanish(text) ? PREGNANCY_SAFETY_ES : PREGNANCY_SAFETY_EN
}

function breastfeedingSafetyBlockFor(text: string) {
  return looksSpanish(text)
    ? BREASTFEEDING_SAFETY_ES
    : BREASTFEEDING_SAFETY_EN
}

function fast36SafetyBlockFor(text: string) {
  return looksSpanish(text) ? FAST36_SAFETY_ES : FAST36_SAFETY_EN
}

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json()
  const latestUserText = messageText(
    [...messages].reverse().find((message) => message.role === 'user')
  )
  const requiredSafetyBlocks = [
    requiresFast36Safety(messages)
      ? fast36SafetyBlockFor(latestUserText)
      : null,
    requiresDiabetesMedicationSafety(messages)
      ? diabetesSafetyBlockFor(latestUserText)
      : null,
    requiresPregnancySafety(messages)
      ? pregnancySafetyBlockFor(latestUserText)
      : null,
    requiresBreastfeedingSafety(messages)
      ? breastfeedingSafetyBlockFor(latestUserText)
      : null,
  ].filter((block): block is string => Boolean(block))

  const systemPrompt =
    requiredSafetyBlocks.length > 0
      ? `${SYSTEM_PROMPT}\n\n${MEDICAL_SAFETY_RESPONSE_BOUNDARY}`
      : SYSTEM_PROMPT

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
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
        if (requiredSafetyBlocks.length > 0) {
          controller.enqueue(
            encoder.encode(`\n\n---\n\n${requiredSafetyBlocks.join('\n\n---\n\n')}`)
          )
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
