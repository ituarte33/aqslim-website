import { SavedScanEditor } from './saved-scan-editor'
import { ReanalysisLimitProbe } from './reanalysis-limit-probe'

export const dynamic = 'force-dynamic'

export default async function SavedScanEditPage({
  params,
}: {
  params: Promise<{ mealLogId: string }>
}) {
  const { mealLogId } = await params
  return (
    <>
      <SavedScanEditor mealLogId={mealLogId} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 64px', background: '#0b0b0b', color: '#eee' }}>
        <ReanalysisLimitProbe mealLogId={mealLogId} />
      </div>
    </>
  )
}
