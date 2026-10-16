'use server'

import { requireCapability } from '@/lib/auth'
import { getSupplementos } from '@/lib/airtable'
import { commitSavedSale, findSeptember8Candidates } from './sale-persistence'
import { executeSeptember8Reconciliation, previewSeptember8Reconciliation } from './historical-reconciliation'

export async function previewHistoricalSale() {
  try {
    await requireCapability('consultations:write:any')
    return await previewSeptember8Reconciliation({ findCandidates: findSeptember8Candidates, getProducts: getSupplementos })
  } catch {
    return { status: 'review' as const, recordIds: [], message: 'No se pudo verificar la venta histórica o identificar los suplementos sin ambigüedad. No se hizo ningún cambio.' }
  }
}

// Prepared for a FUTURE explicitly approved administrative invocation only.
// There is no scheduled task, page-load call, or save-form call to this action.
export async function applyHistoricalSale(confirmation: string) {
  try {
    return await executeSeptember8Reconciliation(confirmation, {
      authorize: () => requireCapability('consultations:write:any'),
      findCandidates: findSeptember8Candidates,
      getProducts: getSupplementos,
      commit: commitSavedSale,
    })
  } catch {
    const reference = crypto.randomUUID()
    console.error('[supplement-sales] reconciliation_unconfirmed', { reference })
    return { status: 'review' as const, recordIds: [], message: `No se pudo confirmar la conciliación. Verifica el registro y el inventario antes de volver a intentar. Referencia: ${reference}` }
  }
}
