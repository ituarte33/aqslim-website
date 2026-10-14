# MYAQ-ENT-P5.1 — Extended AI Surface Live Canary

**Environment:** Preview only

**Inherited baseline:** MYAQ-ENT-P5 Founder Real-User Canary

**Purpose:** Capture live Founder-authenticated evidence for the three P5 surfaces that previously had entitlement diagnostic PASS only.

## In scope

1. Fridge Recipes
   - `fridge_recipe:detect`
   - `fridge_recipe:generate`
2. Restaurant Advisor
   - `restaurant_menu:analyze`
3. Weekly Summary
   - `weekly_summary:generate`

## Required evidence for PASS

For each surface:
- authenticated Founder real-user execution;
- entitlement enforcement is active;
- decision is `allow`;
- tier is `clinic_ai`;
- lifecycle is `ACTIVE`;
- reason is `CLINIC_AI_TRIAL_ACTIVE`;
- source is `founder_canary_preview_store`;
- user-visible output renders successfully;
- no Production or `main` write or activation occurs.

## Boundary

P5.1 does not authorize Production, public pricing, billing, Square subscription activation, or general client rollout.

The Founder lifecycle remains the explicitly synthetic Preview canary anchor documented in P5 and must not be interpreted as authority from a real qualifying clinic visit.
