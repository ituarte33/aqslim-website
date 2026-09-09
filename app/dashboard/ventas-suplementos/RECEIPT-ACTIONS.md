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
