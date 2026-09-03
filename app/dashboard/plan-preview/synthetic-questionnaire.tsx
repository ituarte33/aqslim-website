'use client'

import { useState, type FormEvent } from 'react'
import {
  buildSyntheticQuestionnaireProfile,
  type QuestionnaireValidationError,
  type SyntheticQuestionnaireAnswers,
} from '@/lib/nutrition/questionnaire-profile'
import type { NutritionProfile } from '@/lib/nutrition/types'
import styles from './plan-preview.module.css'

type Props = {
  lang: 'es' | 'en'
  onGenerate: (profile: NutritionProfile) => void
}

type FoodOption = { value: string; es: string; en: string }
type FoodField = 'preferredFoods' | 'dislikedFoods' | 'excludedFoods'

const PREFERRED_FOODS: readonly FoodOption[] = [
  { value: 'chicken', es: 'Pollo', en: 'Chicken' },
  { value: 'sirloin', es: 'Bistec', en: 'Steak' },
  { value: 'ground beef', es: 'Carne molida', en: 'Ground beef' },
  { value: 'tilapia', es: 'Tilapia', en: 'Tilapia' },
  { value: 'egg', es: 'Huevo', en: 'Egg' },
  { value: 'nopales', es: 'Nopales', en: 'Nopales' },
  { value: 'spinach', es: 'Espinaca', en: 'Spinach' },
]

const DISLIKED_FOODS: readonly FoodOption[] = [
  { value: 'pork', es: 'Cerdo', en: 'Pork' },
  { value: 'fish', es: 'Pescado', en: 'Fish' },
  { value: 'egg', es: 'Huevo', en: 'Egg' },
  { value: 'chicken', es: 'Pollo', en: 'Chicken' },
  { value: 'sirloin', es: 'Bistec', en: 'Steak' },
  { value: 'ground beef', es: 'Carne molida', en: 'Ground beef' },
]

const EXCLUDED_FOODS: readonly FoodOption[] = [
  { value: 'dairy', es: 'Lácteos', en: 'Dairy' },
  { value: 'egg', es: 'Huevo', en: 'Egg' },
  { value: 'fish', es: 'Pescado', en: 'Fish' },
  { value: 'pork', es: 'Cerdo', en: 'Pork' },
]

const INITIAL_ANSWERS: SyntheticQuestionnaireAnswers = {
  ageYears: 45,
  equationSex: 'female',
  heightFeet: 5,
  heightInches: 5,
  currentWeightLb: 220,
  goalWeightLb: 170,
  activityLevel: 'sedentary',
  mealCount: 3,
  preferredFoods: ['chicken', 'tilapia'],
  dislikedFoods: ['pork'],
  excludedFoods: [],
  medicationReview: 'none',
}

const ERROR_COPY: Record<QuestionnaireValidationError, { es: string; en: string }> = {
  invalid_age: { es: 'La edad debe estar entre 18 y 85 años.', en: 'Age must be between 18 and 85.' },
  invalid_height: { es: 'La estatura debe estar entre 4 y 7 pies, con 0–11 pulgadas.', en: 'Height must be between 4 and 7 feet, with 0–11 inches.' },
  invalid_current_weight: { es: 'El peso actual debe estar entre 100 y 770 lb para esta prueba.', en: 'Current weight must be between 100 and 770 lb for this test.' },
  invalid_goal_weight: { es: 'La meta debe ser menor que el peso actual y de al menos 100 lb.', en: 'Goal weight must be below current weight and at least 100 lb.' },
  invalid_meal_count: { es: 'Selecciona dos o tres comidas.', en: 'Select two or three meals.' },
}

export function SyntheticQuestionnaire({ lang, onGenerate }: Props) {
  const [answers, setAnswers] = useState<SyntheticQuestionnaireAnswers>(INITIAL_ANSWERS)
  const [errors, setErrors] = useState<QuestionnaireValidationError[]>([])
  const [generated, setGenerated] = useState(false)
  const es = lang === 'es'

  function setNumber(field: 'ageYears' | 'heightFeet' | 'heightInches' | 'currentWeightLb' | 'goalWeightLb', value: string) {
    setAnswers(current => ({ ...current, [field]: Number(value) }))
    setGenerated(false)
  }

  function setAnswer<K extends keyof SyntheticQuestionnaireAnswers>(field: K, value: SyntheticQuestionnaireAnswers[K]) {
    setAnswers(current => ({ ...current, [field]: value }))
    setGenerated(false)
  }

  function toggleFood(field: FoodField, value: string) {
    setAnswers(current => {
      const active = current[field].includes(value)
      const next = active ? current[field].filter(item => item !== value) : [...current[field], value]
      const otherFields = (['preferredFoods', 'dislikedFoods', 'excludedFoods'] as const).filter(item => item !== field)
      return {
        ...current,
        [field]: next,
        [otherFields[0]]: active ? current[otherFields[0]] : current[otherFields[0]].filter(item => item !== value),
        [otherFields[1]]: active ? current[otherFields[1]] : current[otherFields[1]].filter(item => item !== value),
      }
    })
    setGenerated(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = buildSyntheticQuestionnaireProfile(answers)
    setErrors(result.errors)
    if (!result.profile) {
      setGenerated(false)
      return
    }
    onGenerate(result.profile)
    setGenerated(true)
  }

  function foodChoices(field: FoodField, options: readonly FoodOption[]) {
    return (
      <div className={styles.questionnaireChoices}>
        {options.map(option => (
          <label key={`${field}-${option.value}`}>
            <input
              type="checkbox"
              checked={answers[field].includes(option.value)}
              onChange={() => toggleFood(field, option.value)}
            />
            <span>{option[lang]}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <details className={styles.questionnaire} open>
      <summary>
        <span>{es ? 'Cuestionario sintético v0.1' : 'Synthetic questionnaire v0.1'}</span>
        <strong>{es ? 'Crear un perfil sin datos reales' : 'Create a profile without real data'}</strong>
        <small>{es ? 'Abrir/cerrar' : 'Open/close'}</small>
      </summary>
      <form onSubmit={submit}>
        <div className={styles.questionnaireNotice}>
          <strong>{es ? 'Sólo para pruebas ficticias' : 'Fictional testing only'}</strong>
          <span>{es
            ? 'No escribas nombres, diagnósticos ni medicamentos. Las respuestas no se guardan; al guardar, sólo el perfil y plan sintéticos quedan en el registro seguro de Preview.'
            : 'Do not enter names, diagnoses, or medications. Answers are not saved; when saved, only the synthetic profile and plan enter the secure Preview record.'}</span>
        </div>

        <fieldset className={styles.questionnaireSection}>
          <legend>{es ? '1 · Datos para el cálculo' : '1 · Calculation inputs'}</legend>
          <div className={styles.questionnaireGrid}>
            <label><span>{es ? 'Edad' : 'Age'}</span><input type="number" min="18" max="85" value={answers.ageYears} onChange={event => setNumber('ageYears', event.target.value)} /></label>
            <label><span>{es ? 'Cálculo biológico' : 'Biological calculation'}</span><select value={answers.equationSex} onChange={event => setAnswer('equationSex', event.target.value as 'female' | 'male')}><option value="female">{es ? 'Femenino' : 'Female'}</option><option value="male">{es ? 'Masculino' : 'Male'}</option></select></label>
            <label><span>{es ? 'Estatura · pies' : 'Height · feet'}</span><input type="number" min="4" max="7" value={answers.heightFeet} onChange={event => setNumber('heightFeet', event.target.value)} /></label>
            <label><span>{es ? 'Estatura · pulgadas' : 'Height · inches'}</span><input type="number" min="0" max="11" value={answers.heightInches} onChange={event => setNumber('heightInches', event.target.value)} /></label>
            <label><span>{es ? 'Peso actual · lb' : 'Current weight · lb'}</span><input type="number" min="100" max="770" value={answers.currentWeightLb} onChange={event => setNumber('currentWeightLb', event.target.value)} /></label>
            <label><span>{es ? 'Meta de peso · lb' : 'Goal weight · lb'}</span><input type="number" min="100" max="769" value={answers.goalWeightLb} onChange={event => setNumber('goalWeightLb', event.target.value)} /></label>
            <label><span>{es ? 'Actividad habitual' : 'Usual activity'}</span><select value={answers.activityLevel} onChange={event => setAnswer('activityLevel', event.target.value as SyntheticQuestionnaireAnswers['activityLevel'])}><option value="sedentary">{es ? 'Baja' : 'Low'}</option><option value="light">{es ? 'Ligera' : 'Light'}</option><option value="moderate">{es ? 'Moderada' : 'Moderate'}</option></select></label>
          </div>
        </fieldset>

        <fieldset className={styles.questionnaireSection}>
          <legend>{es ? '2 · Comidas y preferencias' : '2 · Meals and preferences'}</legend>
          <div className={styles.questionnaireRadioRow}>
            <label><input type="radio" name="meal-count" checked={answers.mealCount === 2} onChange={() => setAnswer('mealCount', 2)} /><span>{es ? '2 comidas' : '2 meals'}</span></label>
            <label><input type="radio" name="meal-count" checked={answers.mealCount === 3} onChange={() => setAnswer('mealCount', 3)} /><span>{es ? '3 comidas' : '3 meals'}</span></label>
          </div>
          <div className={styles.foodQuestion}><strong>{es ? 'Priorizar' : 'Prioritize'}</strong><small>{es ? 'Elige lo que le gusta al perfil ficticio.' : 'Choose what the fictional profile likes.'}</small>{foodChoices('preferredFoods', PREFERRED_FOODS)}</div>
          <div className={styles.foodQuestion}><strong>{es ? 'No le gusta' : 'Dislikes'}</strong><small>{es ? 'AQ Buddy no lo incluirá.' : 'AQ Buddy will not include it.'}</small>{foodChoices('dislikedFoods', DISLIKED_FOODS)}</div>
          <div className={styles.foodQuestion}><strong>{es ? 'Exclusión estricta' : 'Strict exclusion'}</strong><small>{es ? 'Tiene prioridad sobre cualquier gusto.' : 'This overrides every preference.'}</small>{foodChoices('excludedFoods', EXCLUDED_FOODS)}</div>
        </fieldset>

        <fieldset className={styles.questionnaireSection}>
          <legend>{es ? '3 · Revisión antes de publicar' : '3 · Review before publishing'}</legend>
          <p>{es
            ? '¿Este perfil ficticio representa a alguien cuyos medicamentos deben ser revisados por el equipo antes de publicar el plan?'
            : 'Does this fictional profile represent someone whose medications must be reviewed by the team before publishing the plan?'}</p>
          <div className={styles.questionnaireRadioRow}>
            <label><input type="radio" name="medication-review" checked={answers.medicationReview === 'none'} onChange={() => setAnswer('medicationReview', 'none')} /><span>{es ? 'No en esta prueba' : 'Not in this test'}</span></label>
            <label><input type="radio" name="medication-review" checked={answers.medicationReview === 'required'} onChange={() => setAnswer('medicationReview', 'required')} /><span>{es ? 'Sí · detener para revisión' : 'Yes · stop for review'}</span></label>
          </div>
        </fieldset>

        {errors.length > 0 ? (
          <div className={styles.questionnaireErrors} role="alert">
            <strong>{es ? 'Revisa estos datos:' : 'Review these inputs:'}</strong>
            <ul>{errors.map(error => <li key={error}>{ERROR_COPY[error][lang]}</li>)}</ul>
          </div>
        ) : null}

        <div className={styles.questionnaireActions}>
          <button type="submit">{es ? 'Generar opciones con AQ Buddy' : 'Generate choices with AQ Buddy'}</button>
          <span aria-live="polite">{generated
            ? (es ? 'Perfil calculado. Revisa el resultado debajo.' : 'Profile calculated. Review the result below.')
            : (es ? 'Déficit controlado automáticamente; publicación desactivada.' : 'Deficit controlled automatically; publishing disabled.')}</span>
        </div>
      </form>
    </details>
  )
}
