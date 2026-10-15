# TuitionShield AI — Security Self-Assessment & Compliance Audit

**Evaluation Date:** 2026-10-13  
**Auditor / Engineer:** TuitionShield Engineering Team  
**Standard:** 2026 Shenzhen International FinTech Competition — Security & Compliance Criteria  
**Methodology:** Evidence-Based Verification (Static Analysis, Test Execution, Code Auditing)  

---

## 1. Security Control Verification Matrix

| Control Category | Control Description | Verification Method | Status | Evidence / Implementation Reference |
|---|---|---|---|---|
| **Deterministic Arithmetic** | All financial figures calculated in integer minor units without LLM mental math | Unit test suite (15 tests) | **VERIFIED IMPLEMENTED & TESTED** | `src/features/financial-engine/engine.ts`, `src/test/financial-engine.test.ts` |
| **Payment Authorization** | Physical student interaction required; proposal must be in `awaiting_approval` state | Automated tests P-01, P-02 | **VERIFIED IMPLEMENTED & TESTED** | `src/features/payments/PaymentsPage.tsx`, `src/test/payments.test.ts` |
| **Details Hash Binding** | Approval signature bound to immutable proposal details hash | Automated tests P-04, P-05 | **VERIFIED IMPLEMENTED & TESTED** | Cryptographic hash matching in `mock-db.ts` & RPC migration 002 |
| **Duplicate Prevention** | Idempotency keys prevent duplicate ledger entries on retries | Automated test P-07 | **VERIFIED IMPLEMENTED & TESTED** | Idempotent replay verified in `src/test/payments.test.ts` |
| **AI Tool Allowlisting** | Agent restricted to 8 registered tools with strict argument schemas | Automated tests A-04, A-05 | **VERIFIED IMPLEMENTED & TESTED** | `supabase/functions/ai-assistant/index.ts`, `src/test/ai-agent.test.ts` |
| **AI Payment Boundary** | AI cannot authorize or execute payments; can only propose | Automated test A-05 | **VERIFIED IMPLEMENTED & TESTED** | AI tool `create_payment_proposal` generates status `awaiting_approval` |
| **Secret Protection** | LLM API keys and service roles absent from frontend bundles | Static grep analysis & build audit | **VERIFIED IMPLEMENTED** | `.env.example` separates client `VITE_` and server `DEEPSEEK_API_KEY` |
| **Row Level Security** | Database tables enforce user isolation (`auth.uid() = user_id`) | SQL Migration committed | **VERIFIED COMMITTED** | `supabase/migrations/20261012000002_rls_and_functions.sql` |
| **Audit Logging** | Append-only audit trail logs sensitive actions with metadata | Automated test A-06 & UI audit log | **VERIFIED IMPLEMENTED & TESTED** | `audit_events` table & `src/features/audit/AuditPage.tsx` |
| **Document OCR Extraction** | Automated invoice/letter parsing | Optional extension (Section 18) | **DEFERRED** | Deferred to preserve core fintech stability |

---

## 2. Evidence of Passed Automated Security Checks

### 1. Payment Security Verification (7/7 Passed)
```
✓ P-01: Proposal created in awaiting_approval without executing
✓ P-02: Execution attempt without approval blocked
✓ P-03: Proposal rejection prevents execution
✓ P-04 & P-05: Details hash verification catches tampered parameters
✓ P-06: Approved execution updates balance and records ledger transaction
✓ P-07: Duplicate execution requests produce at most ONE ledger entry (Idempotency)
✓ P-08: Insufficient balance fails safely without altering ledger
```

### 2. AI Security & Tool Guardrails (6/6 Passed)
```
✓ A-01: Approved summary tool returns deterministic figures
✓ A-02: calculate_funding_gap uses arithmetic engine results
✓ A-03: simulate_financial_scenario executes without mutating baseline
✓ A-04: Arbitrary / unsupported tool names rejected
✓ A-05: AI tool proposal cannot auto-execute payments
✓ A-06: Chat orchestrator appends audit event for every tool execution
```

---

## 3. Residual Risks & External Prerequisites

1. **User-Entered Financial Data:** The application relies on information declared by the student. Manually entered balances are transparently labeled as `declared` and never falsely represented as bank-verified.
2. **Cloud Supabase Provisioning:** The schema and RLS policies are committed in migrations. To connect to a live Supabase project, the user must provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. In their absence, the application runs in local sandbox demo mode.
3. **DeepSeek API Key:** To invoke live DeepSeek completions rather than the built-in deterministic copilot fallback, `DEEPSEEK_API_KEY` must be configured in the Supabase Edge Function environment.
