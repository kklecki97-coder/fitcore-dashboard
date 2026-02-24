# FitCore — Payments Infrastructure Plan

> Author: Kamil | Date: Feb 24, 2026
> Purpose: Full architecture plan for how payments will work in FitCore. Share with Jakub for review.

---

## Table of Contents

1. [Overview](#overview)
2. [Recommended Payment Model](#recommended-payment-model)
3. [How It Works — Client Perspective](#client-perspective)
4. [How It Works — Coach Perspective](#coach-perspective)
5. [Technical Architecture](#technical-architecture)
6. [Stripe Connect Deep Dive](#stripe-connect)
7. [Apple Pay, Google Pay & Digital Wallets](#digital-wallets)
8. [Payment Methods by Market](#payment-methods-by-market)
9. [Fee Breakdown](#fee-breakdown)
10. [Cash & Offline Payments](#cash-payments)
11. [Legal & Tax Considerations](#legal-tax)
12. [Invoicing Compliance (KSeF)](#invoicing-compliance)
13. [International Payments](#international-payments)
14. [Competitive Analysis](#competitive-analysis)
15. [Recommended Third-Party Services](#recommended-services)
16. [Risks & Trade-Offs](#risks)
17. [Implementation Roadmap](#roadmap)

---

## 1. Overview <a id="overview"></a>

FitCore needs payment infrastructure so coaches can charge their clients directly through the platform. The goal:

- **Clients** pay like they're shopping on Amazon — click, pay, done
- **Coaches** connect their bank account with one button click
- **FitCore** takes a platform fee (e.g. 10%) on every transaction
- **Nobody** needs to understand payment processing, APIs, or compliance

**Key decision: We use Stripe Connect (Express accounts).** Stripe is the regulated entity that handles all money flow. FitCore is a technology platform, NOT a payment institution — so we don't need any financial licenses.

---

## 2. Recommended Payment Model <a id="recommended-payment-model"></a>

### Stripe Connect with Express Accounts + Destination Charges

| What | Detail |
|---|---|
| **Model** | Marketplace / platform (like Airbnb, Uber, Shopify) |
| **Processor** | Stripe Connect |
| **Account type** | Express — Stripe handles onboarding, KYC, compliance |
| **Charge type** | Destination charges — atomic charge + transfer in one API call |
| **Revenue model** | `application_fee` on every transaction (FitCore's cut) |
| **License needed?** | NO — Stripe is the licensed entity |

### Why Stripe?

- **78% of SaaS companies** use Stripe (industry standard)
- **$1.4 trillion** processed in 2025
- Every major fitness platform uses it (TrueCoach, Trainerize, PT Distinction, Exercise.com)
- Best-in-class APIs, developer experience, and documentation
- Full Poland support, 46+ countries, 135+ currencies
- Purpose-built marketplace features (Connect)

---

## 3. How It Works — Client Perspective <a id="client-perspective"></a>

The client experience is identical to buying something online:

```
1. Client receives invoice (email or client portal notification)
2. Clicks "Pay Now"
3. Sees a payment page with options:
   - Card (Visa, Mastercard)
   - Apple Pay (if on iPhone/Safari)
   - Google Pay (if on Android/Chrome)
   - BLIK (if in Poland)
   - SEPA Direct Debit (if in EU)
   - Bank transfer (P24 for Poland)
4. Picks their method, pays
5. Gets confirmation — done
```

The client never sees "Stripe" or "FitCore payment processing." They just pay like they would anywhere else.

**Stripe's AI automatically shows the best payment methods** based on the client's device, location, browser, and currency. A Polish client on an iPhone sees BLIK + Apple Pay first. A German client sees SEPA + card. An American sees card + Apple Pay.

---

## 4. How It Works — Coach Perspective <a id="coach-perspective"></a>

### Connecting Payments (One-Time Setup)

```
1. Coach clicks "Connect Payments" in FitCore Settings
2. Redirected to Stripe's hosted onboarding page
3. Enters:
   - Country
   - Bank account (IBAN)
   - ID verification (passport/license photo)
   - Business type (individual / company)
   - Tax ID (if applicable)
4. Stripe verifies everything (usually instant)
5. Redirected back to FitCore → "Payments Connected ✓"
```

**That's the entire process.** Stripe handles identity verification, compliance, and bank validation. The coach never sees an API key, never configures anything technical. The onboarding page is available in 40+ languages including Polish.

### After Connecting — Settings Page Shows:

```
✓ Connected
Payouts to: ****4821 (PKO Bank)
Next payout: Feb 28 — $1,240.00

Payment methods enabled:
✓ Cards (Visa, Mastercard)
✓ Apple Pay / Google Pay
✓ BLIK (Poland)
✓ SEPA Direct Debit (EU)

☑ Also accept cash / offline payments

Platform fee: 10% per transaction
Payout schedule: Weekly (every Friday)
```

### Creating & Sending Invoices

```
1. Coach creates invoice in FitCore dashboard (client, amount, service)
2. FitCore generates a Stripe payment link automatically
3. Client gets email/notification with "Pay Now" button
4. Client pays → webhook confirms → invoice auto-marked "Paid"
5. Coach gets payout to bank on next payout cycle
```

For coaches who haven't connected Stripe (or prefer cash), the "Mark Paid" button handles offline tracking.

---

## 5. Technical Architecture <a id="technical-architecture"></a>

### End-to-End Payment Flow

```
COACH CREATES INVOICE IN FITCORE DASHBOARD
         │
         ▼
┌──────────────────┐
│  FitCore Backend  │  1. Create invoice record in DB (status: "draft")
│  (API Server)     │  2. Generate compliant invoice via Fakturownia API
└──────────────────┘  3. Create Stripe PaymentIntent with destination charge
         │               - amount, currency, connected_account (coach)
         │               - application_fee_amount (FitCore's cut)
         │               - metadata: { invoice_id, coach_id, client_id }
         ▼
┌──────────────────┐
│  Client Payment   │  4. Client receives payment link (email / portal)
│  (Stripe Checkout)│  5. Pays via card, Apple Pay, BLIK, SEPA, etc.
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Stripe Webhooks  │  6. payment_intent.succeeded fires
│  → FitCore API    │  7. Verify webhook signature (security)
└──────────────────┘  8. Process idempotently (deduplicate)
         │            9. Update DB: invoice → "paid", record paidDate
         │            10. Finalize Fakturownia invoice
         ▼            11. If B2B Polish → submit to KSeF
┌──────────────────┐
│  Dashboard Update │  12. Coach sees "Payment Received" in real-time
│  + Coach Payout   │  13. Stripe auto-pays coach on schedule
└──────────────────┘      (minus Stripe fees + FitCore application fee)
```

### Key Webhook Events to Handle

| Event | What It Means |
|---|---|
| `payment_intent.succeeded` | Payment successful → mark invoice "paid" |
| `payment_intent.payment_failed` | Payment failed → notify coach |
| `invoice.paid` | Stripe invoice paid (if using Stripe Invoicing) |
| `invoice.overdue` | Past due → notify coach |
| `account.updated` | Coach verification status changed |
| `payout.paid` | Coach received payout to bank |
| `payout.failed` | Payout to coach failed → alert |
| `charge.dispute.created` | Client disputed charge → alert coach |

### Webhook Best Practices

1. **Return 200 immediately** — before any business logic. Queue for async processing.
2. **Verify signatures** — use Stripe's webhook signing secret.
3. **Process idempotently** — store processed event IDs, skip duplicates.
4. **Use a message queue** — push webhook payloads to Redis/SQS for workers.
5. **Monitor failures** — alerts for webhook delivery failures.

### Simplified Database Schema

```sql
CREATE TABLE invoices (
  id                        UUID PRIMARY KEY,
  coach_id                  UUID REFERENCES coaches(id),
  client_id                 UUID REFERENCES clients(id),
  amount_cents              INTEGER NOT NULL,
  currency                  VARCHAR(3) DEFAULT 'EUR',
  status                    VARCHAR(20) DEFAULT 'draft',
    -- draft -> sent -> paid -> refunded
    -- draft -> sent -> overdue -> paid
    -- draft -> cancelled
  payment_method            VARCHAR(20),  -- 'stripe', 'cash', 'bank_transfer'
  stripe_payment_intent_id  VARCHAR(255),
  fakturownia_invoice_id    VARCHAR(255),
  ksef_number               VARCHAR(255),  -- null if B2C or non-Polish
  due_date                  DATE,
  paid_at                   TIMESTAMP,
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Stripe Connect Deep Dive <a id="stripe-connect"></a>

### Account Types Comparison

| Feature | Express (Our Choice) | Custom | Standard |
|---|---|---|---|
| Onboarding UI | Stripe-hosted | You build it | Stripe-hosted |
| KYC/verification | Stripe handles | You handle | Stripe handles |
| Platform control | High | Maximum | Low |
| Dev effort | Low | Very high | Minimal |
| Per-account fee | $2/month active | $2/month active | $0 |
| Best for | SaaS marketplaces | Full white-label | Simple referrals |

### Coach Onboarding Flow (Express)

```
1. Coach clicks "Connect Payments" in FitCore
2. Backend: POST /v1/accounts
     { type: "express", country: "PL", email: "coach@email.com" }
     → Returns account ID (acct_xxx)
3. Backend: POST /v1/account_links
     { account: "acct_xxx", return_url: "fitcore.io/settings?connected=true" }
     → Returns one-time Stripe URL
4. Coach redirected to Stripe → completes onboarding
5. Coach redirected back to FitCore
6. Webhook: account.updated → verify fully onboarded
7. Save stripe_account_id to coach's profile → "✓ Connected"
```

**Total backend code: ~50 lines.** Stripe maintains the entire onboarding UI.

### Destination Charges — How Money Flows

```
Client pays $200 for coaching
         │
         ▼
Stripe processes charge on FitCore's platform account
         │
         ├── Application fee (10%): $20 → FitCore keeps
         ├── Stripe processing fee: ~$3.25 → Stripe keeps
         └── Remainder: $176.75 → transferred to coach's connected account
                                   → paid out to coach's bank on schedule
```

One API call handles the entire split:
```javascript
stripe.paymentIntents.create({
  amount: 20000,          // $200 in cents
  currency: 'usd',
  application_fee_amount: 2000,  // FitCore's 10% cut
  transfer_data: {
    destination: 'acct_coach_xxx',  // Coach's connected account
  },
});
```

---

## 7. Apple Pay, Google Pay & Digital Wallets <a id="digital-wallets"></a>

### Critical Fact: They Are NOT Separate Processors

Apple Pay and Google Pay are **wallet interfaces** that sit ON TOP of Stripe. The flow:

```
Client taps "Pay with Apple Pay" on their phone
    → Apple Pay tokenizes the stored card
    → Token sent to Stripe
    → Stripe processes it like a normal card payment
    → Money flows through Stripe Connect → to the coach
```

### Key Points

| Question | Answer |
|---|---|
| Do they add extra fees? | **NO.** Same price as a regular card payment |
| Do we need separate accounts? | **NO.** Stripe handles everything |
| Do they work with Stripe Connect? | **YES.** Enabled by default |
| Does the coach need to do anything? | **NO.** Automatic |
| Do we need to integrate them separately? | **NO.** Stripe Checkout shows them automatically |

### Why We Must Offer Them

| Metric | Data |
|---|---|
| Apple Pay users globally | ~818 million |
| Google Pay users globally | ~200-250 million |
| Conversion boost with Apple Pay | **+22% average** |
| Checkout time reduction | **50%+ faster** |
| Users who say one-click checkout matters | **84%** |

For fitness clients paying invoices on mobile, this is huge. Invoice arrives → open on phone → tap Apple Pay → biometric confirm → done in 3 seconds.

### Stripe Checkout Auto-Detection

When using Stripe Checkout or Payment Element, the system automatically:
- Detects if the client's device supports Apple Pay or Google Pay
- Shows the wallet button prominently if available
- Falls back to card entry if not
- Uses AI to determine optimal ordering of all payment methods

**We don't build any of this. Stripe renders the optimal checkout per customer.**

---

## 8. Payment Methods by Market <a id="payment-methods-by-market"></a>

### What Stripe Checkout Automatically Shows Per Client

**Polish client (PLN):**
| Method | Fee | Notes |
|---|---|---|
| BLIK | 1.6% + 1.00 PLN | **76% of Polish e-commerce uses this — must-have** |
| Card | 1.5% + 1.00 PLN | Standard fallback |
| Apple Pay / Google Pay | 1.5% + 1.00 PLN | Same as card, zero extra fees |
| Przelewy24 (P24) | 1.9% + 1.00 PLN | Bank transfer, popular in Poland |

**EU client (EUR):**
| Method | Fee | Notes |
|---|---|---|
| Card (EEA) | 1.5% + 1.00 PLN (~€0.23) | Cheapest card rate |
| Apple Pay / Google Pay | Same as card | Auto-detected |
| SEPA Direct Debit | **0.8% + 1.00 PLN** | Cheapest option, great for recurring |
| iDEAL (Netherlands) | €0.29 flat | Dutch-specific |
| Bancontact (Belgium) | 1.5% + €0.25 | Belgian-specific |

**US client (USD):**
| Method | Fee | Notes |
|---|---|---|
| Card | 1.5% + 1.00 PLN + 1% intl + 1% FX | Non-EEA + currency conversion |
| Apple Pay / Google Pay | Same as card | Very popular in US (65M users) |

### BLIK — Critical for Polish Market

- **76% of Polish e-commerce** payments use BLIK
- **14.2 million active users** (out of 38M population)
- **86% adoption among ages 15-24**
- **2.4 billion transactions** in 2024
- Contributed ~1.2% to Poland's GDP

**If we serve Polish coaches with Polish clients, BLIK is not optional — it's essential.** Stripe supports it natively.

### SEPA Direct Debit — Best for EU Recurring

- Covers **34 countries**, 520+ million people
- Fee: **0.8%** — almost half the cost of card payments
- Bank details don't expire (unlike cards) → less failed payments
- Ideal for monthly coaching subscriptions
- Settlement delay: 5-7 days (first), 3 days after

---

## 9. Fee Breakdown <a id="fee-breakdown"></a>

### Intra-EEA Transaction (€100, standard European card)

| Item | Cost |
|---|---|
| Stripe processing | €1.65 (1.4% + €0.25) |
| Connect active account fee | ~€0.07/tx (amortized $2/mo) |
| Payout to coach | €0.50 (0.25% + €0.25) |
| **Total platform cost** | **€2.22** |
| FitCore application fee (10%) | **€10.00 revenue** |
| **Net margin per transaction** | **€7.78** |

### International Transaction ($100 USD, US client → Polish coach)

| Item | Cost |
|---|---|
| Stripe processing (non-EEA card) | ~$3.52 (3.25% + €0.25) |
| Cross-border payout | 0.25% ($0.25) |
| Currency conversion (FX) | ~1% ($1.00) |
| FitCore application fee (10%) | $10.00 |
| **Net to coach** | **~$85.23** |

### Cost Comparison: Card vs SEPA for Recurring EU Payments

For a coach charging €200/month to 20 EU clients:
- **Cards**: 20 × €3.23 = €64.60/month in fees
- **SEPA**: 20 × €1.83 = €36.60/month in fees
- **Savings: €336/year per coach** on processing alone

### Stripe vs PayPal (€100 in Poland)

| | Stripe | PayPal |
|---|---|---|
| European card | €1.73 | €3.25 |
| Non-European card | €2.73 | €4.50+ |
| SEPA Debit | €1.03 | €1.50 |
| BLIK | €1.83 | Not supported |
| P24 | €2.13 | Not supported |

**Stripe is cheaper across the board** and supports Polish-specific methods PayPal cannot.

---

## 10. Cash & Offline Payments <a id="cash-payments"></a>

Real scenario: coach trains someone in person, gets paid cash.

### How It Works in FitCore

```
Coach creates invoice for in-person client
    │
    ├── If client pays cash:
    │     → Coach clicks "Mark Paid (Cash)" in dashboard
    │     → Invoice recorded as paid, payment_method = "cash"
    │     → No Stripe fees (no transaction processed)
    │     → Still tracked in dashboard for bookkeeping
    │
    └── If client wants to pay online anyway:
          → Invoice has a "Pay Now" link
          → Client pays via Stripe normally
```

### Settings Toggle

Coaches can enable/disable cash acceptance:
- **"Accept cash / offline payments"** checkbox in Settings
- When enabled, invoices show a "Mark Paid" button
- When disabled, all payments must go through Stripe

This is important because some coaches are 100% in-person and may want to track revenue without processing any online payments at all.

---

## 11. Legal & Tax Considerations <a id="legal-tax"></a>

### VAT Rules (Poland-Based SaaS Company)

| Scenario | VAT Treatment |
|---|---|
| B2C to Polish coach | 23% Polish VAT |
| B2C to EU coach (other country) | Local VAT rate via **EU OSS scheme** |
| B2B to EU coach (VAT-registered) | Reverse charge — no VAT on invoice |
| Non-EU coach (US, UK, etc.) | No EU VAT applies |

### EU OSS (One-Stop Shop) Scheme

- Replaced MOSS on July 1, 2021
- Single quarterly filing to Polish tax office covers all EU B2C sales
- Register via form VIU-R to Second Tax Office Warsaw-Srodmiescie
- Must detect customer's country (billing address) and apply local VAT rate
- One payment to Polish authorities → they distribute to other member states

### Payment Institution License

**NOT NEEDED.** Stripe Connect Express means:
- Stripe (licensed e-money institution in Ireland, passported across EEA) handles all fund flows
- FitCore operates as a technology platform, not a payment intermediary
- Same model used by Airbnb, Shopify, Lyft, DoorDash
- Explicitly confirmed under PSD2 and upcoming PSD3

**Warning:** If we ever built our own payment processing (hold funds in our own bank account, then disburse), we WOULD need a payment institution license from KNF. Stripe Connect removes this requirement entirely.

---

## 12. Invoicing Compliance (KSeF) <a id="invoicing-compliance"></a>

### Poland's National E-Invoicing System

| Deadline | Who |
|---|---|
| Feb 1, 2026 | Businesses with turnover > PLN 200M |
| **Apr 1, 2026** | **All VAT-registered businesses** ← this applies to us |
| Jan 1, 2027 | Micro-entrepreneurs |
| Throughout 2026 | No penalties (grace period) |

### What FitCore Needs

- **B2B invoices** to Polish VAT-registered coaches → MUST go through KSeF from April 2026
- **B2C invoices** and OSS (cross-border) invoices → EXCLUDED from KSeF
- Format: FA(3) structured XML

### Recommended Tool: Fakturownia

| Feature | Detail |
|---|---|
| What | Polish invoicing SaaS with REST API |
| KSeF integration | Built-in — auto-submits invoices to KSeF |
| API | Full REST API, Python library on PyPI |
| Multi-currency | Yes, EU VAT rate normalization |
| GDPR | Compliant |
| Price | ~40 PLN/month (~€9) |

Flow: FitCore backend calls Fakturownia API on payment confirmation → Fakturownia generates compliant invoice → auto-submits to KSeF if B2B Polish.

---

## 13. International Payments <a id="international-payments"></a>

### How Cross-Border Payments Work

**Example: US client pays $100 to Polish coach**

```
1. Client pays $100 USD via Stripe Checkout
2. Stripe processes charge in USD
3. Stripe deducts fees: 3.25% + €0.25 (non-EEA card)
4. Stripe deducts FitCore application fee: $10
5. Remaining ~$86.50 sits in coach's connected account balance
6. At payout time: Stripe converts USD → PLN (~1% FX fee)
7. Coach receives PLN in their Polish bank account
```

### Avoiding FX Fees

**Multi-currency settlement** lets coaches:
- Hold balances in up to 18 currencies
- Pay out without conversion if they have a bank account in that currency
- Example: Polish coach with a Wise USD account → receives USD payouts, no FX conversion

### Cross-Border Payout Fees

| Route | Fee |
|---|---|
| Within EEA (e.g. Poland → Germany) | **0%** (waived) |
| EEA → non-EEA (e.g. Poland → US) | 0.25% |
| Currency conversion at payout | ~1% FX spread |

### Payout Currencies by Coach Country

| Country | Default | Alternatives |
|---|---|---|
| Poland | PLN | EUR, USD, GBP + others (up to 18) |
| Germany | EUR | USD, GBP + others |
| UK | GBP | EUR, USD + others |
| US | USD | N/A (USD only) |

---

## 14. Competitive Analysis <a id="competitive-analysis"></a>

### Stripe vs Alternatives

| Factor | Stripe Connect | PayPal | Adyen | Paddle | Square |
|---|---|---|---|---|---|
| **Model** | Payment processor | Payment processor | Payment processor | Merchant of Record | Payment processor |
| **Marketplace support** | Native (Connect) | PayPal Commerce | Available (enterprise) | Not designed for marketplaces | Not designed for marketplaces |
| **Base fee (EEA)** | 1.4% + €0.25 | 2.9% + €0.35 | ~0.6% + €0.13 + interchange | 5% + $0.50 | N/A |
| **Polish market** | Full (BLIK, P24) | Limited | Full | Limited | Not available |
| **Min volume** | None | None | ~€250K/month | None | None |
| **Tax handling** | You handle | You handle | You handle | They handle all | You handle |
| **Best for** | SaaS marketplaces | Adding PayPal option | Enterprise high-volume | Direct SaaS sales only | Brick-and-mortar |

### Why NOT the Others

- **Paddle / Lemon Squeezy**: Merchant of Record model — they "buy" your product and resell it. NOT designed for marketplace splits where coaches receive payments. Would only work for FitCore's own subscription billing, not coach-to-client payments.
- **Adyen**: Great at scale but requires ~€250K/month processing, 5-6 month integration, and sales engagement. Not viable for early-stage startup.
- **Square**: Only in 8 countries, no marketplace features, designed for in-person POS. Not applicable.
- **PayPal**: Could be added as a secondary option for clients who prefer it. Higher fees, no Polish-specific methods.

### What Fitness Competitors Charge

| Platform | Payment Fee | Notes |
|---|---|---|
| TrueCoach | **5% flat** per transaction | Very expensive |
| Trainerize | Stripe standard rates | Just passes through |
| Mindbody | 2.99% + $0.30 | Proprietary processing |
| PT Distinction | Stripe standard rates | Just passes through |
| **FitCore (planned)** | **Stripe rates + 10% platform fee** | Competitive |

FitCore's 10% application fee is competitive — TrueCoach charges 5% on top of Stripe's fees (so effectively ~6.5-8% total). We're transparent: Stripe fees + our 10% cut.

---

## 15. Recommended Third-Party Services <a id="recommended-services"></a>

| Service | Role | Cost |
|---|---|---|
| **Stripe Connect (Express)** | Payment processing + marketplace payouts | Per-transaction (see fee tables) + $2/mo per active coach |
| **Fakturownia** | Invoice generation + KSeF compliance | ~40 PLN/month |
| **EU OSS registration** | VAT compliance for cross-border B2C | Free (tax filing) |
| **Stripe Checkout** | Pre-built payment UI with all methods | Included in Stripe |
| **PayPal Commerce** (optional, later) | Secondary payment method | Per-transaction |

---

## 16. Risks & Trade-Offs <a id="risks"></a>

| Risk | Mitigation |
|---|---|
| Stripe account suspension (rare but happens) | Maintain clean dispute rate (<1%), respond to disputes promptly |
| Coach doesn't complete Stripe onboarding | Send reminders, allow manual/cash mode meanwhile |
| Currency conversion surprises | Show coaches estimated payout in their currency before they send invoice |
| KSeF compliance deadline (April 2026) | Integrate Fakturownia early, test with KSeF sandbox |
| Chargebacks / disputes | Stripe handles disputes; platform liable for destination charges |
| Client wants to pay but coach not connected | Show clear messaging, offer to mark as manual payment |
| FX rate fluctuations | Use Stripe's FX Quotes API to lock rates before transactions |
| Data breach / PCI compliance | Stripe handles all card data; we never touch raw card numbers |

---

## 17. Implementation Roadmap <a id="roadmap"></a>

### Phase 1: Foundation (Backend API + Stripe Connect)
- Set up Stripe account for FitCore (Poland)
- Build Express account onboarding flow (create account → account link → redirect → webhook)
- Build Settings page UI with "Connect Payments" button
- Implement webhook endpoint for account.updated

### Phase 2: Invoice-to-Payment Flow
- Connect "Create Invoice" button to Stripe PaymentIntent
- Generate Stripe Checkout payment link per invoice
- Handle payment_intent.succeeded webhook → update invoice status
- Add payment link to client email notifications
- Add payment link to client portal

### Phase 3: Invoicing Compliance
- Integrate Fakturownia API for invoice generation
- Test KSeF submission via Fakturownia sandbox
- Handle B2B vs B2C invoice routing

### Phase 4: Polish Market Optimization
- Enable BLIK in Stripe Dashboard
- Enable Przelewy24 in Stripe Dashboard
- Test end-to-end with PLN payments

### Phase 5: Cash & Offline
- Add "Mark Paid (Cash)" flow with payment method tracking
- Add cash toggle in coach Settings
- Track cash vs online revenue separately in dashboard analytics

### Phase 6: Scale & Optimize
- Add PayPal as secondary payment method (optional)
- Enable SEPA Direct Debit for EU recurring
- Implement Stripe's FX Quotes API for international payments
- Consider Adyen if processing volume exceeds €250K/month

---

## Summary for Jakub

**The short version:**

1. We use **Stripe Connect** — the same platform Airbnb, Uber, and Shopify use for marketplace payments
2. Coaches click **one button** to connect their bank, Stripe handles everything else
3. Clients pay like shopping on Amazon — card, Apple Pay, Google Pay, BLIK, whatever works for them
4. FitCore takes **10% per transaction** as our platform fee — this is our revenue from payments
5. We also support **cash/offline payments** for in-person coaches
6. We need **no financial license** — Stripe is the regulated entity
7. For invoicing compliance (KSeF mandatory April 2026), we use **Fakturownia**
8. Stripe fees are **1.4-3.25%** depending on card origin — we don't pay these, they come out of the transaction
9. Apple Pay, Google Pay, BLIK, SEPA — all **free** (same fee as card), all handled automatically by Stripe

**Our competitive advantage:** TrueCoach charges 5% per transaction ON TOP of Stripe fees. We charge 10% but it includes everything — simpler, more transparent, and we offer a better dashboard experience.
