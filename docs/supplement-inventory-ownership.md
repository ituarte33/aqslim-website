# Portal supplement inventory ownership and September 8 reconciliation

## Deferred enforcement — default OFF

`AIRTABLE_INVENTORY_ENFORCEMENT` is a server-side flag. Only the exact value `true` enables enforcement. A missing variable, `false`, or any unrecognized value leaves it OFF. The example environment explicitly sets `AIRTABLE_INVENTORY_ENFORCEMENT=false`.

With enforcement OFF, ordinary supplement sales still validate products, payment, shipping, discount and tax; save the financial record; and return the same itemized receipt. The same duplicate-submit guard, completed-sale lookup and uncertain-write handling remain active. No inventory preflight, pending-inventory scan, stock decrement, or stock PATCH runs. Invalid or negative historical stock cannot block a new ordinary sale. Product catalog reads remain necessary for names and prices, but stock is not validated. Sales saved while OFF have no inventory journal and will **not** be retroactively decremented when enforcement is later enabled.

A retry of a particular older sale that already has an incomplete inventory journal remains subject to its existing review guard. Turning OFF does not falsify completion of an earlier partial operation, and that record does not block unrelated new sales while OFF.

The inventory service and all its tests are retained. With the flag ON, the existing preflight, decrement, persistent journal, compensation, and recovery path below runs unchanged. Before activation, the Founder must complete the in-office physical count, review and reconcile Airtable balances and any pending journals, and resolve the single-writer deployment requirements described below. Set the flag to `true` only through a separately authorized configuration/deployment change. This PR does not change production configuration, merge, or deploy.

The prepared September 8 reconciliation remains unexecuted. It is not called automatically and cannot create a new historical sale through the production committer while the flag is OFF. Its explicit authorization, candidate checks, and physical-stock checks still apply when later enabled.

## Scope and ownership

When enforcement is explicitly enabled, the AQSLIM Portal is the sole **application writer in this repository** of Airtable `Suplementos_AQSLIM.Inventario Actual` for new sales saved by `/dashboard/ventas-suplementos`. It is an AQSLIM operational/analytics mirror. Square inventory remains separately managed by Square; this implementation neither imports Square code nor calls a Square inventory endpoint.

A repository-wide search before implementation found no existing decrement path or Square-to-Airtable stock synchronization. The existing Square integrations handle customers, appointments, payments, catalog service lookup, and subscription/plan events. Historical documentation mentions a catalog import and inventory reporting, not a running decrement. External Airtable automations, external integrations, and manual edits cannot be proven absent by searching this repository; the connector does not enumerate automation code. No competing automation was positively identified.

No merge, deployment, schema modification, or real historical write is part of this change.

## Save and recovery behavior when enforcement is ON

1. Authorize the operator, validate the sale, resolve catalog IDs/prices, and coalesce quantities.
2. Serialize stock-changing sales within the application process. Check Airtable for incomplete portal inventory journals before starting another sale.
3. Read current stock for every actual product; reject missing, fractional, negative, or insufficient stock **before creating the sale**. Shipping, discount, and tax never become stock entries.
4. Create the financial sale and its pending inventory journal in a **single POST**. A rejected financial POST cannot cause a stock change.
5. Record each intended stock write durably in that sale's notes, then set stock to the verified nonnegative target. Recheck the stock immediately before writing; unexpected changes stop processing.
6. Mark the journal complete only after all stock writes are acknowledged. Only then return a success receipt.
7. A completed request is recovered by its saved identifier and receipt; it never reapplies inventory. Older sales without an inventory journal are **not** retroactively decremented.
8. A definite rejected inventory write triggers compensation of acknowledged changes, with current-value checks, and deletion of the just-created failed sale. If compensation succeeds, retry is allowed. If a response is ambiguous or compensation fails, retain the journal, show a Spanish review message, and block further stock-changing sales. Do not claim that an ambiguous timeout means “nothing was saved.”

Pending states require an authorized reconciliation: inspect the sale's journal, per-SKU before/after values, and Airtable revision history. Do not infer whether a write occurred merely from today's stock, and do not clear a pending marker until the financial and stock state has been verified. No automatic historical repair or blind replay is provided. Recovered completed receipts can clear a same-process uncertain-operation gate; unresolved pending records still block new writes.

## Concurrency limitation retained from PR #25

No Redis or other external infrastructure was added. The process queue plus Airtable journal supports same-instance double-submit exclusion and recovery of completed or interrupted records. **Airtable provides no conditional compare-and-set/unique transaction lock here. Two separate server instances can race between the initial read and record creation. This is not a cross-instance exactly-once guarantee.** The pending-record check is an operational interlock, not a distributed lock.

Until a real shared coordinator or an enforced single-writer execution topology exists, do not claim this implementation is safe for simultaneous inventory-changing requests across independent production instances. Manual/external inventory writes also remain outside the local queue. This PR remains unmerged and undeployed for review.

## September 8, 2026 proposal — NOT EXECUTED

The fixed request ID is `b8b84174-0908-4000-8000-000000000174`. The proposal uses the historical prices supplied by the operator, not current catalog prices. Historical purchase costs are unknown and are recorded as `null`, not inferred from today's cost.

| Product | Airtable record | SKU | Quantity | Unit price | Line total |
|---|---|---|---:|---:|---:|
| Colon Optimizer - Fiber | reckU1rgdK9nLYGPy | 307912 | 2 | $24 | $48 |
| Veggie Laxative | reczbUFMoTi7PIW9K | 393510 | 2 | $18 | $36 |
| AQ JOINTS | rectg7qKWM9AM6cCH | 392309 | 3 | $22 | $66 |

Proposed financial fields:

```json
{
  "Fecha Consulta": "2026-09-08",
  "Tipo de Consulta": "Suplementos",
  "Método de Pago": "Card",
  "Suplemento(s) Cobrado ($)": 150,
  "Envio (Shipping) Cobrado ($)": 24,
  "Monto Cobrado ($)": 174,
  "Consulta Cobrado ($)": 0
}
```

Discount and tax are $0. The proposal has no linked client (walk-in), no extra SKU, and no consultation. Notes include the itemized receipt and deterministic request ID; the exact pending journal is calculated only from freshly verified valid stock at execution time.

`previewHistoricalSale()` is read-only. It first searches for **any $174 sale dated September 8** before loading the catalog. One fully matching record returns `existing`; incomplete, differing, or multiple candidates return `review`, with no writes. No candidate yields a proposed payload, but insufficient/invalid stock returns `blocked`.

`applyHistoricalSale()` is prepared for a future explicit administrative invocation. It requires authorization and the exact confirmation `CONCILIAR VENTA 2026-09-08 $174 UNA SOLA VEZ`, reruns the duplicate search, and uses the same inventory writer as ordinary sales. A further candidate search is performed immediately before the historical POST. No page, scheduler, or normal save calls this action automatically. The deterministic identifier prevents completed replays under the concurrency limits above. An already-existing sale is a no-op for both finances and inventory; unknown legacy inventory ownership needs separate review.

### Read-only live check on September 9

- No Airtable record was returned for September 8 with `Monto Cobrado ($) = 174`. This is a point-in-time observation; every future execution must repeat the search.
- Colon Optimizer and AQ JOINTS had invalid negative stock. The local proposal report contains the exact read-only values.
- Therefore the proposal is **blocked** pending an independently authorized inventory review. No negative stock was corrected or decremented.
- Only connector reads were performed. All mutation tests use synthetic in-memory responses. **No real historical record or inventory write was executed.**
