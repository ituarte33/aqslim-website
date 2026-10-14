# MYAQ-ENT-P2 — Shadow Readback & Pre-Enforcement Remediation v0.1

Date: 2026-09-11
Branch: `myaq-ent-p2-preenforcement-preview`
Base: `myaq-ai-001-aq-buddy-openai-preview` @ `c87f89f`
Mode: PREVIEW ONLY / SHADOW + CURRENT-GOVERNED CONTROLS
Entitlement policy: `MYAQ-ENTITLEMENT-POLICY-PREVIEW-v0.1`

## 1. Purpose

P2 reduces known pre-enforcement risk without activating any proposed commercial entitlement rule.

D01–D09 remain proposed and are not implemented by this phase.

## 2. Current readback

| Operation | Current control | Shadow / P2 observation | P2 status |
|---|---|---|---|
| AQ Buddy | generic authenticated patient role currently includes `buddy:chat`; governed pilot reviewer access also remains valid | centralized entitlement gate runs in shadow mode before provider execution | GATE PREPARED / ENFORCEMENT OFF |
| Food Scan initial | authenticated + existing plan/pilot daily/monthly usage limits, fail-closed on usage-source failure | shared usage gate reproduces the same existing decision semantics | MATCH / FOUNDATION READY |
| Food Scan reanalysis | authenticated + valid payload + user-scoped meal-log preflight + unconfirmed-state preflight | entitlement shadow + non-enforcing usage shadow | OWNERSHIP REMEDIATED / CANARY PASS |
| Fridge detection | existing governed pilot feature | entitlement shadow | MATCH for pilot |
| Fridge generation | existing governed pilot feature | entitlement shadow | MATCH for pilot |
| Restaurant advisor | existing governed pilot feature | entitlement shadow | MATCH for pilot |

## 3. Remediation completed

### P2-F01 — Reanalysis ownership now precedes provider execution

Before any Food Scan reanalysis provider call, the route now:

1. validates the record ID format;
2. retrieves the meal log through `getMealLogForUser(mealLogId, userId)`;
3. returns 404 when the record is not owned by the authenticated user;
4. returns 409 when the owned record is no longer `Unconfirmed`;
5. only then performs entitlement/usage shadow observation and provider execution.

The final user-scoped update remains in place as a second persistence-time protection.

### P2-F02 — Shared usage gate foundation

Added `lib/usage-gate.ts` with a provider-agnostic daily/monthly decision contract.

Existing Food Scan policy delegates to this gate without changing current limits:

- Free: 1/day, 30/month
- Start: 3/day, 90/month
- Plus: 10/day, 300/month
- Elite: 15/day, 450/month
- Pilot: 15/day, 450/month

No new commercial tier or limit was created.

### P2-F03 — Reanalysis usage remains shadow-only

Reanalysis evaluates the current Food Scan limits for telemetry and emits `[usage-shadow]` with:

- user ID
- capability
- current plan
- daily/monthly usage
- daily/monthly limits
- shadow ALLOW/DENY reason
- `currentUsageCounted: false`
- `enforced: false`

The result does not block reanalysis and does not increment usage.

### P2-F04 — Central entitlement gate prepared for AQ Buddy

Added `lib/entitlement-gate.ts` as the future server-side decision boundary.

AQ Buddy passes through `runEntitlementGateShadow(...)` after current role authorization and before provider execution.

The gate remains explicitly:

- `mode: shadow`
- `enforced: false`

No shadow result can currently deny an otherwise-authorized user.

## 4. Live canary evidence

Authorized internal-pilot reanalysis completed successfully on the P2 Preview branch.

Runtime evidence:

- `PATCH /api/food-scan` → HTTP 200
- entitlement capability → `food_scan:reanalyze`
- shadow decision → `allow`
- comparison → `MATCH`
- tier → `internal_pilot`
- entitlement `enforced: false`
- usage shadow decision → `allow`
- `currentUsageCounted: false`
- usage `enforced: false`

User-visible correction and portion behavior remained normal.

## 5. Controlled negative ownership evidence

No real participant record was used for a negative ownership test.

Synthetic/structural regression coverage confirms:

- ownership lookup occurs before provider execution;
- a record whose `User ID` does not match the authenticated Clerk user resolves as not owned;
- the reanalysis path returns 404 before the provider call;
- an already-confirmed owned record returns 409 before the provider call.

## 6. AQ Buddy readback

AQ Buddy is OpenAI-first in Preview and reaches entitlement observation through the centralized gate contract.

Current role authorization still grants `buddy:chat` to the generic patient role. Therefore:

- governed internal pilot → expected MATCH/ALLOW;
- Kenkho metadata → Preview matrix observation may ALLOW;
- free/no governed entitlement signal → shadow remains UNRESOLVED/REVIEW;
- no new denial is activated.

This is intentional until commercial access decisions are approved.

## 7. Fail-closed vs shadow distinction

Existing governed controls remain fail-closed where already established, including Food Scan usage-source failure for initial scans and user-scoped record ownership.

New P2 commercial/usage observations do not become enforcement merely because a shadow result is DENY or UNRESOLVED.

No shadow path contains `enforced: true`.

## 8. Build verification

Latest negative-ownership regression commit:

`61e4664 — Strengthen synthetic negative ownership coverage before AI reanalysis`

Vercel status: `READY`.

`main`: unchanged.
Production: unchanged.

## 9. P2 final determination

`MYAQ-ENT-P2A — OWNERSHIP REMEDIATION + SHARED USAGE GATE FOUNDATION = PASS`

`MYAQ-ENT-P2B — CENTRAL AQ BUDDY ENTITLEMENT GATE PREPARATION = PASS`

`MYAQ-ENT-P2C — LIVE REANALYSIS CANARY = PASS`

`MYAQ-ENT-P2D — CONTROLLED NEGATIVE OWNERSHIP EVIDENCE = PASS`

# `MYAQ-ENT-P2 — PASS / PRE-ENFORCEMENT FOUNDATION COMPLETE`

Production: unchanged.
`main`: unchanged.
Commercial enforcement: OFF.
Shadow entitlement enforcement: OFF.
Reanalysis usage enforcement: OFF.

## 10. Next phase

Proceed to Founder decision readback for proposed commercial/access rules `MYAQ-ACCESS-D01` through `MYAQ-ACCESS-D09`.

No enforcement implementation should begin until the Founder explicitly approves, revises, or rejects those decisions.
