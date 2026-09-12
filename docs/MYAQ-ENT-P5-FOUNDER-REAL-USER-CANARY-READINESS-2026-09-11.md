# MYAQ-ENT-P5 — Founder Real-User Preview Canary
## Readiness Summary — 2026-09-11

**Status:** CORE REAL-USER CANARY PASS / EXTENDED SURFACES PENDING

**Branch:** `myaq-ent-p5-founder-real-user-preview-canary`

**Validated branch head before this summary:** `3acbdf682965321f34b14c2e93343506feba98ee`

**Environment:** Preview only

**Production / `main`:** Not modified by P5 validation work.

---

## 1. Purpose

P5 validates the approved `clinic_ai` entitlement experience using the Founder’s authenticated real account while preserving `internal_pilot` as a safety net and keeping the exercise isolated to Preview.

P5 is not a Production rollout and does not authorize billing, public pricing, Square subscription activation, or general client rollout.

The Founder canary uses a synthetic Preview lifecycle anchor to exercise `clinic_ai` because the Founder’s real Airtable history does not currently provide the qualifying clinic-visit authority needed to evaluate D11 literally. This anchor is not a clinical consultation record and does not alter clinical history.

---

## 2. Core real-user validation — PASS

### AQ Buddy

**Result:** PASS

Observed in live authenticated use:
- capability: `buddy:chat`
- enforcement: `true`
- decision: `allow`
- tier: `clinic_ai`
- lifecycle: `ACTIVE`
- reason: `CLINIC_AI_TRIAL_ACTIVE`
- source: `founder_canary_preview_store`
- provider: OpenAI
- model: `gpt-5.6-luna`
- HTTP 200

Verified patient portal context was used successfully for current AQSLIM phase, week, FAST 36 status, and plan data.

### Governed Jing guidance

**Result:** PASS

AQ Buddy and My AQSLIM Home now share governed phase guidance instead of generic low-carb recommendations.

For Jing, current governed behavior includes:
- carbohydrate target `<20 g/day`;
- do not default to avocado or nuts as priority foods at the beginning of Jing;
- cheese is not treated as unrestricted;
- corn tortillas are not automatically prohibited and must follow the authorized plan rule;
- do not invent an exact approved-food list when none is verified;
- recorded special instructions take priority.

### My AQSLIM Home routing — MYAQ-UX-D12

**Result:** PASS

Validated end-to-end path:

`Vercel Preview → Visit → public AQSLIM site → Portal Paciente → sign-in → /my-aqslim`

The patient portal now lands on My AQSLIM Home rather than Food Scanner.

Also validated:
- installed-app start route → `/my-aqslim`;
- patient sign-in and sign-up force redirect → `/my-aqslim`;
- direct navigation to Food Scanner still works when intentionally selected.

### Daily AQ Buddy Guidance on Home — MYAQ-UX-D13

**Result:** PASS

Validated:
- Home shows phase-aware daily guidance below the current-plan card;
- current canary displayed `Jing · Semana 3`;
- guidance is generated from governed portal context without an AI call on every Home load;
- “Ver recomendaciones completas” opens AQ Buddy with a prefilled phase-aware prompt;
- prompt is not auto-submitted;
- full-screen composer remains visible above patient bottom navigation;
- live AQ Buddy response remained under `clinic_ai` enforcement.

---

## 3. Food Scan `clinic_ai` policy — PASS

### Usage policy

**Approved Preview parameters:**
- 3 scans/day
- 90 scans/month

**Result:** PASS

Live Founder account validated as:
- tier: `clinic_ai`
- lifecycle: `ACTIVE`
- reason: `CLINIC_AI_TRIAL_ACTIVE`
- source: `founder_canary_preview_store`

Observed UI and server state:
- 2/3 → 3/3 daily usage;
- 2/90 → 3/90 monthly usage;
- fourth scan disabled by UI;
- backend daily-limit probe returned HTTP 429 before AI analysis.

### Daily-limit server enforcement

**Result:** PASS

Validated server response after 3/3:
- HTTP 429
- `error: limit_reached`
- `period: day`
- daily used/limit remained 3/3
- monthly used/limit remained 3/90
- no additional AI analysis occurred.

---

## 4. MYAQ-ACCESS-D10 reanalysis policy — PASS

**Approved rule:** A correction/reanalysis does not consume an additional daily or monthly scan, but is limited to a maximum of 2 reanalyses per original scan.

Validated on saved Founder scan:

### First correction
- live `PATCH /api/food-scan/saved/[mealLogId]` → HTTP 200;
- capability: `food_scan:reanalyze`;
- tier: `clinic_ai`;
- correction persisted;
- remaining corrections changed 2 → 1;
- no new `POST /api/food-scan` occurred.

### Second correction
- portion was corrected using the dedicated Portion field;
- correction persisted;
- remaining corrections changed 1 → 0;
- no additional scan was consumed.

### Third-correction negative test
- UI disables further reanalysis at 0/2 remaining;
- Founder-only backend probe bypassed only the disabled UI;
- server returned HTTP 429 `reanalysis_limit_reached`;
- used remained 2/2 and remaining 0;
- no additional reanalysis provider call occurred;
- saved scan was not modified.

### Portion conflict safeguard

A test exposed a conflict when the correction text stated a consumption percentage while the dedicated Portion field held a different value. The saved-scan correction flow now rejects consumption-percentage instructions in free text before consuming a correction and directs the member to use the Portion field as the single authority.

A controlled Preview-only reset was used to remove the invalid second reanalysis test event and restore the scan to the state after its first valid correction before retesting.

---

## 5. Identity and isolation — PASS

Validated P5 controls:
- Founder canary is Preview-only;
- Founder authenticated subject can resolve the claimed P5 `clinic_ai` entitlement;
- `internal_pilot` remains present as a safety net outside the isolated P5 override;
- Founder-specific patient binding does not widen generic admin access;
- P5 entitlement source: `founder_canary_preview_store`;
- no Clerk account mutation was required;
- no Production or `main` activation was performed.

---

## 6. Lifecycle / provisioning boundary

### D11 qualifying visit rule

Approved qualifying lifecycle visit types:
- Cliente Nuevo
- Cliente subsecuente
- Cliente Re-Inicio

Non-qualifying:
- Suplementos
- Suplementos + Envio

P3/P4 canaries validated this lifecycle/provisioning logic using isolated test subjects and the consultation-save path.

**P5 limitation:** the Founder real-user canary does not prove lifecycle authority from the Founder’s real qualifying clinic visit, because the Founder’s Airtable record does not currently contain a qualifying linked consultation usable for D11 authority. P5 therefore uses an explicitly synthetic Preview lifecycle anchor. Do not interpret the P5 ACTIVE lifecycle as a real clinical-visit determination.

---

## 7. Extended surfaces — NOT YET LIVE-CANARY VALIDATED

The P5 diagnostic page resolves the following capabilities as `clinic_ai / ACTIVE / allow`:
- Fridge Recipes
- Restaurant Advisor
- Weekly Summary

However, these surfaces have **not yet been exercised as live Founder human canaries under P5**.

Therefore they remain:

**ENTITLEMENT DIAGNOSTIC PASS / LIVE FEATURE CANARY PENDING**

No claim of complete P5 feature readiness should include these three surfaces until live requests and runtime evidence are captured.

---

## 8. Production readiness determination

**P5 does not authorize Production.**

Current determination:

> `MYAQ-ENT-P5 — CORE REAL-USER CANARY PASS / EXTENDED SURFACES PENDING / PRODUCTION NOT AUTHORIZED`

The core entitlement experience, AQ Buddy, governed Home guidance, Food Scan limits, server enforcement, and D10 correction policy are validated with the Founder’s authenticated real account in Preview.

Before considering a broader canary or Production decision, complete live P5 smoke tests for:
1. Fridge Recipes
2. Restaurant Advisor
3. Weekly Summary

Recommended next work item:

> `MYAQ-ENT-P5.1 — Extended AI Surface Live Canary`

Keep Founder-only, Preview-only, no billing, no Square subscription activation, no Production writes, and retain fail-closed entitlement enforcement.
