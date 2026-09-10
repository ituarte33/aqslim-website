# Supplement receipt actions

Actions appear only for the confirmed receipt returned by the existing sale action and remain after the cart resets. No sale, inventory, financial calculation, schema or Square code is changed.

- Print uses an isolated iframe containing only an escaped receipt document, then browser print. Print CSS controls margins and page breaks; dashboard navigation is absent.
- PDF downloads locally from that same snapshot. The small PDF 1.4 writer uses the standard Courier font and paginates long receipts without an added dependency. Spanish Latin characters are supported; characters outside WinAnsi use `?`. A custom embedded Unicode font would be needed for other scripts.
- Email requires the existing consultations write capability, rereads the confirmed receipt and its associated customer through GET-only Airtable calls, and sends only after an explicit click. It never trusts a client-supplied email address or amounts. The recipient is the linked customer's current valid email. Existing Resend key and `contact@aqslim.com` sender are reused.
- Email failures return Spanish feedback without affecting the sale. The client has an immediate in-flight guard and disables email after success. The server coalesces concurrent sends per receipt within an instance. A stable Resend idempotency key protects retries across instances during Resend's 24-hour retention window; this is not a permanent send-once guarantee after reloads beyond that window.
- Receipt eligibility lookup never sends an email. Print and PDF need no provider calls. Internal notes, SKU IDs and provider metadata are excluded from every document.

Focused QA:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test --experimental-strip-types app/dashboard/ventas-suplementos/receipt-actions.test.mts tests/supplement-sales*.test.mts tests/finance-metrics.test.mts
```

All providers in tests are mocked. Do not use a real sale or recipient for UI QA.

## Local verification — 2026-09-10

- Focused receipt, supplement-sale and finance tests: 86 passed, 0 failed.
- `npm run test:authorization` now includes the receipt action tests: 164 passed, 1 failed. The existing unrelated failure is `photo estimates can be corrected without creating another scan` in `flexible-meal-log-ui.test.mts`.
- Browser QA used the current receipt panel and document generator in an isolated local harness, with mocked email actions and no real sale or email writes. It verified the sending state, recoverable email failure, successful retry, and disabled button after success.
- The PDF was downloaded through the button and visually inspected: Colon Optimizer - Fiber 2 × $24 = $48; Veggie Laxative 2 × $18 = $36; AQ JOINTS 3 × $22 = $66; products $150 + shipping $24 = total $174. No extra unit.
- The print button prepared an isolated receipt document with the same amounts. The native macOS print dialog and physical printing remain unverified; creation of the print document is not confirmation of completed printing.
- The isolated browser harness production build passed. This does not replace a production build of the full application or live provider verification.
- Full-application production build also passed in a temporary copy of the current branch, using the matching Next.js 15.5.15 dependency installation and placeholder Resend/Clerk keys. Compilation, type checks, and page generation passed. This validates build compatibility, not live authentication or email delivery. The first attempt without provider environment values stopped on the existing booking webhook's missing Resend key.
