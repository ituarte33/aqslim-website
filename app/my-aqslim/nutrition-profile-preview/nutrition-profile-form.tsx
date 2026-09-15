'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from './nutrition-profile-preview.module.css'

const HEALTH = ['Diabetes','Prediabetes / azúcar alta','Triglicéridos altos','Colesterol alto','Presión alta','Resistencia a la insulina','Tiroides','Hígado graso / enfermedad hepática','Enfermedad renal','Problemas digestivos importantes','Otra','Ninguna']
const PROTEINS = ['Huevo','Pollo','Res','Cerdo','Pescado','Atún','Mariscos','Pavo','Queso','Otra']
const CARBS = ['Tortillas','Pan','Arroz','Pasta','Papa','Frijoles','Cereal','Fruta','Postres','Otro']
const DRINKS = ['Agua','Café','Té','Refresco regular','Refresco sin azúcar','Jugo','Leche','Bebidas energéticas','Alcohol','Otra']
const GOALS = ['Bajar de peso','Controlar azúcar','Mejorar triglicéridos / colesterol','Más energía','Comer mejor','Controlar antojos','Otra']

const STORAGE_PREFIX = 'myaq-nutrition-profile-preview-v1:'

type Props = {
  firstName: string
  fullName: string
  profileId: string
  initialLanguage: 'es' | 'en'
}

function MultiChoice({ name, options, max }: { name: string; options: string[]; max?: number }) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(value: string) {
    setSelected(current => {
      if (current.includes(value)) return current.filter(item => item !== value)
      if (max && current.length >= max) return current
      if (name === 'healthConstraints' && value === 'Ninguna') return ['Ninguna']
      if (name === 'healthConstraints') return [...current.filter(item => item !== 'Ninguna'), value]
      return [...current, value]
    })
  }

  return (
    <div className={styles.choiceGrid}>
      {options.map(option => (
        <label key={option} className={`${styles.choice} ${selected.includes(option) ? styles.choiceActive : ''}`}>
          <input type="checkbox" name={name} value={option} checked={selected.includes(option)} onChange={() => toggle(option)} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  )
}

export function NutritionProfilePreviewForm({ firstName, fullName, profileId, initialLanguage }: Props) {
  const [language] = usePortalLanguage(initialLanguage, profileId)
  const es = language === 'es'
  const [saved, setSaved] = useState(false)
  const [restored, setRestored] = useState<Record<string, unknown> | null>(null)
  const storageKey = `${STORAGE_PREFIX}${profileId}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setRestored(JSON.parse(raw))
    } catch {}
  }, [storageKey])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = {
      version: 1,
      patientRecordId: profileId,
      savedAt: new Date().toISOString(),
      language: es ? 'Español' : 'English',
      healthConstraints: form.getAll('healthConstraints'),
      otherHealthCondition: form.get('otherHealthCondition'),
      allergies: form.get('allergies'),
      medications: form.get('medications'),
      medicationUncertain: form.get('medicationUncertain') === 'on',
      mealsPerDay: form.get('mealsPerDay'),
      breakfast: form.get('breakfast'),
      firstMealTime: form.get('firstMealTime'),
      secondMealTime: form.get('secondMealTime'),
      lastMealTime: form.get('lastMealTime'),
      eatingPattern: form.get('eatingPattern'),
      proteins: form.getAll('proteins'),
      vegetables: form.get('vegetables'),
      carbs: form.getAll('carbs'),
      favoriteDish: form.get('favoriteDish'),
      dislikedFoods: form.get('dislikedFoods'),
      hardestFood: form.get('hardestFood'),
      craving: form.get('craving'),
      drinks: form.getAll('drinks'),
      mealPreparer: form.get('mealPreparer'),
      cookingTime: form.get('cookingTime'),
      restaurantFrequency: form.get('restaurantFrequency'),
      restaurantTypes: form.get('restaurantTypes'),
      mealStructure: form.get('mealStructure'),
      planStyle: form.get('planStyle'),
      goals: form.getAll('goals').slice(0, 2),
      notes: form.get('notes'),
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
    setRestored(data)
    setSaved(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <PortalShell firstName={firstName} profileId={profileId} initialLanguage={initialLanguage}>
      <div className={styles.wrap}>
        <Link href="/my-aqslim" className={styles.back}>← {es ? 'Volver a Inicio' : 'Back to Home'}</Link>
        <p className={styles.eyebrow}>MYAQ-001-NP-001 · PREVIEW</p>
        <h1>{es ? 'Conozcamos cómo comes' : 'Let’s learn how you eat'}</h1>
        <p className={styles.lead}>{es
          ? `Hola, ${firstName}. Esto nos ayuda a personalizar tu plan con información realmente útil: salud relevante, hábitos y alimentos que sí disfrutas.`
          : `Hello, ${firstName}. This helps us personalize your plan using only useful information: relevant health context, habits, and foods you actually enjoy.`}</p>
        <div className={styles.identity}>{es ? 'Perfil' : 'Profile'}: <strong>{fullName}</strong></div>
        <div className={styles.previewNotice}>{es
          ? 'Vista Preview: por ahora estas respuestas se guardan sólo en este dispositivo y no alimentan AQ Buddy ni tu plan.'
          : 'Preview: for now these answers are stored only on this device and do not feed AQ Buddy or your plan.'}</div>
        {saved && <div className={styles.saved}>{es ? '✓ Perfil de prueba guardado en este dispositivo.' : '✓ Test profile saved on this device.'}</div>}
        {restored && !saved && <div className={styles.savedMuted}>{es ? 'Encontramos un borrador local previo en este dispositivo.' : 'A previous local draft was found on this device.'}</div>}

        <form onSubmit={submit} className={styles.form}>
          <section className={styles.section}>
            <span className={styles.number}>01</span>
            <div><h2>{es ? 'Lo importante sobre tu salud' : 'What matters about your health'}</h2><p>{es ? 'Selecciona sólo lo que debemos tomar en cuenta al personalizar tu alimentación.' : 'Select only what we should consider when personalizing your food plan.'}</p></div>
            <MultiChoice name="healthConstraints" options={HEALTH} />
            <label>{es ? 'Otra condición que debamos considerar' : 'Other condition to consider'}<textarea name="otherHealthCondition" /></label>
            <label>{es ? 'Alergias o intolerancias alimentarias' : 'Food allergies or intolerances'}<textarea name="allergies" placeholder={es ? 'Escribe “ninguna” si no tienes.' : 'Write “none” if you do not have any.'} /></label>
            <label>{es ? 'Medicamentos relevantes' : 'Relevant medications'}<textarea name="medications" placeholder={es ? 'Sólo los que quieras que tomemos en cuenta.' : 'Only those you want us to consider.'} /></label>
            <label className={styles.inlineCheck}><input type="checkbox" name="medicationUncertain" /> {es ? 'No estoy seguro de cuáles son relevantes.' : 'I am not sure which medications are relevant.'}</label>
          </section>

          <section className={styles.section}>
            <span className={styles.number}>02</span>
            <div><h2>{es ? 'Cómo comes normalmente' : 'How you usually eat'}</h2></div>
            <div className={styles.twoCols}>
              <label>{es ? '¿Cuántas veces comes al día?' : 'How many times do you eat per day?'}<select name="mealsPerDay" required defaultValue=""><option value="" disabled>—</option>{['1','2','3','4+','Variable'].map(v => <option key={v}>{v}</option>)}</select></label>
              <label>{es ? '¿Desayunas?' : 'Do you eat breakfast?'}<select name="breakfast" defaultValue=""><option value="">—</option>{['Sí, casi todos los días','Algunas veces','Casi nunca'].map(v => <option key={v}>{v}</option>)}</select></label>
            </div>
            <div className={styles.threeCols}>
              <label>{es ? 'Primera comida' : 'First meal'}<input name="firstMealTime" type="time" /></label>
              <label>{es ? 'Segunda comida' : 'Second meal'}<input name="secondMealTime" type="time" /></label>
              <label>{es ? 'Última comida' : 'Last meal'}<input name="lastMealTime" type="time" /></label>
            </div>
            <label>{es ? '¿Dónde comes normalmente?' : 'Where do you usually eat?'}<select name="eatingPattern" defaultValue=""><option value="">—</option>{['Principalmente en casa','Mitad casa / mitad fuera','Frecuentemente fuera','Horario muy variable'].map(v => <option key={v}>{v}</option>)}</select></label>
          </section>

          <section className={styles.section}>
            <span className={styles.number}>03</span>
            <div><h2>{es ? 'Lo que sí te gusta' : 'Foods you actually like'}</h2></div>
            <p className={styles.labelText}>{es ? 'Proteínas que disfrutas' : 'Proteins you enjoy'}</p><MultiChoice name="proteins" options={PROTEINS} />
            <label>{es ? 'Vegetales que sí comes con gusto' : 'Vegetables you enjoy'}<textarea name="vegetables" placeholder={es ? 'Ej.: nopales, brócoli, calabacita, ensalada...' : 'Example: broccoli, zucchini, salad...'} /></label>
            <p className={styles.labelText}>{es ? 'Carbohidratos que comes con frecuencia' : 'Carbohydrates you eat often'}</p><MultiChoice name="carbs" options={CARBS} />
            <label>{es ? 'Tu platillo favorito' : 'Your favorite dish'}<input name="favoriteDish" placeholder={es ? 'Tacos, pozole, carne asada...' : 'Tacos, pasta, steak...'} /></label>
            <label>{es ? 'Alimentos que no te gustan' : 'Foods you dislike'}<textarea name="dislikedFoods" /></label>
            <label>{es ? '¿Qué alimento te costaría más dejar o reducir?' : 'What food would be hardest to reduce?'}<input name="hardestFood" /></label>
            <label>{es ? 'Tu antojo más frecuente' : 'Most common craving'}<select name="craving" defaultValue=""><option value="">—</option>{['Dulce','Pan / harinas','Salado','Botanas','Fruta','Refresco','Pocos antojos','Otro'].map(v => <option key={v}>{v}</option>)}</select></label>
          </section>

          <section className={styles.section}>
            <span className={styles.number}>04</span>
            <div><h2>{es ? 'Bebidas, cocina y restaurantes' : 'Drinks, cooking, and restaurants'}</h2></div>
            <p className={styles.labelText}>{es ? '¿Qué tomas normalmente?' : 'What do you usually drink?'}</p><MultiChoice name="drinks" options={DRINKS} />
            <div className={styles.twoCols}>
              <label>{es ? '¿Quién prepara tus comidas?' : 'Who prepares your meals?'}<select name="mealPreparer" defaultValue=""><option value="">—</option>{['Yo','Pareja / familia','Comida preparada','Variable'].map(v => <option key={v}>{v}</option>)}</select></label>
              <label>{es ? 'Tiempo ideal para cocinar' : 'Ideal cooking time'}<select name="cookingTime" defaultValue=""><option value="">—</option>{['Menos de 10 min','10–20 min','20–30 min','30+ min'].map(v => <option key={v}>{v}</option>)}</select></label>
            </div>
            <label>{es ? '¿Cuántas veces comes fuera por semana?' : 'How often do you eat out per week?'}<select name="restaurantFrequency" defaultValue=""><option value="">—</option>{['Casi nunca','1–2 por semana','3–4 por semana','5+ por semana'].map(v => <option key={v}>{v}</option>)}</select></label>
            <label>{es ? 'Restaurantes o tipos de comida que frecuentas' : 'Restaurants or cuisines you frequent'}<textarea name="restaurantTypes" placeholder={es ? 'Mexicana, italiana, comida rápida, Olive Garden...' : 'Mexican, Italian, fast food, Olive Garden...'} /></label>
          </section>

          <section className={styles.section}>
            <span className={styles.number}>05</span>
            <div><h2>{es ? 'Cómo quieres que sea tu plan' : 'How you want your plan to feel'}</h2></div>
            <div className={styles.twoCols}>
              <label>{es ? 'Estructura de comidas' : 'Meal structure'}<select name="mealStructure" defaultValue=""><option value="">—</option>{['2 comidas','3 comidas','3 comidas + snack','OMAD','Recomiéndame una'].map(v => <option key={v}>{v}</option>)}</select></label>
              <label>{es ? 'Estilo del plan' : 'Plan style'}<select name="planStyle" defaultValue=""><option value="">—</option>{['Muy estructurado','Con opciones','Flexible'].map(v => <option key={v}>{v}</option>)}</select></label>
            </div>
            <p className={styles.labelText}>{es ? 'Tus metas principales — máximo 2' : 'Your main goals — choose up to 2'}</p><MultiChoice name="goals" options={GOALS} max={2} />
            <label>{es ? 'Algo más que quieras que sepamos' : 'Anything else you want us to know'}<textarea name="notes" /></label>
          </section>

          <div className={styles.footerActions}>
            <button type="submit">{es ? 'Guardar perfil de prueba' : 'Save test profile'}</button>
            <small>{es ? 'Preview local · todavía no cambia tu plan.' : 'Local Preview · does not change your plan yet.'}</small>
          </div>
        </form>
      </div>
    </PortalShell>
  )
}
