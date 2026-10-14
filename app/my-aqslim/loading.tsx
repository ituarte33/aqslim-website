import styles from './portal.module.css'

export default function MyAqslimLoading() {
  return (
    <div className={styles.portal} aria-busy="true" aria-label="Cargando My AQSLIM">
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">◈</span>
          <span>AQSLIM</span>
        </span>
        <span className={styles.loadingLine} style={{ width: 72 }} />
      </header>
      <main className={`${styles.main} ${styles.loadingPulse}`}>
        <section className={styles.welcome}>
          <div className={`${styles.loadingLine} ${styles.loadingLineWide}`} style={{ height: 42 }} />
          <div className={`${styles.loadingLine} ${styles.loadingLineShort}`} style={{ marginTop: 14 }} />
        </section>
        <div className={styles.loadingBlock} />
        <div className={styles.loadingBlock} style={{ minHeight: 150, marginTop: 18 }} />
        <div className={styles.loadingBlock} style={{ minHeight: 130, marginTop: 18 }} />
      </main>
    </div>
  )
}
