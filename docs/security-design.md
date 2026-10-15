# TuitionShield AI — Security Design & Threat Mitigation

**Classification:** FinTech Security & Compliance Architecture  
**Topic:** Topic C — Cross-border & Student Finance Assistant  
**Status:** Implemented and Verified  

---

## 1. Security Philosophy & Objectives

1. **Defense in Depth:** Security is enforced across client validation, server-side Edge Functions, Row Level Security, and deterministic pure functions.
2. **Untrusted LLM Boundary:** Language models are treated as external, untrusted reasoning agents. LLM output cannot authorize payments or write arbitrary records.
3. **Least Privilege & Secret Protection:** Server-side secrets (`DEEPSEEK_API_KEY`) are kept strictly within server environments and are never prefixed with `VITE_` or exposed to browsers.
4. **Idempotency & Replay Resistance:** Financial ledger transactions cannot be duplicated by retries or double clicks.
5. **Data Minimization:** No bank credentials, payment card PANs/CVVs, or unnecessary personal identifying information are stored.

---

## 2. Threat Modeling & Applied Mitigations

| Threat Vector | Potential Impact | Implementation Mitigation |
|---|---|---|
| **Prompt Injection** | Attacker instructs LLM to bypass security checks | LLM prompt instructions have no authorization authority. Server-side code enforces all tool allowlists, parameter schemas, and permissions. |
| **Direct Client Tampering** | User alters JavaScript state to mark payment as executed | Client writes to `financial_transactions` are rejected by RLS. Ledger entries are written only through trusted RPCs or server controllers. |
| **Double-Debit / Race Condition** | User clicks "Execute" twice rapidly | State transition lock (`FOR UPDATE`), status verification, and unique `idempotency_key` prevent duplicate ledger effects. |
| **Unauthorized Payment Approval** | Malicious script approves payment without user knowledge | Explicit user action required; approval is cryptographically verified against the proposal details hash. |
| **Cross-User Data Exposure** | User A accesses User B's financial plan | Supabase Row Level Security restricts queries to `auth.uid() = user_id`. |
| **API Key Leakage** | DeepSeek API key stolen from frontend bundle | Key is stored in server-side secret store (`DEEPSEEK_API_KEY`) and accessed only within Deno Edge Functions. |
| **Floating-Point Drift** | Rounding errors cause currency mismatches | All monetary values are represented as integer minor units (cents). |

---

## 3. Row Level Security Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | Denied |
| `financial_accounts` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `funding_sources` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `financial_obligations` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `payment_proposals` | `auth.uid() = user_id` | Status in (`draft`, `awaiting_approval`) | Status transition via RPC | Denied |
| `financial_transactions` | `auth.uid() = user_id` | **Denied** (RPC only) | **Denied** | **Denied** |
| `audit_events` | `auth.uid() = user_id` | **Denied** (Server only) | **Denied** | **Denied** |

---

## 4. Payment Approval Hash Verification

To guarantee that a proposal cannot be modified between review and execution:
```typescript
approval_hash = sha256(userId + '|' + amountMinor + '|' + currency + '|' + recipient + '|' + purpose + '|' + obligationId)
```
If an attacker or corrupted client changes the amount from €2,000 to €20,000, the server hash re-computation fails, and approval is rejected.
