'use client'

import Link from 'next/link'
import type { PatientPortalData } from '@/lib/patient-portal'
import type { PhaseGuide } from '@/lib/phase-materials'
import { ChevronIcon, InfoIcon, MaterialsIcon } from '../../portal-icons'
import { PortalShell } from '../../portal-shell'
import { usePortalLanguage } from '../../use-portal-language'
import styles from '../../portal.module.css'

export function PhaseGuideView({ data, guide, previewReview = false }: { data: PatientPortalData; guide: PhaseGuide; previewReview?: boolean }) {
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const es = language === 'es'
  const objectives = es ? guide.objectivesEs : guide.objectivesEn
  const learning = es ? guide.learningEs : guide.learningEn

  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language}>
      <section className={styles.pageIntro}>
        <div>
          <p className={styles.eyebrow}>{es ? `Fase ${guide.number}` : `Phase ${guide.number}`}</p>
          <h1>{guide.phase}</h1>
          <p>{es ? guide.subtitleEs : guide.subtitleEn}</p>
        </div>
      </section>

      {previewReview ? (
        <div className={styles.dataNotice}>
          <InfoIcon />
          <p>{es
            ? 'Este es un resumen de tu fase. La guía completa todavía no está vinculada en tus materiales.'
            : 'This is a summary of your phase. The full guide has not been linked in your materials yet.'}</p>
        </div>
      ) : null}

      <section className={`${styles.panel} ${styles.phaseGuideLead}`}>
        <div className={styles.materialIcon}><MaterialsIcon /></div>
        <div>
          <p className={styles.eyebrow}>{es ? 'Propósito de tu fase' : 'Purpose of your phase'}</p>
          <p>{es ? guide.purposeEs : guide.purposeEn}</p>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.phaseGuideSection}`}>
        <p className={styles.eyebrow}>{es ? 'Objetivos' : 'Goals'}</p>
        <ul>{objectives.map(item => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className={`${styles.panel} ${styles.phaseGuideSection}`}>
        <p className={styles.eyebrow}>{es ? 'Lo que aprenderás' : 'What you will learn'}</p>
        <ul>{learning.map(item => <li key={item}>{item}</li>)}</ul>
      </section>

      <div className={styles.dataNotice}>
        <InfoIcon />
        <p>{es ? guide.watchEs : guide.watchEn}</p>
      </div>

      <div className={styles.planActions}>
        <Link href="/my-aqslim/materials" className={styles.outlineAction}>
          {es ? 'Volver a mis materiales' : 'Back to my materials'} <ChevronIcon />
        </Link>
      </div>
    </PortalShell>
  )
}
