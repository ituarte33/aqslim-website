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
| Food Scan reanalysis | authenticated + valid payload + user-scoped meal-log preflight + unconfirmed-state preflight | entitlement shadow + non-enforcing usage shadow | OWNERSHIP REMEDIATED / USAGE REVIEW |
| Fridge detection | existing governed pilot feature | entitlement shadow | MATCH for pilot |
| Fridge generation | existing governed pilot feature | entitlement shadow | MATCH for pilot |
| Restaurant advisor | existing governed pilot feature | entitlement shadow | MATCH for pilot |

## 3. Remediation completed in P2A

### P2-F01 — Reanalysis ownership now precedes provider execution

Before any Food Scan reanalysis provider call, the route now:

1. validates the record ID format;
2. retrieves the meal log through `getMealLogForUser(mealLogId, userId)`;
3. returns 404 when the record is not owned by the authenticated user;
4. returns 409 when the owned record is no longer `Unconfirmed`;
5. only then performs entitlement/usage shadow observation and provider execution.

The final user-scoped update remains in place as a second persistence-time protection.

Result: a syntactically valid foreign or already-confirmed record can no longer consume the reanalysis AI call before ownership/state rejection.

### P2-F02 — Shared usage gate foundation

Added `lib/usage-gate.ts` with a provider-agnostic daily/monthly decision contract.

Existing Food Scan policy delegates to this gate without changing:

- Free: 1/day, 30/month
- Start: 3/day, 90/month
- Plus: 10/day, 300/month
- Elite: 15/day, 450/month
- Pilot: 15/day, 450/month

No new commercial tier or limit was created.

### P2-F03 — Reanalysis usage remains shadow-only

Reanalysis now evaluates the same current Food Scan limits for telemetry and emits `[usage-shadow]` with:

- user ID
- capability
- current plan
- daily/monthly usage
- daily/monthly limits
- shadow ALLOW/DENY reason
- `currentUsageCounted: false`
- `enforced: false`

The result does not block reanalysis and does not increment usage.

This data is intended to support the later decision about whether and how reanalysis should consume quota.

### P2-F04 — Central entitlement gate prepared for AQ Buddy

Added `lib/entitlement-gate.ts` as the future server-side decision boundary.

AQ Buddy now passes through `runEntitlementGateShadow(...)` after current role authorization and before provider execution.

The gate contract explicitly returns:

- `mode: shadow`
- `enforced: false`
- current access result
- shadow decision
- MATCH / MISMATCH / REVIEW comparison
- policy version
- reason

No shadow result can currently deny an otherwise-authorized user.

## 4. AQ Buddy readback

AQ Buddy is OpenAI-first in Preview and now reaches entitlement observation through the centralized gate contract.

Current role authorization still grants `buddy:chat` to the generic patient role. Therefore:

- governed internal pilot → expected MATCH/ALLOW;
- Kenkho metadata → Preview matrix observation may ALLOW;
- free/no governed entitlement signal → shadow remains UNRESOLVED/REVIEW;
- no new denial is activated.

This is intentional until commercial access decisions are approved.

## 5. Fail-closed vs shadow distinction

Existing governed controls remain fail-closed where already established, including Food Scan usage-source failure for initial scans and user-scoped record ownership.

New P2 commercial/usage observations do not become enforcement merely because the shadow result is DENY or UNRESOLVED.

No shadow path contains `enforced: true`.

## 6. Preview preservation

The P2 branch is explicitly added to the authorized Preview branch set.

Reviewer allowlist, `VERCEL_ENV === preview`, existing pilot identities, `main`, and Production remain unchanged.

## 7. Tests added

### `tests/usage-gate.test.mts`

Covers:

- allowed below limits;
- daily denial;
- monthly denial;
- safe normalization of negative usage input.

### `tests/food-scan-reanalysis-preflight.test.mts`

Structurally verifies:

- ownership lookup appears before provider execution;
- unconfirmed-state preflight exists;
- reanalysis usage observation is present;
- no branch enforces `shadowUsageDecision.allowed`.

### `tests/entitlement-gate-wiring.test.mts`

Structurally verifies:

- centralized gate remains shadow-only;
- no `enforced: true` path exists;
- AQ Buddy capability path calls the centralized gate.

### Preview branch tests

The P2 branch is covered by `synthetic-preview-policy.test.mts` while Production and `main` remain rejected.

## 8. Build verification

Vercel build for commit `cd4a2c2` completed successfully and deployment reached `READY`.

`main` and Production remain unchanged.

## 9. Remaining P2 work before PASS

### P2-R01 — Live reanalysis canary

Run one authorized Food Scan correction/reanalysis from the P2 Preview branch and confirm runtime logs include:

- entitlement shadow for `food_scan:reanalyze`;
- usage shadow with `currentUsageCounted: false`;
- successful provider/update path.

Also verify the user-visible correction still works normally.

### P2-R02 — Negative ownership canary

Do not attempt this through another real user's record.

Use a controlled synthetic/unit route test or dedicated synthetic record to verify a non-owned record is rejected before provider execution.

### P2-R03 — Commercial policy remains intentionally unresolved

`portal_basic`, `clinic_ai`, 30-day trial, clinic lifecycle, Restart, billing suspension, and the candidate `$12.99` price remain outside P2 enforcement until separately approved.

## 10. P2 determination

`MYAQ-ENT-P2A — OWNERSHIP REMEDIATION + SHARED USAGE GATE FOUNDATION = PASS`

`MYAQ-ENT-P2B — CENTRAL AQ BUDDY ENTITLEMENT GATE PREPARATION = PASS`

`MYAQ-ENT-P2 — FULL PHASE = LIVE REANALYSIS CANARY + CONTROLLED NEGATIVE OWNERSHIP CANARY PENDING`

Production: unchanged.
`main`: unchanged.
Commercial enforcement: OFF.
Shadow entitlement enforcement: OFF.
Reanalysis usage enforcement: OFF.
