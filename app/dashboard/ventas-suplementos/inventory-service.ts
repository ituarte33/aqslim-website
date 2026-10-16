import { SaleValidationError, type PreparedSale } from './sale-service'
import type { SupplementSaleReceipt } from '../../../lib/supplement-sales'

export class InventoryPreflightError extends SaleValidationError {}

export const INVENTORY_PENDING = 'AQSLIM Inventario pendiente'
export type InventoryChange = {
  id: string
  quantity: number
  before: number
  after: number
  state: 'planned' | 'applying' | 'applied' | 'reverting' | 'reverted'
}
export type InventoryJournal = {
  version: 1
  owner: 'aqslim-portal'
  state: 'pending' | 'complete' | 'rolling-back'
  changes: InventoryChange[]
}
export type InventoryDependencies = {
  assertNoPending(): Promise<void>
  readStock(id: string): Promise<number | undefined>
  create(sale: PreparedSale, journal: InventoryJournal): Promise<SupplementSaleReceipt>
  journal(id: string, sale: PreparedSale, journal: InventoryJournal): Promise<void>
  writeStock(id: string, value: number): Promise<void>
  removeSale(id: string): Promise<void>
  isRejected(error: unknown): boolean
}

// Only this path owns Inventario Actual for portal sales. It does not import
// Square. Serialize different requests in this process as well as double clicks.
export function createInventoryWriter(deps: InventoryDependencies) {
  let tail: Promise<unknown> = Promise.resolve()
  let blockedRequest: string | null = null
  const write = (sale: PreparedSale): Promise<SupplementSaleReceipt> => {
    const operation = tail.then(async () => {
      if (blockedRequest) throw new InventoryPreflightError('Hay una venta pendiente de revisión de inventario. Contacta al administrador antes de guardar otra venta.')
      const changes: InventoryChange[] = []
      try {
        await deps.assertNoPending()
        for (const item of sale.inventory) {
          const before = await deps.readStock(item.id)
          if (typeof before !== 'number' || !Number.isSafeInteger(before) || before < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
            throw new InventoryPreflightError('El inventario de un suplemento no está configurado correctamente.')
          }
          if (before < item.quantity) throw new InventoryPreflightError('No hay inventario suficiente para completar la venta.')
          changes.push({ id: item.id, quantity: item.quantity, before, after: before - item.quantity, state: 'planned' })
        }
        if (!changes.length || new Set(changes.map(change => change.id)).size !== changes.length) throw new InventoryPreflightError('La lista de suplementos no es válida.')
      } catch (error) {
        if (error instanceof InventoryPreflightError) throw error
        throw new InventoryPreflightError('No se pudo verificar el inventario. La venta no se guardó; vuelve a intentar cuando se resuelva la revisión pendiente.')
      }
      const journal: InventoryJournal = { version: 1, owner: 'aqslim-portal', state: 'pending', changes }
      let receipt: SupplementSaleReceipt
      try {
        // The pending journal and financial record are the SAME Airtable POST.
        // Nothing in inventory changes before this call succeeds.
        receipt = await deps.create(sale, journal)
      } catch (error) {
        if (!(error instanceof InventoryPreflightError) && !deps.isRejected(error)) blockedRequest = sale.requestId
        throw error
      }
      let stockRequestInFlight = false
      let completionInFlight = false
      try {
        for (const change of changes) {
          if (await deps.readStock(change.id) !== change.before) throw new Error('inventory_changed_since_preflight')
          change.state = 'applying'
          await deps.journal(receipt.id, sale, journal)
          stockRequestInFlight = true
          await deps.writeStock(change.id, change.after)
          stockRequestInFlight = false
          change.state = 'applied'
          await deps.journal(receipt.id, sale, journal)
        }
        journal.state = 'complete'
        completionInFlight = true
        await deps.journal(receipt.id, sale, journal)
        return receipt
      } catch (error) {
        blockedRequest = sale.requestId
        console.error('[supplement-sales] inventory_operation_unconfirmed', { saleId: receipt.id })
        // Lost responses are NOT evidence of rejected writes. Keep the durable
        // pending marker and stop; blindly replaying or reverting can double-sell.
        if (completionInFlight || !deps.isRejected(error)) {
          throw new SaleValidationError('La venta se registró, pero su inventario necesita verificación. No vuelvas a descontarlo manualmente. Reintenta para recuperar un recibo ya confirmado o contacta al administrador.')
        }
        try {
          journal.state = 'rolling-back'
          // If a stock PATCH was definitively rejected, that item never changed.
          if (stockRequestInFlight) {
            const rejected = changes.find(change => change.state === 'applying')
            if (rejected) rejected.state = 'planned'
          }
          await deps.journal(receipt.id, sale, journal)
          for (const change of changes.toReversed()) {
            if (change.state !== 'applied') continue
            if (await deps.readStock(change.id) !== change.after) throw new Error('rollback_inventory_conflict')
            change.state = 'reverting'
            await deps.journal(receipt.id, sale, journal)
            await deps.writeStock(change.id, change.before)
            change.state = 'reverted'
            await deps.journal(receipt.id, sale, journal)
          }
          await deps.removeSale(receipt.id)
          blockedRequest = null
        } catch {
          throw new SaleValidationError('La venta necesita conciliación: no se pudo confirmar la reversión del inventario. No repitas el descuento; contacta al administrador.')
        }
        // The original definite rejection is returned only after stock is restored
        // and the sale removed. The caller may then safely retry the same request.
        throw error
      }
    })
    tail = operation.catch(() => {})
    return operation
  }
  return Object.assign(write, { confirmed: (requestId: string) => {
    if (blockedRequest === requestId) blockedRequest = null
  } })
}

export function inventoryNotes(sale: PreparedSale, journal: InventoryJournal): string {
  return `${sale.fields['Notas del Terapeuta']}\n\nAQSLIM Venta: ${sale.requestId}\nAQSLIM Recibo: ${JSON.stringify(sale.receipt)}\nDetalle productos: ${JSON.stringify(sale.inventory)}\n${journal.state === 'complete' ? 'AQSLIM Inventario completado' : INVENTORY_PENDING}\nAQSLIM Inventario: ${JSON.stringify(journal)}`
}

export function assertInventoryConfirmed(notes: string) {
  const line = notes.split('\n').findLast(line => line.startsWith('AQSLIM Inventario: '))
  // Older receipts predate ownership: never retroactively decrement them.
  if (!line) return
  const journal = JSON.parse(line.slice('AQSLIM Inventario: '.length)) as InventoryJournal
  if (journal.version !== 1 || journal.owner !== 'aqslim-portal' || journal.state !== 'complete' || !Array.isArray(journal.changes) || !journal.changes.length || journal.changes.some(change => change.state !== 'applied')) {
    throw new SaleValidationError('Esta venta ya existe y su inventario está pendiente de revisión. No se creará otra venta ni se repetirá el descuento.')
  }
}
