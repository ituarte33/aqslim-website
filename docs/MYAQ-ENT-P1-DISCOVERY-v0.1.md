# MYAQ-ENT-P1 — Preview Entitlement Discovery v0.1

**Project:** MYAQ-001 — My AQSLIM Patient Portal  
**Branch:** `myaq-entitlement-preview-001`  
**Baseline:** `myaq-rec-001-preview-010` / `bb2c3d16c99240efc8ab5c0c79d0b2bdda6d2e3e`  
**Mode:** Preview only / Shadow only / No enforcement

## Current architecture observed

1. Clerk is authoritative for authenticated identity.
2. `lib/auth.ts` derives only two application roles: `admin` and `patient`.
3. The generic `patient` role currently receives `buddy:chat`, `portal:read:self`, profile/questionnaire and fasting self-service capabilities independent of a commercial entitlement resolver.
4. Food scan access currently derives an effective plan from Clerk private metadata plus governed pilot access, then applies daily/monthly limits server-side.
5. Food scan usage lookup fails closed when scan counts cannot be verified.
6. Internal Preview reviewer access is constrained by Vercel Preview environment, approved branch name and the `MYAQ_PREVIEW_REVIEWER_EMAILS` allowlist.
7. Fridge Recipes and Restaurant Advisor currently require governed pilot feature access before invoking AI.
8. Square subscription webhooks currently validate the Square signature, map subscription variation/status to a plan, then write `privateMetadata.plan` in Clerk.
9. The current Square plan flow does not yet create a separate canonical entitlement event/record.
10. The booking webhook records scheduled/canceled appointment state from verified inbound Square notification emails; it does not establish a reliable `Last Completed Visit` source.

## Material gaps before enforcement

### G1 — Generic patient capability is broader than commercial entitlement

AQ Buddy currently checks `requireCapability('buddy:chat')`. Because `patient` has that role capability, the request can reach AI without a second commercial entitlement decision.

### G2 — Food Scan has plan/usage logic but not a common entitlement resolver

Food Scan already contains useful fail-closed usage controls, but the logic is route-specific rather than a shared entitlement gate.

### G3 — Food Scan reanalysis is a separate AI-cost path

`PATCH action=reanalyze` invokes the AI provider after authentication and input validation but does not currently pass through the same daily/monthly usage decision used by `POST`.

This is a discovery finding only. No current behavior is changed in P1 Shadow Mode.

### G4 — AI tools use different access patterns

- AQ Buddy: generic role capability.
- Food Scan: authenticated user + plan/pilot usage policy.
- Fridge Recipes: authenticated user + pilot feature.
- Restaurant Advisor: authenticated user + pilot feature.

Before enforcement, these should converge on one server-side entitlement interface.

### G5 — No canonical completed-visit signal yet

Scheduled/canceled appointment evidence is not sufficient for lifecycle enforcement. ACTIVE/GRACE/INACTIVE must remain non-enforcing until a trustworthy completed-visit source is identified and validated.

### G6 — Square → Clerk plan metadata is not enough for final entitlement

The current webhook is a useful commercial signal, but the future architecture must process validated commercial events into a canonical entitlement state rather than treating Clerk plan metadata as the sole source of truth.

## P1 Shadow implementation boundaries

P1 may:

- create the Preview-only shadow policy;
- classify existing pilot and known Kenkho signals;
- emit non-sensitive server logs comparing current access with shadow decisions;
- mark unapproved clinic/commercial cases `unresolved`;
- add tests;
- preserve existing reviewer access on the entitlement Preview branch.

P1 may not:

- deny a currently authorized pilot request because of the shadow resolver;
- implement D01–D09 as production commercial policy;
- create real billing changes;
- change `main` or Production;
- infer completed visits from scheduled appointments;
- persist health content in entitlement logs.

## Shadow policy interpretation

Every P1 decision includes:

- `mode = shadow`
- `enforced = false`
- policy version `MYAQ-ENTITLEMENT-POLICY-PREVIEW-v0.1`

Governed internal pilot access may resolve from the existing pilot feature set.

Known Kenkho Start/Plus/Elite signals may be evaluated against the previously documented **Preview test matrix only**. This does not approve D01–D09.

Free, missing, clinic or otherwise unapproved commercial signals must remain `unresolved` rather than becoming a new denial rule.

## Next technical checkpoint

After the pure shadow policy tests pass, instrument AI-cost routes incrementally, beginning with a canary path, and compare:

`CURRENT_ACCESS_ALLOWED` vs `SHADOW_DECISION`

No enforcement should be enabled until mismatches are reviewed and explicitly approved.
