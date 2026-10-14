# MYAQ-ACCESS — Founder Decision Readback v0.1

Date: 2026-09-11
Status: **APPROVED FOR PREVIEW IMPLEMENTATION**
Prerequisite: `MYAQ-ENT-P2 — PASS / PRE-ENFORCEMENT FOUNDATION COMPLETE`
Scope: My AQSLIM access, entitlement, lifecycle and launch economics

## Founder disposition

Approved on 2026-09-11:

- **D01 — APPROVED**: active in-person AQSLIM patients receive `portal_basic` at no additional charge.
- **D02 — APPROVED FOR PREVIEW ECONOMICS ONLY**: create `clinic_ai`; use **$12.99/month** only as a Preview planning/testing parameter. This is **not** an approved public price.
- **D03 — APPROVED FOR PREVIEW DESIGN**: eligible Initial/Restart may grant a **30-day My AQSLIM AI trial**.
- **D04 — APPROVED FOR PREVIEW TESTING ONLY**: `clinic_ai` initial envelope = **3 scans/day / 90 scans/month** plus AQ Buddy, Food Scan, text meal entry, Fridge Recipes, Restaurant/Menu Advisor and Weekly Summary. These are **not** permanent public limits.
- **D05 — APPROVED**: clinic lifecycle based on `Last Completed Visit` = ACTIVE 0–30 days / GRACE 31–60 days / INACTIVE 61+ days.
- **D06 — APPROVED**: Restart applies after **more than 60 days** absent.
- **D07 — APPROVED**: when clinic patient becomes INACTIVE, suspend `clinic_ai`, do not continue charging while suspended, retain governed limited/read-only portal behavior, and offer Restart or Kenkho Path as re-entry routes.
- **D08 — APPROVED**: Kenkho Path is the permanent remote-support route rather than indefinite `clinic_ai`.
- **D09 — APPROVED AS MANDATORY ARCHITECTURAL CONTROL**: every cost-bearing AI operation must pass server-side checks in this order: `IDENTITY → ENTITLEMENT → LIFECYCLE → USAGE LIMIT → AI CALL`.

## Binding implementation boundaries

This approval authorizes **Preview implementation only**.

It does **not** authorize:

- changing `main`;
- changing Production;
- publishing $12.99 as a public price;
- creating real Square subscriptions;
- charging real patients;
- applying lifecycle enforcement to external real clients;
- extending the pilot beyond the currently authorized internal testers;
- removing the current internal pilot.

D02 and D04 remain configurable Preview parameters subject to validation.

## Approved next phase

`MYAQ-ENT-P3 — Preview Enforcement Candidate`

P3 may implement in Preview:

1. canonical entitlement record/schema;
2. lifecycle resolver;
3. `Last Completed Visit` calculation;
4. trial and paid-through resolution;
5. shared usage policy by tier;
6. server-side gates on AI surfaces;
7. controlled internal-pilot tests;
8. fail-closed behavior where required;
9. auditability of entitlement decisions.

Production activation remains separately gated and requires explicit Founder authorization.
