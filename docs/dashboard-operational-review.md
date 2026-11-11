# Dashboard operational review — 2026-11-10

## Scope

Use the existing `/dashboard` program as the daily operating interface. Preserve clinical history, account permissions, billing actions, and external services. This review used source inspection, synthetic provider responses, automated tests, and TypeScript. It did not create patients, consultations, appointments, payments, or outgoing messages in live systems.

## Function inventory

| Function | Source behavior and review result | Remaining acceptance check |
| --- | --- | --- |
| Overview | Reads patients, Square appointments, and AQSLIM consultation revenue. Corrected summary revenue to use recorded AQSLIM totals rather than combining Square with cash and omitting other methods. Failed patient/appointment reads no longer imply zero patients or an empty agenda. | Compare current-month total with Finances and a known source period. |
| Appointments | Square service/availability/booking flow exists. Added refresh after successful booking, complete booking pagination, cancelled/past-date filtering, December-to-January calendar limit, and Pacific calendar display. | Founder checks availability and a genuine appointment when operationally needed. |
| Finances | Date filters and payment-method breakdown exist. Corrected Pacific month/week/day boundaries, weeks spanning months, and monthly AQSLIM revenue pagination. Added synthetic boundary and multi-page tests. | Reconcile a selected period with AQSLIM and Square separately; figures are not accounting reconciliation. |
| Clients | Search, pagination, history, and editing exist with server authorization. Active records are shown by default; archived/merged records are available through an explicit historical filter. The client table shows concise fields and dedicated consultation/plan actions. Archived patient editing and plan writes are blocked, while history and links to the primary record remain available. | Search a known client; check the correct record, archived/merged state, and existing history. Legacy lists still require explicit archived/merged visibility review. |
| New patient | Authorized registration and welcome workflow exist. No live registration/email test performed. | Use a real registration only when needed; verify saved identity and delivery independently. |
| Follow-up consultation | Existing form simplified; wellness inputs removed at Founder request. Added an immediate duplicate-submit guard. A failure to update the next appointment after saving the visit now returns success with a warning; manual local appointment times resolve in Pacific time. | Check one legitimate consultation and its history, fee, appointment and portal state. Network-level server idempotency is not introduced by the UI guard. |
| Supplements | Dedicated sale validation, persistence, inventory and receipt tests exist; suite passes. No live sale or email sent during review. | Inspect catalog availability; verify a genuine sale/receipt/inventory change when needed. |
| Plans / My AQSLIM | Preview route has synthetic/disconnected controls; patient editing also exposes live plan fields, while governed Clinic publication and private-material rules exist separately. A shared Plan y guía editor is now available inside the consultation, patient edit screen and the Planes y guías section. It saves a draft, requires review and explicit publication, rejects a stale reviewed draft, and uses the governed archival/publication/material pipeline. The preview experiment is retained separately but removed from the daily navigation. | Integrate one clear plan/guide workflow into the familiar dashboard; verify authorized plan revision in the patient's own session and preserve prior history. |
| Reports | Added real operational reports by date range: visits, unique patients, new/restart counts, consultation/supplement/shipping totals, daily breakdown and aggregate CSV. Existing pilot feedback remains reachable from Reports. | Founder reviews layout, chosen period and CSV in a spreadsheet. |
| ARIOS | OpenAI configuration was extended to Production with Founder permission. The deployment was rebuilt using the named approved release branch after an SHA-based deployment was found to disable the Clinic runtime gate. ARIOS is available in the Founder dashboard with same-origin/authentication checks, a private configuration-status read, bounded provider timeout, and handled provider failures. No live model request was made by this review. | Reproduce and identify the provider/authentication failure, then test the specific fix. |

## Verification

- Full suite: 555 passing tests, zero failures.
- TypeScript: passed with `--noEmit --incremental false`.
- `git diff --check`: passed.
- New tests cover DST boundaries, month-spanning weeks, Square and Airtable pagination, booking filtering, calendar year rollover, aggregate report export and partial consultation-save recovery.
- No physical browser validation or claim that every integration works live.
- Final live acceptance still requires the Founder session: one ARIOS response and an authorized plan/guide review in the linked client session. Tests do not prove provider delivery or live clinical workflow acceptance.

## Publication invariant

Build production from the named `release/clinic-production-candidate-2026-10-24` ref (or `main`), and verify Vercel `meta.githubCommitRef` before promotion. Building from an SHA as `gitSource.ref` resolves to an SHA in `VERCEL_GIT_COMMIT_REF`; the Clinic runtime deliberately rejects that value. Promoting a ready build alone is not enough. Preserve manual domain assignment and the paused recovery alias after each promotion.
