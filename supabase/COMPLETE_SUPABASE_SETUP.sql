-- ==============================================================================
-- TuitionShield AI — ALL-IN-ONE COMPLETE SUPABASE SETUP SCRIPT
-- Copy ALL of this text and paste into Supabase SQL Editor, then click RUN.
-- Safe to run multiple times (Fully Idempotent).
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    destination_country TEXT DEFAULT 'Germany',
    university TEXT DEFAULT 'Technical University of Munich',
    study_program TEXT DEFAULT 'M.Sc. Computational Finance',
    study_start_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    study_duration_months INTEGER DEFAULT 24,
    home_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    reserve_threshold_minor BIGINT NOT NULL DEFAULT 100000,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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
    recurrence_rule TEXT,
    notes TEXT,
    source_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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
    recurrence_rule TEXT,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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
    source_reference TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES public.financial_obligations(id) ON DELETE SET NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    recipient_label TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'awaiting_approval', 'approved', 'executing', 'executed', 'rejected', 'failed', 'expired')),
    approval_hash TEXT,
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

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.financial_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_funding_user ON public.funding_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_obligations_user ON public.financial_obligations(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON public.payment_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.ai_messages(conversation_id);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES (Drop first so re-running never fails)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.financial_accounts;
CREATE POLICY "Users can view own accounts" ON public.financial_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.financial_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.financial_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.financial_accounts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own funding" ON public.funding_sources;
DROP POLICY IF EXISTS "Users can insert own funding" ON public.funding_sources;
DROP POLICY IF EXISTS "Users can update own funding" ON public.funding_sources;
DROP POLICY IF EXISTS "Users can delete own funding" ON public.funding_sources;
CREATE POLICY "Users can view own funding" ON public.funding_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own funding" ON public.funding_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own funding" ON public.funding_sources FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own funding" ON public.funding_sources FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own obligations" ON public.financial_obligations;
DROP POLICY IF EXISTS "Users can insert own obligations" ON public.financial_obligations;
DROP POLICY IF EXISTS "Users can update own obligations" ON public.financial_obligations;
DROP POLICY IF EXISTS "Users can delete own obligations" ON public.financial_obligations;
CREATE POLICY "Users can view own obligations" ON public.financial_obligations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own obligations" ON public.financial_obligations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own obligations" ON public.financial_obligations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own obligations" ON public.financial_obligations FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.financial_transactions;
CREATE POLICY "Users can view own transactions" ON public.financial_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own proposals" ON public.payment_proposals;
DROP POLICY IF EXISTS "Users can insert draft proposals" ON public.payment_proposals;
CREATE POLICY "Users can view own proposals" ON public.payment_proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert draft proposals" ON public.payment_proposals FOR INSERT WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'validated', 'awaiting_approval'));

DROP POLICY IF EXISTS "Users can view own scenarios" ON public.scenario_runs;
DROP POLICY IF EXISTS "Users can insert own scenarios" ON public.scenario_runs;
DROP POLICY IF EXISTS "Users can delete own scenarios" ON public.scenario_runs;
CREATE POLICY "Users can view own scenarios" ON public.scenario_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scenarios" ON public.scenario_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenarios" ON public.scenario_runs FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own audit events" ON public.audit_events;
CREATE POLICY "Users can view own audit events" ON public.audit_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own messages" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.ai_messages;
CREATE POLICY "Users can view own messages" ON public.ai_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.ai_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. SECURE PROCEDURES
CREATE OR REPLACE FUNCTION public.approve_payment_proposal(
    p_proposal_id UUID,
    p_expected_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_proposal RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Session required';
    END IF;

    SELECT * INTO v_proposal
    FROM public.payment_proposals
    WHERE id = p_proposal_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposal not found or access denied';
    END IF;

    IF v_proposal.status != 'awaiting_approval' AND v_proposal.status != 'validated' THEN
        RAISE EXCEPTION 'Invalid state transition: Proposal is in % status', v_proposal.status;
    END IF;

    IF v_proposal.expires_at < timezone('utc'::text, now()) THEN
        UPDATE public.payment_proposals SET status = 'expired' WHERE id = p_proposal_id;
        RAISE EXCEPTION 'Proposal has expired';
    END IF;

    IF v_proposal.approval_hash != p_expected_hash THEN
        RAISE EXCEPTION 'Integrity verification failed: Proposal details were modified';
    END IF;

    UPDATE public.payment_proposals
    SET status = 'approved',
        approved_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_proposal_id;

    INSERT INTO public.audit_events (user_id, actor_type, event_type, resource_type, resource_id, result, details)
    VALUES (
        v_user_id,
        'user',
        'proposal_approved',
        'payment_proposal',
        p_proposal_id,
        'success',
        jsonb_build_object('amount_minor', v_proposal.amount_minor, 'currency', v_proposal.currency, 'recipient', v_proposal.recipient_label)
    );

    RETURN jsonb_build_object('success', true, 'status', 'approved', 'proposal_id', p_proposal_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_sandbox_payment_transaction(
    p_proposal_id UUID,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_proposal RECORD;
    v_account RECORD;
    v_user_id UUID;
    v_tx_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Session required';
    END IF;

    SELECT * INTO v_proposal
    FROM public.payment_proposals
    WHERE id = p_proposal_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposal not found';
    END IF;

    IF v_proposal.status = 'executed' THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'executed',
            'proposal_id', v_proposal.id,
            'transaction_id', v_proposal.transaction_id,
            'idempotent_replay', true
        );
    END IF;

    IF v_proposal.status != 'approved' THEN
        RAISE EXCEPTION 'Cannot execute proposal: Current status is % (must be approved)', v_proposal.status;
    END IF;

    IF v_proposal.expires_at < timezone('utc'::text, now()) THEN
        UPDATE public.payment_proposals SET status = 'expired' WHERE id = p_proposal_id;
        RAISE EXCEPTION 'Proposal has expired';
    END IF;

    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE user_id = v_user_id AND currency = v_proposal.currency
    ORDER BY balance_minor DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND OR v_account.balance_minor < v_proposal.amount_minor THEN
        UPDATE public.payment_proposals 
        SET status = 'failed', failure_reason = 'Insufficient balance in sandbox account'
        WHERE id = p_proposal_id;

        INSERT INTO public.audit_events (user_id, actor_type, event_type, resource_type, resource_id, result, details)
        VALUES (
            v_user_id,
            'system',
            'payment_execution_failed',
            'payment_proposal',
            p_proposal_id,
            'failure',
            jsonb_build_object('reason', 'Insufficient sandbox funds', 'amount_minor', v_proposal.amount_minor)
        );

        RAISE EXCEPTION 'Insufficient sandbox funds to complete simulated payment';
    END IF;

    UPDATE public.financial_accounts
    SET balance_minor = balance_minor - v_proposal.amount_minor,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_account.id;

    INSERT INTO public.financial_transactions (
        user_id,
        account_id,
        transaction_type,
        amount_minor,
        currency,
        status,
        category,
        description,
        source_type,
        source_reference,
        idempotency_key
    ) VALUES (
        v_user_id,
        v_account.id,
        'outflow',
        v_proposal.amount_minor,
        v_proposal.currency,
        'completed',
        'tuition',
        'Simulated tuition payment: ' || v_proposal.purpose,
        'sandbox_ledger',
        v_proposal.id::text,
        p_idempotency_key
    ) RETURNING id INTO v_tx_id;

    IF v_proposal.obligation_id IS NOT NULL THEN
        UPDATE public.financial_obligations
        SET status = 'paid',
            paid_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_proposal.obligation_id;
    END IF;

    UPDATE public.payment_proposals
    SET status = 'executed',
        executed_at = timezone('utc'::text, now()),
        transaction_id = v_tx_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_proposal_id;

    INSERT INTO public.audit_events (
        user_id,
        actor_type,
        event_type,
        resource_type,
        resource_id,
        result,
        details
    ) VALUES (
        v_user_id,
        'system',
        'sandbox_payment_executed',
        'payment_proposal',
        p_proposal_id,
        'success',
        jsonb_build_object(
            'amount_minor', v_proposal.amount_minor,
            'currency', v_proposal.currency,
            'recipient', v_proposal.recipient_label,
            'transaction_id', v_tx_id,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'executed',
        'proposal_id', v_proposal.id,
        'transaction_id', v_tx_id,
        'executed_at', timezone('utc'::text, now())
    );
END;
$$;

-- 7. DEMO USER IN AUTH.USERS & SEED DATA
-- Create demo user in auth.users so foreign key constraint succeeds
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-4000-a000-000000000001',
    'authenticated',
    'authenticated',
    'demo.student@tuitionshield.ai',
    '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Elena Vance"}',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Seed Profile
INSERT INTO public.profiles (
    id,
    display_name,
    destination_country,
    university,
    study_program,
    study_start_date,
    study_duration_months,
    home_currency,
    reserve_threshold_minor,
    onboarding_completed
) VALUES (
    'd0000000-0000-4000-a000-000000000001',
    'Elena Vance',
    'Germany',
    'Technical University of Munich',
    'M.Sc. Sustainable FinTech',
    CURRENT_DATE + INTERVAL '14 days',
    24,
    'EUR',
    100000,
    true
) ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    home_currency = EXCLUDED.home_currency;

-- Seed Accounts (€8,000 Starting Funds)
DELETE FROM public.financial_accounts WHERE user_id = 'd0000000-0000-4000-a000-000000000001';
INSERT INTO public.financial_accounts (
    id,
    user_id,
    name,
    currency,
    balance_minor,
    account_type,
    source_type,
    verified_status,
    as_of_date
) VALUES (
    'a0000000-0000-4000-a000-000000000001',
    'd0000000-0000-4000-a000-000000000001',
    'Euro Blocked & Savings Account',
    'EUR',
    800000,
    'savings',
    'sandbox_seed',
    'declared',
    CURRENT_DATE
);

-- Seed Funding (€2,000 Pending Scholarship)
DELETE FROM public.funding_sources WHERE user_id = 'd0000000-0000-4000-a000-000000000001';
INSERT INTO public.funding_sources (
    id,
    user_id,
    name,
    amount_minor,
    currency,
    status,
    expected_date,
    source_type,
    notes
) VALUES (
    'f0000000-0000-4000-a000-000000000001',
    'd0000000-0000-4000-a000-000000000001',
    'DAAD Global Mobility Grant (Pending Review)',
    200000,
    'EUR',
    'pending',
    CURRENT_DATE + INTERVAL '60 days',
    'scholarship',
    'Application submitted. Selection committee review pending.'
);

-- Seed Obligations (€10,500 Total Annual)
DELETE FROM public.financial_obligations WHERE user_id = 'd0000000-0000-4000-a000-000000000001';
INSERT INTO public.financial_obligations (
    id,
    user_id,
    title,
    category,
    amount_minor,
    currency,
    due_date,
    status,
    is_essential
) VALUES 
(
    'e0000000-0000-4000-a000-000000000001',
    'd0000000-0000-4000-a000-000000000001',
    'Semester 1 Tuition Fee',
    'tuition',
    200000,
    'EUR',
    CURRENT_DATE + INTERVAL '25 days',
    'planned',
    true
),
(
    'e0000000-0000-4000-a000-000000000002',
    'd0000000-0000-4000-a000-000000000001',
    'Semester 2 Tuition Fee',
    'tuition',
    200000,
    'EUR',
    CURRENT_DATE + INTERVAL '180 days',
    'planned',
    true
),
(
    'e0000000-0000-4000-a000-000000000003',
    'd0000000-0000-4000-a000-000000000001',
    'Student Residence Rent (Yearly Allocation)',
    'housing',
    420000,
    'EUR',
    CURRENT_DATE + INTERVAL '90 days',
    'planned',
    true
),
(
    'e0000000-0000-4000-a000-000000000004',
    'd0000000-0000-4000-a000-000000000001',
    'Groceries & Subsistence (Yearly Allocation)',
    'food',
    130000,
    'EUR',
    CURRENT_DATE + INTERVAL '120 days',
    'planned',
    true
),
(
    'e0000000-0000-4000-a000-000000000005',
    'd0000000-0000-4000-a000-000000000001',
    'Statutory Health Insurance (TK Student)',
    'insurance',
    60000,
    'EUR',
    CURRENT_DATE + INTERVAL '45 days',
    'planned',
    true
),
(
    'e0000000-0000-4000-a000-000000000006',
    'd0000000-0000-4000-a000-000000000001',
    'Student Visa Application & Residence Permit Fee',
    'visa',
    40000,
    'EUR',
    CURRENT_DATE + INTERVAL '10 days',
    'planned',
    true
);

-- Seed Audit Event
INSERT INTO public.audit_events (
    user_id,
    actor_type,
    event_type,
    resource_type,
    resource_id,
    result,
    details
) VALUES (
    'd0000000-0000-4000-a000-000000000001',
    'system',
    'competition_dataset_loaded',
    'profile',
    'd0000000-0000-4000-a000-000000000001',
    'success',
    jsonb_build_object(
        'available_funds', '8000 EUR',
        'planned_expenses', '10500 EUR',
        'confirmed_gap', '2500 EUR',
        'status', 'competition_ready'
    )
);
