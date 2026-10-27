# Clinic release runbook — October 27, 2026

Status: candidate reviewed; Production remains unchanged. This document does not authorize deployment, configuration changes or real patient mutations.

## Reviewed artifact

- Repository: ituarte33/aqslim-website.
- Branch: release/clinic-production-candidate-2026-10-24.
- Reviewed source: 69005ed1c85453465652a7a5a4c98746eb96adeb.
- Source tree: 05231ffc0bb7f556517ef980f581dc45de98daea.
- Preview: dpl_9gARzbB2hC92NawJGhqvvPxsz6Sp, READY, target null.
- URL: https://aqslim-k3abw3yr5-ituarte33s-projects.vercel.app/clinic-preview.
- Baseline regression suite: 538 passed, zero failures. With the write-pause recovery changes: 540 passed, zero failures. TypeScript and diff checks must pass before publishing this release packet.

## Current evidence

| Flow | Evidence | Real mutation |
| --- | --- | --- |
| Restricted guides | Four approved PDF imports/readbacks; own-account Jing delivery and unauthenticated denial confirmed in screenshots | Private Preview storage only |
| Duplicate administration | Founder confirmed same person; review retains the primary history and adds one symptom questionnaire | None |
| General onboarding | Verified account recognized; shared-email duplicate correctly blocks alta | None |
| Consultation access | Genuine linked consultation selected; review correctly requires onboarding first | None |
| Automated writes | Provider-mocked authorization, readback, partial failure and replay checks | Synthetic only |

## Before Production changes

1. Obtain explicit release authorization from Rom for Production configuration and a staged Production build. “Continue” alone is not publication approval.
2. Reconfirm the reviewed branch SHA, current Production SHA/deployment, and the private store's environment connections. Do not print secret values.
3. Resolve the compatible recovery gate below before enabling patient administration. Do not describe the old deployment as safe after new-format writes.
4. Connect the existing private phase-guide store to Production; verify private access using the approved storage configuration. Do not make source files public or upload replacements.
5. Configure the approved Production Clinic environment and build an unaliased Production deployment. The Preview build cannot prove Production behavior.
6. Validate the exact staged build: Founder authorization; client ownership; operational access and manual restriction; phase-specific private PDF; candidate/live namespace separation. Use read-only checks against real patients. A real clinical mutation needs its own authorized action; do not fabricate a consultation for a smoke test.
7. Record the exact staged deployment ID and successful checks. Obtain explicit promotion approval if staging authorization did not include promotion of that verified artifact. Promote that exact build, then verify the intended domain.

## Compatible recovery gate

The old baseline bfdb443f7076e0c45d0be8998d94f848248f79c8 / dpl_5zMafMBwTYDpWuwQi2DBPbwVbUKP remains a pre-mutation fallback only. It predates patient-administration state and operational client grants.

Before enabling real administration, prepare and test a Production-compatible recovery build which preserves:

- archived, merging and merged patient denial, including explicitly bound accounts;
- completed-merge exclusion during unique-email resolution;
- operational entitlement reads, exact account binding, manual restrictions and lifecycle dates;
- authenticated private guide delivery and its Production storage connection;
- the existing public client features.

Keep MYAQ_CLINIC_ENABLED=enabled and the current private-storage connection in the recovery deployment. Set MYAQ_CLINIC_WRITES_PAUSED=true on an unaliased Production build from the compatible source, verify it, and preserve its deployment ID before enabling real administration. A recovery build must stop the affected write paths while retaining those reads and protections. Merely setting MYAQ_CLINIC_ENABLED off is insufficient: operational entitlement selection currently depends on that flag. Do not use an old deployment or that flag as a general post-mutation rollback. The candidate now includes that write pause via MYAQ_CLINIC_WRITES_PAUSED=true. It blocks the shared Clinic write guard, administration, onboarding, renewal and the subsequent-consultation action; review panels report execution disabled and the Clinic UI is read-only. Its code and synthetic checks are complete. The paused Production deployment itself still requires staging and validation before enabling real administration. Environment changes take effect on a fresh deployment; this is not an instantaneous switch for requests already running. The pause affects these Clinic write paths, not every legacy dashboard or client write in the application.

Never delete clinical history or attempt an automatic data rollback. An uncertain write or pending merge requires reconciliation from original records and its audit journal before another attempt.

## Reviewed duplicate case after release

These actions remain unexecuted and must be reviewed again against current source data in the enabled live interface:

1. Open the retained patient record containing the reviewed real consultation; verify source and target IDs directly rather than transcribing screenshots.
2. Review unification with the confirmed duplicate. Reconfirm same person, the symptom questionnaire addition, retained history and any new conflicts or protected references. Stop if the current review differs materially.
3. Execute the explicitly confirmed merge once. Verify the primary history, incorporated questionnaire, completed source audit and account binding. On a pending/uncertain response, reconcile instead of retrying.
4. Refresh onboarding review. Require a unique patient email and the verified account; preserve existing dates and restrictions. Complete alta only through its explicit confirmation.
5. Review the original real consultation again. Preserve its original date and resulting lifecycle. Do not invent a visit, reset a trial from today, or use a weight report as a consultation.
6. Confirm the client's own portal and assigned guide with the authorized account. No email or invitation is sent by these procedures.

## Scope retained

No Production promotion, Blob Production connection, Clinic enablement, real merge, archive, onboarding or access renewal was performed while preparing this packet. The separately authorized earlier weight import is unchanged. No additional patient data or credentials are copied into this public repository.
