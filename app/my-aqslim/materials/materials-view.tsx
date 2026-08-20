'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PatientPortalData } from '@/lib/patient-portal'
import { ChevronIcon, InfoIcon, MaterialsIcon } from '../portal-icons'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from '../portal.module.css'

type MaterialsViewProps = {
  data: PatientPortalData
  demo?: boolean
}

export function MaterialsView({ data, demo = false }: MaterialsViewProps) {
  const router = useRouter()
  const [openingBuddy, setOpeningBuddy] = useState(false)
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const es = language === 'es'
  const phase = data.phase || (es ? 'Tu fase' : 'Your phase')
  const week = data.weekInPhase
  const buddyPath = demo ? '/my-aqslim/demo/buddy' : '/my-aqslim/buddy'
  useEffect(() => {
    router.prefetch(buddyPath)
  }, [buddyPath, router])
  const items = [
    {
      title: es ? `Guía ${phase}` : `${phase} Guide`,
      type: es ? 'Guía de fase' : 'Phase guide',
      detail: es ? 'La guía principal para tu etapa actual.' : 'The main guide for your current phase.',
    },
    {
      title: es ? `Cartografía Semana ${week || '—'}` : `Week ${week || '—'} Auricular Chart`,
      type: es ? 'Cartografía' : 'Auricular chart',
      detail: es ? 'La cartografía correspondiente a tu semana actual.' : 'The auricular chart for your current week.',
    },
    {
      title: es ? 'Manual del Participante' : 'Participant Manual',
      type: es ? 'Manual' : 'Manual',
      detail: es ? 'Tu referencia general para trabajar con AQSLIM.' : 'Your general reference for working with AQSLIM.',
    },
  ]

  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo}>
      <section className={styles.pageIntro}>
        <div>
          <h1>{es ? 'Materiales' : 'Materials'}</h1>
          <p>{es ? 'Recursos seleccionados para tu momento actual.' : 'Resources selected for where you are now.'}</p>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.materialsHero}`}>
        <p className={styles.eyebrow}>{es ? 'Para ti ahora' : 'For you now'}</p>
        <h2>{phase}</h2>
        <p>{week ? `${es ? 'Semana' : 'Week'} ${week}` : (es ? 'Semana por confirmar' : 'Week to be confirmed')}</p>
      </section>

      <section className={styles.libraryList} aria-label={es ? 'Biblioteca de materiales' : 'Materials library'}>
        {items.map(item => (
          <article key={item.title} className={`${styles.panel} ${styles.materialCard}`}>
            <div className={styles.materialIcon}><MaterialsIcon /></div>
            <div>
              <span>{item.type}</span>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
              <small>{es ? 'Asignado a tu plan' : 'Assigned to your plan'}</small>
            </div>
          </article>
        ))}
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
        <p>{es ? 'Esta biblioteca muestra los materiales asignados a tu fase. Los archivos descargables aparecerán aquí cuando se agreguen a tu plan.' : 'This library shows the materials assigned to your phase. Downloadable files will appear here when they are added to your plan.'}</p>
      </div>
    </PortalShell>
  )
}
