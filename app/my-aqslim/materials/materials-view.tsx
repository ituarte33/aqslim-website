'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PatientPortalData } from '@/lib/patient-portal'
import type { PatientMaterialsData } from '@/lib/materials-policy'
import { demoProfilePath } from '@/lib/demo-profile-route'
import { ChevronIcon, InfoIcon, MaterialsIcon } from '../portal-icons'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from '../portal.module.css'

type MaterialsViewProps = {
  data: PatientPortalData
  materialsData: PatientMaterialsData
  demo?: boolean
  demoProfileId?: string
}

export function MaterialsView({ data, materialsData, demo = false, demoProfileId }: MaterialsViewProps) {
  const router = useRouter()
  const [openingBuddy, setOpeningBuddy] = useState(false)
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const es = language === 'es'
  const plan = data.planName || data.phase || (es ? 'Tu plan' : 'Your plan')
  const week = data.weekInPhase
  const { kenkhoTier, materials } = materialsData
  const buddyPath = demoProfilePath(demo ? '/my-aqslim/demo/buddy' : '/my-aqslim/buddy', demo, demoProfileId)
  useEffect(() => {
    router.prefetch(buddyPath)
  }, [buddyPath, router])
  const programLabel = kenkhoTier
    ? `Kenkho Path · ${kenkhoTier}`
    : (es ? 'Atención en clínica' : 'In-clinic care')

  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo} demoProfileId={demoProfileId}>
      <section className={styles.pageIntro}>
        <div>
          <h1>{es ? 'Materiales' : 'Materials'}</h1>
          <p>{es ? 'Recursos seleccionados para tu momento actual.' : 'Resources selected for where you are now.'}</p>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.materialsHero}`}>
        <p className={styles.eyebrow}>{programLabel}</p>
        <h2>{plan}</h2>
        <p>{week ? `${es ? 'Semana' : 'Week'} ${week}` : (es ? 'Semana por confirmar' : 'Week to be confirmed')}</p>
      </section>

      <section className={styles.libraryList} aria-label={es ? 'Biblioteca de materiales' : 'Materials library'}>
        {materials.map(item => (
          <article key={item.id} className={`${styles.panel} ${styles.materialCard}`}>
            <div className={styles.materialIcon}><MaterialsIcon /></div>
            <div>
              <span>{es ? item.typeEs : item.typeEn}</span>
              <h2>{es ? item.titleEs : item.titleEn}</h2>
              <p>{es ? item.detailEs : item.detailEn}</p>
              <small>{es ? 'Asignado a tu plan' : 'Assigned to your plan'}</small>
              <a
                className={styles.materialAction}
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                {es ? 'Abrir material' : 'Open material'} <ChevronIcon />
              </a>
            </div>
          </article>
        ))}
        {materials.length === 0 ? (
          <article className={`${styles.panel} ${styles.materialEmpty}`}>
            <div className={styles.materialIcon}><MaterialsIcon /></div>
            <div>
              <span>{es ? 'Biblioteca personal' : 'Personal library'}</span>
              <h2>{es ? 'Tus archivos aparecerán aquí' : 'Your files will appear here'}</h2>
              <p>
                {es
                  ? 'AQSLIM todavía no ha agregado un archivo descargable a tu plan.'
                  : 'AQSLIM has not added a downloadable file to your plan yet.'}
              </p>
            </div>
          </article>
        ) : null}
      </section>

      <div className={styles.materialHelp}>
        <p>{es ? '¿Necesitas ayuda con uno de tus materiales?' : 'Need help with one of your materials?'}</p>
        <Link
          href={buddyPath}
          className={styles.goldButton}
          aria-busy={openingBuddy}
          onClick={() => setOpeningBuddy(true)}
        >
          {openingBuddy
            ? (es ? 'Abriendo AQ Buddy…' : 'Opening AQ Buddy…')
            : (es ? 'Preguntar a AQ Buddy' : 'Ask AQ Buddy')}
          <ChevronIcon />
        </Link>
      </div>

      <div className={styles.dataNotice}>
        <InfoIcon />
        <p>
          {kenkhoTier
            ? (es
              ? 'Tu biblioteca sigue tu nivel de Kenkho Path, fase y semana. Quick Start y cartografías solo se muestran cuando corresponden.'
              : 'Your library follows your Kenkho Path tier, phase, and week. Quick Start and auricular charts appear only when applicable.')
            : (es
              ? 'Como participante de atención en clínica, aquí verás únicamente los materiales que AQSLIM asigne directamente a tu plan.'
              : 'As an in-clinic participant, you will only see materials AQSLIM assigns directly to your plan.')}
        </p>
      </div>
    </PortalShell>
  )
}
