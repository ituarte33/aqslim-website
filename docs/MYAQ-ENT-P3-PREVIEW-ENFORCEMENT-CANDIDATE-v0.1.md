# MYAQ-ENT-P3 — Preview Enforcement Candidate v0.1

Date: 2026-09-11
Branch: `myaq-ent-p3-preview-enforcement-candidate`
Base: `myaq-ent-p2-preenforcement-preview`
Status: **CANDIDATE / ENFORCEMENT FLAG OFF / NO PRODUCTION AUTHORIZATION**

## 1. Founder-approved policy basis

D01–D09 were approved for Preview implementation on 2026-09-11.

Two parameters remain explicitly Preview-only:

- D02: `clinic_ai` planning price = $12.99/month; not public pricing.
- D04: `clinic_ai` food scan envelope = 3/day and 90/month; not a permanent public limit.

No real billing, Production lifecycle enforcement, public pricing or external-client rollout is authorized.

## 2. Canonical entitlement foundation

P3 defines a canonical entitlement record with:

- tier
- status
- source
- trial starts/ends
- paid through
- Last Completed Visit snapshot
- grace end snapshot
- access expiration
- Square subscription reference placeholder
- entitlement reason
- last access change
- governed override fields

Canonical tiers:

- `portal_basic`
- `clinic_ai`
- `kenkho_start`
- `kenkho_plus`
- `kenkho_elite`
- `internal_pilot`

## 3. Clinic lifecycle

Approved resolver:

- 0–30 days since Last Completed Visit = ACTIVE
- 31–60 days = GRACE
- 61+ days = INACTIVE / Restart eligible

Missing, invalid, future or unbound visit evidence resolves as UNRESOLVED rather than being guessed.

For clinic entitlements, Last Completed Visit is recalculated server-side from `Consultas`; editable Airtable entitlement fields are audit snapshots only.

## 4. Preview entitlement source

Airtable table:

`MYAQ Entitlements Preview` (`tblkAuEOcCA5sek4n`)

Controls:

- exact P3 Preview branch only
- `VERCEL_ENV=preview`
- approved AQSLIM Airtable base only
- `{Preview Only}=TRUE()` required
- duplicate Subject IDs fail closed
- record version required
- clinic Patient Record ID must match authenticated patient binding before visit history is trusted

As of this checkpoint the table contains **0 records**. No new entitlement has been granted to any user.

## 5. Source precedence

1. Existing governed internal pilot
2. Explicit P3 Preview entitlement record
3. Existing Kenkho plan metadata signal
4. No canonical entitlement

Internal pilot precedence preserves Rom, Carlos Ituarte, Luis Fernando Ituarte and Armando Medina during candidate testing.

## 6. Effective access resolver

- Internal pilot → allowed
- Kenkho Start/Plus/Elite → allowed without clinic lifecycle
- Portal Basic → no cost-bearing AI; clinic portal remains governed by lifecycle
- Clinic AI trial → allowed only inside valid trial window and ACTIVE/GRACE clinic lifecycle
- Clinic AI paid → requires valid Paid Through and ACTIVE/GRACE clinic lifecycle
- INACTIVE clinic patient → AI denied even if Paid Through is later; portal read-only candidate behavior
- expired/suspended/canceled/access-expired → denied
- missing payment or lifecycle evidence → unresolved/fail closed when enforcement is active
- administrative deny override → deny
- administrative allow override → intentionally not enabled in P3 v0.1

## 7. Trial policy

Eligible consultation types confirmed from Airtable schema:

- `Cliente Nuevo`
- `Cliente Re-Inicio`

Not eligible:

- `Cliente subsecuente`
- `Suplementos`
- `Suplementos + Envio`

Eligible trial window = exactly 30 days from the governed completed-visit event.

Automatic entitlement writes from consultation events are **not yet wired**, to avoid accidental grants to external real clients during Preview.

## 8. Usage policy

Food Scan candidate limits:

- Portal Basic = 0/day, 0/month
- Clinic AI = 3/day, 90/month
- Kenkho Start = 3/day, 90/month
- Kenkho Plus = 10/day, 300/month
- Kenkho Elite = 15/day, 450/month
- Internal Pilot = 15/day, 450/month

Initial Food Scan now follows:

`IDENTITY → ENTITLEMENT/LIFECYCLE → USAGE → PROVIDER`

When P3 enforcement is off, existing access and existing limits remain authoritative.

## 9. Cross-surface gate coverage

Central current-vs-P3 access helper now covers:

- AQ Buddy
- Food Scan initial analysis
- Food Scan correction/reanalysis entitlement
- Fridge detection
- Fridge recipe generation
- Restaurant/Menu Advisor
- Weekly Summary access

Weekly Summary is deterministic and does not call an AI provider; it is entitlement-gated as a product feature but is not counted as an AI operation.

## 10. Activation safety

P3 enforcement can activate only when all are true:

- `VERCEL_ENV=preview`
- exact branch = `myaq-ent-p3-preview-enforcement-candidate`
- `MYAQ_P3_ENFORCEMENT=enabled`

Production, `main`, another Preview branch or a missing flag cannot activate P3 enforcement.

At this checkpoint the flag has not been intentionally enabled.

## 11. Open items before enabling P3

### P3-O01 — Food Scan correction/reanalysis usage semantics

Current user experience says correction/reanalysis recalculates without consuming another scan. P2/P3 telemetry therefore keeps `currentUsageCounted=false`.

Founder decision still required on whether reanalysis should:

A. remain free within the originating scan;
B. consume another scan; or
C. remain free but receive a separate anti-abuse correction limit.

No new rule will be invented automatically.

### P3-O02 — Clinic AI scanner label

The Food Scanner client currently recognizes legacy display plans only (`free/start/plus/elite/pilot`). Before testing a real/synthetic `clinic_ai` entitlement, the UI should display `Clinic AI` / `AQSLIM Clinic AI` rather than incorrectly falling back to Free or Kenkho Start.

### P3-O03 — Controlled canary activation

Before any `clinic_ai` record is seeded:

1. verify latest branch build READY;
2. enable P3 flag in Preview only;
3. test existing internal pilot first;
4. confirm `[entitlement-enforcement-preview]` logs ALLOW for internal pilot;
5. keep entitlement table empty during first canary;
6. disable flag immediately if existing pilot behavior regresses.

## 12. Production boundary

Production: unchanged.
`main`: unchanged.
Real Square subscriptions: not created.
Real charges: not created.
Public Clinic AI price: not published.
External client lifecycle enforcement: not activated.
Preview entitlement records: none at checkpoint.
