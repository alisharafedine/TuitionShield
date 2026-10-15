# TuitionShield AI — Cross-Border Student Financial Co-Pilot

> **2026 Shenzhen International FinTech Competition — International Track**  
> **Topic C: Cross-border & Student Finance Assistant (Theme: AI as a Financial Participant)**

TuitionShield AI is an intelligent financial control center designed for international students preparing to study abroad. It coordinates tuition installments, scholarships, living expenses, multi-currency planning, cash-flow projections, and simulated tuition payments.

---

## 🌟 Key Innovations & Fintech Architecture

1. **Deterministic Financial Arithmetic:** Pure TypeScript engine executing integer minor-unit calculations. Language models are strictly prevented from performing mental math.
2. **AI as a Controlled Financial Participant:** DeepSeek-powered financial copilot interacting exclusively through an allowlisted tool registry with strict argument schemas.
3. **Controlled Sandbox Payment Rails:** A rigorous state machine (`Draft` → `Validated` → `Awaiting Approval` → `Approved` → `Executing` → `Executed`) requiring explicit physical student approval cryptographically bound to an immutable details hash.
4. **Idempotency Protection:** Execution requests use unique idempotency keys to eliminate duplicate debits or race-condition replays.
5. **Factual Risk Radar:** Evidence-based risk detection identifying deficits, reserve depletion, and scholarship delays without subjective score fabrication.
6. **Isolated What-If Simulation:** Stress-test rent inflation, tuition hikes, or delayed funding without modifying baseline financial records.

---

## 🚀 Quick Start (Local Development)

The application includes an offline-capable, dual-mode architecture that runs out of the box with the competition baseline dataset:

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (28 tests across financial engine, payments, and AI security)
npm test

# 3. Start local development server
npm run dev

# 4. Production build & typecheck verification
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:

```env
# Frontend Supabase credentials (Anon / Public key only)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-side Edge Function secrets (Do NOT prefix with VITE_)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
```

*Note:* When `VITE_SUPABASE_URL` is not configured, TuitionShield AI automatically runs in **Interactive Sandbox Demo Mode**, enforcing identical RLS rules, data validation, and the payment state machine in-browser.

---

## 🗄️ Supabase Database & Edge Function Setup

### 1. Database Migrations
Migrations are committed in `supabase/migrations/`:
- `supabase/migrations/20261012000001_initial_schema.sql`: Core schema, constraints, and indexes for 9 entities (`profiles`, `financial_accounts`, `funding_sources`, `financial_obligations`, `financial_transactions`, `payment_proposals`, `scenario_runs`, `audit_events`, `ai_messages`).
- `supabase/migrations/20261012000002_rls_and_functions.sql`: Row Level Security policies and atomic payment stored procedures (`approve_payment_proposal`, `execute_sandbox_payment_transaction`).
- `supabase/seed.sql`: Official single-currency competition baseline scenario.

To apply migrations using the Supabase CLI:
```bash
supabase db push
supabase db reset # (Optional: applies schema and seed.sql)
```

### 2. Edge Function Deployment (DeepSeek Assistant)
```bash
# Set server-side secret
supabase secrets set DEEPSEEK_API_KEY=sk-your-deepseek-key

# Deploy edge function
supabase functions deploy ai-assistant
```

---

## 🎬 10-Step Competition Demonstration Script

The application is structured to demonstrate the complete required sequence:

1. **Open Overview Dashboard (`/`):** View Elena Vance's student profile (TU Munich, €8,000 declared savings, €10,500 annual planned costs).
2. **Review Calculated Funding Gap:** The engine calculates a **€2,500 funding gap** ($€10,500 - €8,000$). The pending €2,000 DAAD scholarship is clearly excluded from confirmed resources.
3. **Inspect Cash Flow Forecast (`/cash-flow`):** Observe the chronological monthly progression and identify the first deficit date when living expenses exhaust liquidity.
4. **Run a What-If Scenario (`/scenarios`):** Adjust the rent increase slider to **+15%**. The scenario recalculates live: funding gap increases by **+€630** to **€3,130**, while baseline records remain completely untouched.
5. **Engage DeepSeek AI Copilot (`/ai-copilot`):** Click the starter prompt *"Will I have enough money to pay tuition?"*. Observe the AI invoke `get_financial_summary` and `calculate_funding_gap`, returning exact numbers grounded in the calculation engine.
6. **Request Tuition Preparation via AI:** Ask: *"Prepare a sandbox tuition payment for my review."* The agent invokes `create_payment_proposal` with the Semester 1 tuition installment (€2,000). The proposal enters status `awaiting_approval`.
7. **Inspect Payment Proposal (`/payments`):** The AI cannot execute payments. Navigate to the Payments tab and view the generated proposal with its immutable details signature hash.
8. **Explicit Student Review & Approval:** Click *"Review & Explicitly Approve"*. Check the mandatory authorization checkbox and click *"Confirm & Approve"*. The status changes to `approved`.
9. **Simulated Sandbox Execution:** Click *"Execute Sandbox Payment"*. The backend revalidates parameters, deducts €2,000 from the declared account balance, marks the tuition obligation as `paid`, and writes an atomic transaction to the sandbox ledger.
10. **Verify Ledger & Compliance Audit (`/audit`):** Inspect the sandbox ledger entry and open the audit trail to view the full tamper-proof sequence (`proposal_created` → `proposal_approved` → `sandbox_payment_executed`).

---

## 🛡️ Security Evidence & Test Results

```
Test Files: 3 passed
Total Tests: 28 passed (100% pass rate)

✓ Deterministic Financial Formulas (15 tests)
  - F-01 to F-03: Coverage, shortfall (€2,500), and surplus calculations
  - F-04: Pending scholarships strictly excluded from confirmed resources
  - F-05 to F-06: Cancelled obligations and paid expenses handled accurately
  - C-01 to C-02: Chronological cash flow transitions and first shortage dates
  - S-01 to S-02: Scenario isolation and minijob income adjustments
  - M-01 to M-03: Currency precision, minor-unit conversions, and rate validation

✓ Controlled Sandbox Payments (7 tests)
  - P-01 to P-03: Proposal state machine; unapproved execution strictly blocked
  - P-04 to P-05: Details signature hash prevents parameter tampering
  - P-06: Atomic balance deduction and obligation status transition
  - P-07: Idempotency keys eliminate duplicate execution effects
  - P-08: Insufficient balance fails safely without ledger corruption

✓ AI Agent & Tool Security (6 tests)
  - A-01 to A-03: Approved tools return arithmetic engine results
  - A-04: Unauthorized or arbitrary tools safely rejected
  - A-05: AI tool proposal cannot auto-execute payments
  - A-06: All tool invocations recorded in compliance audit log
```

---

## 📂 Project Structure

```
tuition-shield-ai/
├── src/
│   ├── components/
│   │   ├── layout/            # Sidebar, Header, MainLayout
│   │   └── ui/                # Badge, Button, Card, Modal, StatCard, Toast
│   ├── features/
│   │   ├── dashboard/         # Financial Overview & Visualizations
│   │   ├── finances/          # Accounts, Funding, and Obligations CRUD
│   │   ├── funding/           # Scholarship Tracker & Concentration
│   │   ├── cash-flow/         # Dated Forecast & Monthly Ledger
│   │   ├── scenarios/         # What-If Stress Simulator
│   │   ├── ai-assistant/      # DeepSeek AI Copilot & Tool Calling Service
│   │   ├── payments/          # Sandbox Payment Proposals & Ledger
│   │   ├── audit/             # Compliance & Activity Audit Trail
│   │   ├── settings/          # Study Preferences & Transparency Disclosures
│   │   └── financial-engine/  # Deterministic Pure Functions & Currency Arithmetic
│   ├── lib/
│   │   ├── storage/           # LocalDatabaseManager (Dual-mode persistence)
│   │   └── supabase/          # Supabase client configuration
│   ├── test/                  # Automated Vitest test suites (28 tests)
│   ├── types/                 # Strict TypeScript data models
│   ├── App.tsx                # Client Routing
│   └── main.tsx               # Application Entry Point
├── supabase/
│   ├── migrations/            # SQL Schemas (001) & RLS / Functions (002)
│   ├── functions/             # Supabase Edge Functions (ai-assistant)
│   └── seed.sql               # Competition Demonstration Dataset
├── docs/                      # Comprehensive Technical Documentation
│   ├── system-architecture.md
│   ├── core-algorithms.md
│   ├── ai-agent-design.md
│   ├── database-design.md
│   ├── security-design.md
│   ├── sandbox-payment-workflow.md
│   ├── testing-and-evaluation.md
│   └── security-self-assessment.md
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## ⚠️ Known Limitations & Disclosures

1. **Simulation Rail:** All monetary transactions occur within a simulated sandbox ledger. The application does not connect to SWIFT, SEPA, or live banking rails.
2. **Declared Financial Data:** Balances and scholarship letters are supplied by the student. Manually entered records are clearly labeled as `declared` and not certified by external bank feeds.
3. **Illustrative FX Rates:** Cross-currency estimations use labeled reference rates; live foreign exchange feeds are not integrated in this MVP.
4. **Document OCR Extraction:** Deferred per Section 18 to prioritize deterministic calculation stability and payment workflow security.
