-- ==============================================================================
-- TuitionShield AI — Migration 001: Core Financial & Sandbox Schema
-- 2026 Shenzhen International FinTech Competition — International Track
-- Topic C: Cross-border & Student Finance Assistant
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    destination_country TEXT DEFAULT 'Germany',
    university TEXT DEFAULT 'Technical University of Munich',
    study_program TEXT DEFAULT 'M.Sc. Computational Finance',
    study_start_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    study_duration_months INTEGER DEFAULT 24,
    home_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    reserve_threshold_minor BIGINT NOT NULL DEFAULT 100000, -- e.g. 1,000.00 EUR
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. FINANCIAL ACCOUNTS (Student declared balances, cash, savings)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    balance_minor BIGINT NOT NULL DEFAULT 0,
    account_type TEXT NOT NULL DEFAULT 'savings' CHECK (account_type IN ('checking', 'savings', 'cash', 'term_deposit', 'other')),
    source_type TEXT NOT NULL DEFAULT 'manual_declaration' CHECK (source_type IN ('manual_declaration', 'document_import', 'sandbox_seed')),
    verified_status TEXT NOT NULL DEFAULT 'declared' CHECK (verified_status IN ('declared', 'reviewed', 'pending_evidence')),
    as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. FUNDING SOURCES (Income, scholarships, grants, family support)
CREATE TABLE IF NOT EXISTS public.funding_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'received', 'cancelled')),
    expected_date DATE,
    received_at TIMESTAMPTZ,
    source_type TEXT NOT NULL DEFAULT 'scholarship' CHECK (source_type IN ('scholarship', 'family_support', 'personal_savings', 'part_time_job', 'grant', 'student_loan', 'other')),
    recurrence_rule TEXT, -- e.g., 'monthly', 'one_time'
    notes TEXT,
    source_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. FINANCIAL OBLIGATIONS (Tuition, rent, living costs, visa fees)
CREATE TABLE IF NOT EXISTS public.financial_obligations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('tuition', 'housing', 'food', 'transportation', 'insurance', 'visa', 'travel', 'books', 'personal', 'other')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'due', 'paid', 'cancelled', 'overdue')),
    is_essential BOOLEAN NOT NULL DEFAULT true,
    recurrence_rule TEXT, -- e.g. 'one_time', 'monthly'
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. FINANCIAL TRANSACTIONS (Simulated sandbox ledger movements)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('inflow', 'outflow')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    category TEXT NOT NULL DEFAULT 'tuition',
    description TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'sandbox_ledger' CHECK (source_type IN ('manual', 'imported', 'sandbox_ledger')),
    source_reference TEXT, -- Links to proposal_id or obligation_id
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. PAYMENT PROPOSALS (Strict state machine: Draft -> Validated -> AwaitingApproval -> Approved -> Executing -> Executed)
CREATE TABLE IF NOT EXISTS public.payment_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES public.financial_obligations(id) ON DELETE SET NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    recipient_label TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'awaiting_approval', 'approved', 'executing', 'executed', 'rejected', 'failed', 'expired')),
    approval_hash TEXT, -- Cryptographic hash of (user_id, amount, currency, recipient, purpose, obligation_id)
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '30 minutes'),
    rejection_reason TEXT,
    failure_reason TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. SCENARIO RUNS (Isolated what-if simulations)
CREATE TABLE IF NOT EXISTS public.scenario_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    baseline_reference TEXT NOT NULL DEFAULT 'current_plan',
    assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. AUDIT EVENTS (Append-only audit trail for compliance & competition demonstration)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'ai_agent')),
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    result TEXT NOT NULL CHECK (result IN ('success', 'denied', 'failure', 'warning')),
    request_id UUID DEFAULT uuid_generate_v4(),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. AI CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Financial Advisory Session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_call_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance & security filtering
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.financial_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_funding_user ON public.funding_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_obligations_user ON public.financial_obligations(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON public.payment_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.payment_proposals(status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.ai_messages(conversation_id);
