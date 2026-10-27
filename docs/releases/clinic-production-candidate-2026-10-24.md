# Clinic production candidate — October 24, 2026

Status: private review candidate. Do not promote or enable production without Rom's explicit approval.

## Source and rollback

- Production baseline: bfdb443f7076e0c45d0be8998d94f848248f79c8.
- Preserved rollback deployment: dpl_5zMafMBwTYDpWuwQi2DBPbwVbUKP.
- Clinic source integrated: 9bea1795c2b6ea131301b4fd85b93e546dc3d77b.
- Candidate branch: release/clinic-production-candidate-2026-10-24.
- Existing food-log update/delete, scan exceptions, account binding and official portal restrictions remain from Production.

## Runtime and data boundaries

The original Clinic Preview branch retains its previous behavior. The release branch in Preview is read-only: Clinic writes, weight updates, material assignment and FAST 36 outcome writes are blocked on the server. It reads the live namespace to allow review without converting test data into real records.

Production Clinic requires both the approved branch and MYAQ_CLINIC_ENABLED=enabled. The flag is not set by this candidate. Founder email verification remains server-side on every internal route. /clinic redirects to the private Clinic workspace; the public homepage keeps its existing routing.

Live workspace records use live:<patient-id>:... keys and Preview Only=false; Preview rows are excluded from live reads, patient-reported weight aggregation, draft lookup, material history and direct record mutations. No records are automatically copied, deleted, relabeled or published. Existing operational Consultas remains the authority for published consultations. Recording a weight does not create a consultation.

Live plan drafts use their own key. Publishing remains explicit, archives the prior plan before overwriting it, verifies persistence, and invalidates old material assignments. Phase PDFs follow only the published phase. FAST 36 is gated by the active plan in both the UI and the server action.

Existing portal access restrictions retain their approved storage contract. Restrict/restore remains explicit and verified. Legacy Preview pilot activation/migration is deliberately not enabled in Production; it must not be used as general paid-client provisioning.

## Checks and outstanding release gates

- Full authorization suite must pass using the existing Production tsx runner.
- Clinic tests include production environment gating, exact Founder identity, wrong-patient exclusion, Preview exclusion, read-only candidate behavior, archive-before-publication failure handling and phase-specific client materials.
- TypeScript and Vercel build must pass.
- Browser validation is pending: Browser plugin is unavailable and the local Playwright browser executable is not installed.
- Verify the exact candidate on a Founder session and a separate client session before release.
- The corrected Jing PDF is currently private in Drive. Client-readable delivery must be resolved and tested; the other phase files retain their existing sharing permissions.
- Review real patient-reported data individually before any import. Keep test consultations excluded. Reusing the Preview record set wholesale is prohibited by the release design.
- Preserve the rollback target above. A code rollback does not reverse subsequent clinical writes; no destructive data migration is included.

After Rom approves publication, configure the production enablement flag, build a production deployment without assigning the public domains, check it, then promote that exact staged deployment. Do not promote this Preview build as proof of Production behavior.

## October 25 — corrections from Founder screenshots

The Clinic My AQSLIM tab now checks the published plan before displaying FAST 36 scheduling. Plans without FAST 36, missing plans, loading states and failed plan reads expose no schedule form. A patient switch cannot reuse the previous patient's plan status. No existing schedule or clinical record is deleted.

Candidate save, publication, access-change and status-change controls are disabled in the UI, and their event handlers return without issuing writes. The portaled plan editor and materials panel inherit the same mode. The existing server-side write block remains unchanged. Navigation, account reconciliation and read-only records remain available.

Validation: TypeScript passed; all 154 Clinic/materials tests passed; seven synthetic React server-render scenarios passed. Browser plugin is unavailable and no local Chromium binary is installed, so browser interactions and visual confirmation of these corrections remain pending. These changes do not enable or deploy Production, alter access grants, migrate patient data or change Drive sharing.

## October 25 — restricted Jing document delivery

Rom selected restricted delivery rather than an anyone-with-link Drive permission. The Jing PDF link now points to an authenticated application route. Every request checks the current account-to-patient binding, the governed access record, the linked published plan and its canonical Jing phase before reading private storage. Revoked, absent, ambiguous or unverifiable access fails closed. The response contains PDF bytes with private/no-store headers and never redirects to a storage URL. This controls future access; it cannot revoke copies or screenshots already retained by an authorized viewer.

Private Vercel Blob store `store_kTNpZ9VqPWx4ByUt` (`aqslim-private-phase-guides`, private, iad1) has been created without a project connection. The connector cannot attach an existing store. A manual connection to the aqslim project in Preview is still required; Production is not connected or enabled. After connecting, open `/clinic-preview/private-guides` to import the corrected Jing PDF. The Founder-only importer checks same-origin requests, caps the body, accepts only the SHA-256-pinned approved PDF, and verifies its private readback. It does not write patient data. No plaintext PDF, token or secret is added to the repository.

Release gates remain: connect the private store in Preview, import the approved PDF, verify it from an authorized client session and verify a forwarded link cannot be opened without authorized access. Other phase PDFs retain their existing Drive delivery and sharing settings; this change protects Jing only. The original Jing Drive file remains restricted. The separate real-data review and Production approval gates remain open.

## October 26 — completed checks and remaining guides

The private store is connected to Preview only. The corrected Jing PDF was imported through the Founder session and its private readback verified. Founder screenshots confirmed the PDF opens on the candidate app hostname. In an incognito session, after passing Vercel authentication, the forwarded PDF link returned to My AQSLIM login without displaying the document. A separate pilot account was observed as linked and active; its own-session physical test is still pending. No Production release or storage connection has been authorized.

One individually reviewed patient-reported weight was copied into the live namespace after explicit authorization, preserving its original date and the original Preview row. Readback and Founder screenshots verified the single weight in Clinic and the client portal. No operational consultation, charge, or bulk import was created. The client portal also retains separate historical FAST 36 measurements; absent historical dates were not invented.

The candidate now supports restricted delivery for Jing, Qi, Xue, and Yang Sheng. All links use the authenticated app route, and each request must match the caller's currently published phase. Catalog PDF hashes and immutable private paths are fixed; arbitrary uploads, wrong-phase content, overwrites, and cross-origin imports are rejected. The Founder importer accepts multiple original PDFs, identifies each by digest, verifies private readback, and reports each phase independently. The existing Jing blob and pathname are preserved. PDF contents and credentials remain outside Git.

The additional three PDFs were retrieved unchanged from the existing Drive sources and their exact digests checked. Their private upload and physical client delivery remain pending. Drive metadata reports sharing but does not reveal the effective permissions through this connection, so restricted access to those original Drive files has not been verified or changed. Do not claim all copies of the documents are restricted until their original sharing is reviewed.

Validation: all 495 automated tests and TypeScript pass. Route tests cover all 16 requested/current phase combinations, revoked or absent access, wrong-patient bindings, invalid slugs, private/no-store headers, and Founder-only import. Storage tests cover phase-specific digests, bounded input, corrupt readback, idempotency, and no-overwrite behavior. Browser plugin is unavailable; the updated multi-file uploader still requires physical verification. General production client provisioning and explicit release approval remain open.


## October 27 — general client onboarding candidate

Clinic's client-access panel now distinguishes ordinary clients from the internal pilot. Founder review checks a unique patient email, a unique Clerk account with that exact verified email, existing account bindings, governed access and real linked Consultas. Missing accounts, duplicate identities, conflicts and provider failures cannot create a grant. The client first creates their own My AQSLIM account; this flow sends no invitation or message.

The release candidate exposes review only. Execution requires the enabled Production Clinic runtime, exact Founder identity, same-origin request, explicit ALTA confirmation and a fresh server-recomputed fingerprint. An existing grant is retained, including restrictions and commercial dates. A new basic grant uses the operational (Preview Only=false) scope and never creates a consultation or payment. Where a real eligible new/restart consultation establishes a still-current trial, the existing P4 policy supplies its original 30-day window; onboarding never restarts that clock. Later eligible-visit renewals remain a separate release gate because the legacy P4 visit provisioning writer is still Preview-only.

Execution rereads access and Clerk metadata before reporting success. Clerk metadata keys unrelated to the patient binding are preserved. A partial Clerk failure can resume after fresh review without creating another access record. Concurrent duplicate patient grants fail closed. Real mutations were tested with synthetic provider mocks only; no real client was enrolled by this implementation.

Operational reads are enabled only in the candidate or explicitly enabled Production runtime. They include legacy restrictions in the same duplicate check, require the exact Clerk subject on client requests, and refresh clinical lifecycle from genuine patient-linked Consultas on every read. Weight-only events do not extend access. New basic grants cannot obtain AI through legacy current-access or pilot hints. Access source failures now fail closed in the portal layout. The client panel offers manual restriction or restoration while preserving the account binding and clinical dates.

The four private guide uploads/readbacks and separate iPhone account/PDF flow have since been physically verified. The source folder and selected source PDF sharing were confirmed Restricted in owner screenshots. Those completed checks supersede the earlier pending guide-upload/sharing notes; Production storage remains disconnected.

Validation: synthetic identity, route, dual-store execution, partial failure/retry, original trial dates, lifecycle authority and AI denial tests; complete existing suite; TypeScript. Browser plugin is unavailable and the local Playwright Chromium executable is absent, so the new rendered onboarding panel still needs Founder visual/interaction review. No Production enablement, promotion, source data migration, invitation, new account, consultation, charge or patient activation was performed.
