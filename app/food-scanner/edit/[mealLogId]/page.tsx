import { SavedScanEditor } from './saved-scan-editor'

export const dynamic = 'force-dynamic'

export default async function SavedScanEditPage({
  params,
}: {
  params: Promise<{ mealLogId: string }>
}) {
  const { mealLogId } = await params
  return <SavedScanEditor mealLogId={mealLogId} />
}
