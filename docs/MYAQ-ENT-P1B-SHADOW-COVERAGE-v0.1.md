# MYAQ-ENT-P1B — Shadow Coverage Expansion v0.1

Date: 2026-09-10
Branch: `myaq-entitlement-preview-001`
Baseline: `myaq-rec-001-preview-010`
Mode: SHADOW ONLY / NON-ENFORCING
Policy: `MYAQ-ENTITLEMENT-POLICY-PREVIEW-v0.1`

## 1. Scope

P1B expands entitlement observation across the current cost-bearing AI surfaces without changing current authorization outcomes.

Covered operations:

- AQ Buddy chat
- Food Scan initial analysis (photo or text)
- Food Scan correction reanalysis
- Fridge image detection
- Fridge recipe generation
- Restaurant menu analysis (existing P1 canary)

Every shadow decision remains `enforced: false`.

## 2. Current access vs shadow decision

| Operation | Current access control | Shadow capability | Expected pilot result | Status |
|---|---|---|---|---|
| AQ Buddy | generic `patient` role has `buddy:chat` | `buddy:chat` | ALLOW when governed pilot feature is present | REVIEW |
| Food Scan initial | authenticated + plan/pilot usage policy + daily/monthly quota | `food_scan:analyze` | ALLOW for governed pilot | MATCH for pilot |
| Food Scan reanalysis | authenticated request; record ownership is validated only when persistence update occurs after AI execution | `food_scan:reanalyze` | ALLOW for governed pilot | REMEDIATION REQUIRED BEFORE ENFORCEMENT |
| Fridge detection | governed pilot + `fridge_recipes` feature | `fridge_recipe:detect` | ALLOW | MATCH |
| Fridge generation | governed pilot + `fridge_recipes` feature | `fridge_recipe:generate` | ALLOW | MATCH |
| Restaurant advisor | governed pilot + `restaurant_advisor` feature | `restaurant_menu:analyze` | ALLOW | MATCH |

## 3. Material findings

### P1B-F01 — AQ Buddy generic patient capability

Current role policy grants `buddy:chat` to the generic `patient` role. The shadow resolver can now show when current access is ALLOW while commercial entitlement is unresolved.

No behavior is changed in P1B.

Required before enforcement: separate authentication/ownership from commercial entitlement and place the server-side entitlement gate before the Anthropic call.

### P1B-F02 — Food Scan initial route already has useful fail-closed usage behavior

The initial Food Scan route denies execution when usage counts cannot be verified and enforces daily/monthly limits before the provider call.

This mechanism should be reused by the future centralized usage gate rather than replaced unnecessarily.

### P1B-F03 — Food Scan reanalysis is a distinct billable operation

Correction reanalysis makes another Anthropic request and therefore requires its own observable capability: `food_scan:reanalyze`.

Current behavior does not apply the initial scan daily/monthly quota before this provider call.

P1B only observes this condition. It does not add a quota or block the operation.

### P1B-F04 — Reanalysis ownership validation occurs after provider execution

The reanalysis path validates the format of `mealLogId` before the AI call, but authenticated ownership is effectively established later when `updateUnconfirmedMealLogEstimate` attempts the user-scoped update.

This means a syntactically valid request can consume an AI call before the later persistence operation determines that the record is not updateable by that user.

Required remediation before enforcement/cost hardening: verify the user-scoped meal record before executing reanalysis AI.

### P1B-F05 — Free/clinic commercial behavior remains intentionally unresolved

D01–D09 are not approved. Therefore `free`, future `portal_basic`, and future `clinic_ai` cases are not converted into new access rules by P1B.

Shadow output remains `unresolved` when there is no already-governed entitlement signal.

## 4. Shadow instrumentation behavior

The observer logs:

- Clerk user ID
- capability
- current access outcome
- shadow decision
- shadow tier
- lifecycle state (currently NOT_APPLICABLE or UNRESOLVED)
- policy basis
- reason
- policy version
- `enforced: false`

The observer does not:

- throw based on a shadow decision
- return 401/403 based on a shadow decision
- mutate Square
- mutate Clerk metadata
- create billing
- activate lifecycle
- change scan limits
- modify Production

## 5. Preview reviewer preservation

The entitlement Preview branch is explicitly recognized as an authorized Preview review branch while retaining the same `VERCEL_ENV === preview` and reviewer allowlist requirements.

The prior `myaq-rec-001-preview-010` branch remains valid and unchanged.

## 6. Tests added/expanded

`tests/entitlement-shadow-policy.test.mts`

- shadow never enforces
- governed pilot resolution
- food reanalysis pilot mapping
- fridge detect/generate pilot mapping
- missing pilot feature mismatch
- Kenkho proposed matrix observation
- free/no-signal unresolved behavior
- pilot metadata alone does not impersonate governed pilot access

`tests/entitlement-shadow-coverage.test.mts`

- AQ Buddy observer wiring
- Food Scan analyze + reanalyze wiring
- Fridge detect + generate wiring
- Restaurant canary preservation
- structural assertion that shadow policy never contains `enforced: true`

`tests/synthetic-preview-policy.test.mts`

- both approved Preview branch names
- production remains rejected
- unlisted reviewers remain rejected

## 7. P1B exit criteria

P1B can be marked PASS when:

1. Vercel build for the branch succeeds.
2. Shadow observation is present on all scoped AI operations.
3. Existing access checks remain in place.
4. No shadow decision is enforced.
5. `main` and Production remain unchanged.
6. Comparison with baseline contains only P1/P1B scoped changes.

## 8. Recommended next phase

`MYAQ-ENT-P2 — Shadow Readback & Pre-Enforcement Remediation`

Before any enforcement:

1. collect/read representative shadow logs from the authorized internal pilot;
2. verify expected MATCH/REVIEW outcomes;
3. add pre-provider ownership validation to Food Scan reanalysis;
4. decide how the existing Food Scan usage counter becomes a shared usage gate;
5. prepare, but do not activate, the centralized entitlement gate for AQ Buddy;
6. keep D01–D09 commercial rules unresolved until separately approved.

Status at creation: `P1B IMPLEMENTED — AWAITING BUILD/DIFF VERIFICATION`.
