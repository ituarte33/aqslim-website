# MYAQ-ACCESS — Founder Decision Readback v0.1

Date: 2026-09-11
Status: FOUNDER DECISION REQUIRED / NOT AUTHORIZED FOR IMPLEMENTATION
Prerequisite: `MYAQ-ENT-P2 — PASS / PRE-ENFORCEMENT FOUNDATION COMPLETE`
Scope: My AQSLIM access, entitlement, lifecycle and launch economics

## Purpose

Resolve the nine proposed access decisions required before My AQSLIM can move from shadow observation to governed Preview enforcement.

Nothing in this document authorizes Production, public pricing, real billing, real subscription creation, or lifecycle enforcement until explicitly approved.

## Decision readback

### MYAQ-ACCESS-D01 — Portal Basic for active clinic patients

Proposal:

Active in-person AQSLIM patients receive `portal_basic` at no additional charge.

`portal_basic` is the non-AI patient portal foundation and should preserve access to appropriate personal plan/progress/materials functions even when AI entitlement is absent.

Recommendation: **APPROVE**.

Reason: it supports continuity of care and gives My AQSLIM a useful baseline without turning every portal interaction into an AI cost event.

---

### MYAQ-ACCESS-D02 — Clinic AI monthly price

Proposal:

Create `clinic_ai` as the paid AI add-on for active in-person patients.

Candidate public price: **$12.99/month**.

Planning technology budget: approximately **$3.50/member/month**.

Recommendation: **APPROVE FOR PREVIEW ECONOMICS / HOLD PUBLIC PRICE** unless the Founder wants to lock $12.99 now.

Reason: architecture needs the tier, but public price can remain configurable until real usage data confirms cost and perceived value.

---

### MYAQ-ACCESS-D03 — 30-day AI activation trial after eligible Initial/Restart

Proposal:

After an eligible Initial Visit or Restart Visit, grant **30 days of My AQSLIM AI**.

After the trial:

- retain Portal Basic;
- continue AI through paid `clinic_ai`; or
- migrate to Kenkho Path when remote/permanent AI-supported care is the better path.

Recommendation: **APPROVE FOR PREVIEW DESIGN**.

Reason: creates a clear activation experience and lets patients experience AI support before deciding whether to continue.

---

### MYAQ-ACCESS-D04 — Clinic AI usage envelope

Proposal:

`clinic_ai` initial testing envelope:

- 3 AI scans/day;
- 90 AI scans/month;
- AQ Buddy;
- Food Scan;
- text meal entry;
- Fridge Recipes;
- Restaurant/Menu Advisor;
- Weekly Summary.

Recommendation: **APPROVE FOR PREVIEW TESTING, NOT AS PERMANENT PUBLIC LIMIT**.

Reason: the 3/day / 90/month envelope is conservative enough to control cost while producing real usage evidence. The shared Usage Gate built in P2 can support this without hard-coding a permanent commercial promise.

---

### MYAQ-ACCESS-D05 — Clinic lifecycle

Proposal:

Based on `Last Completed Visit`:

- `ACTIVE`: 0–30 days;
- `GRACE`: 31–60 days;
- `INACTIVE`: 61+ days.

Recommendation: **APPROVE**.

Reason: aligns My AQSLIM access with the real clinic relationship and avoids allowing a low-cost clinic add-on to become indefinite remote care.

---

### MYAQ-ACCESS-D06 — Restart threshold

Proposal:

Restart applies when the patient has been absent for **more than 60 days**.

Current Restart Visit price remains governed separately; current working offer is $35.

Recommendation: **APPROVE**.

Reason: it matches the lifecycle boundary and the existing Operation Phoenix reactivation rule.

---

### MYAQ-ACCESS-D07 — Clinic AI during INACTIVE state

Proposal:

When an in-person patient becomes `INACTIVE`:

- suspend `clinic_ai`;
- do not continue charging the `clinic_ai` add-on while suspended;
- retain only the governed limited/read-only portal behavior;
- present Restart or Kenkho Path as the re-entry path.

Recommendation: **APPROVE**.

Reason: prevents My AQSLIM AI from becoming an inexpensive substitute for continued clinic participation and avoids charging for an entitlement the patient cannot use.

---

### MYAQ-ACCESS-D08 — Kenkho Path as permanent remote route

Proposal:

Patients who want ongoing remote support without maintaining the in-person clinic lifecycle should use the appropriate Kenkho Path tier rather than indefinite `clinic_ai`.

Recommendation: **APPROVE**.

Reason: preserves clean product positioning and keeps remote care aligned with the service designed for it.

---

### MYAQ-ACCESS-D09 — Server-side entitlement gate before AI calls

Proposal:

Every cost-bearing AI operation must pass server-side checks in this order:

`IDENTITY → ENTITLEMENT → LIFECYCLE → USAGE LIMIT → AI CALL`

No visible button, client-side state, Clerk role alone, or Airtable edit may bypass this server-side gate.

Recommendation: **APPROVE AS MANDATORY ARCHITECTURAL CONTROL**.

Reason: this is the core cost/access protection already prepared in shadow form during P2.

## Recommended Founder disposition

Recommended bundle:

- **Approve D01**
- **Approve D02 as Preview economics, keep $12.99 public price configurable**
- **Approve D03 for Preview design**
- **Approve D04 for Preview testing only**
- **Approve D05**
- **Approve D06**
- **Approve D07**
- **Approve D08**
- **Approve D09**

## Implementation boundary after approval

Even if all nine are approved, the next phase should still be **Preview-only enforcement**.

Do not yet:

- change `main`;
- change Production;
- publish $12.99 publicly unless separately confirmed;
- create real Square subscriptions;
- charge real patients;
- apply lifecycle to external real clients;
- remove the current internal pilot.

## Proposed next phase after Founder approval

`MYAQ-ENT-P3 — Preview Enforcement Candidate`

P3 should implement the approved rules behind Preview-only feature flags, beginning with:

1. canonical entitlement record/schema;
2. lifecycle resolver;
3. `Last Completed Visit` calculation;
4. trial and paid-through resolution;
5. shared usage policy by tier;
6. server-side gates on all AI surfaces;
7. controlled internal-pilot tests;
8. no Production activation.
