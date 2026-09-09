'use server'

import { getClienteById, getSupplementos } from '@/lib/airtable'
import { AuthorizationError, requireCapability } from '@/lib/auth'
import type { SupplementSaleResult } from '@/lib/supplement-sales'
import { commitSavedSale } from './sale-persistence'
import { runSupplementSale, SaleValidationError } from './sale-service'

export async function saveSupplementSale(formData: FormData): Promise<SupplementSaleResult> {
  return runSupplementSale(formData, {
    authorize: async () => {
      try { await requireCapability('consultations:write:any') }
      catch (error) {
        if (error instanceof AuthorizationError) throw new SaleValidationError('Tu sesión no permite guardar ventas. Inicia sesión con una cuenta autorizada.')
        throw error
      }
    },
    getCustomer: getClienteById,
    getProducts: getSupplementos,
    commit: commitSavedSale,
    logUnexpected: reference => console.error('[supplement-sales] save_failed', { reference }),
  })
}
