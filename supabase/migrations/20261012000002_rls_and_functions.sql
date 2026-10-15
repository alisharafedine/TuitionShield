-- ==============================================================================
-- TuitionShield AI — Migration 002: Row Level Security & Secure RPCs
-- ==============================================================================

-- Enable RLS on all tables
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

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. FINANCIAL ACCOUNTS POLICIES
CREATE POLICY "Users can view own accounts"
    ON public.financial_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
    ON public.financial_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
    ON public.financial_accounts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
    ON public.financial_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- 3. FUNDING SOURCES POLICIES
CREATE POLICY "Users can view own funding"
    ON public.funding_sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own funding"
    ON public.funding_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own funding"
    ON public.funding_sources FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own funding"
    ON public.funding_sources FOR DELETE
    USING (auth.uid() = user_id);

-- 4. FINANCIAL OBLIGATIONS POLICIES
CREATE POLICY "Users can view own obligations"
    ON public.financial_obligations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own obligations"
    ON public.financial_obligations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own obligations"
    ON public.financial_obligations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own obligations"
    ON public.financial_obligations FOR DELETE
    USING (auth.uid() = user_id);

-- 5. FINANCIAL TRANSACTIONS POLICIES (Read-only for clients; inserted only via secure backend/RPC)
CREATE POLICY "Users can view own transactions"
    ON public.financial_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- 6. PAYMENT PROPOSALS POLICIES
CREATE POLICY "Users can view own proposals"
    ON public.payment_proposals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert draft proposals"
    ON public.payment_proposals FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'validated', 'awaiting_approval'));

-- 7. SCENARIOS POLICIES
CREATE POLICY "Users can view own scenarios"
    ON public.scenario_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scenarios"
    ON public.scenario_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenarios"
    ON public.scenario_runs FOR DELETE
    USING (auth.uid() = user_id);

-- 8. AUDIT EVENTS POLICIES (Append-only by server/RPC, read-only for user)
CREATE POLICY "Users can view own audit events"
    ON public.audit_events FOR SELECT
    USING (auth.uid() = user_id);

-- 9. AI CONVERSATIONS & MESSAGES POLICIES
CREATE POLICY "Users can view own conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
    ON public.ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages"
    ON public.ai_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
    ON public.ai_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- SECURE SERVER FUNCTIONS FOR ATOMIC SANDBOX EXECUTION
-- ==============================================================================

-- Function to safely approve proposal
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

-- Function to atomically execute sandbox payment
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

    -- Lock proposal row for update to prevent concurrent race conditions
    SELECT * INTO v_proposal
    FROM public.payment_proposals
    WHERE id = p_proposal_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposal not found';
    END IF;

    -- Idempotency check: if already executed with this key, return existing result
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

    -- Verify available balance across user's accounts in that currency
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

    -- Deduct balance from sandbox account
    UPDATE public.financial_accounts
    SET balance_minor = balance_minor - v_proposal.amount_minor,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_account.id;

    -- Record atomic sandbox ledger transaction
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

    -- Update linked obligation if present
    IF v_proposal.obligation_id IS NOT NULL THEN
        UPDATE public.financial_obligations
        SET status = 'paid',
            paid_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_proposal.obligation_id;
    END IF;

    -- Finalize proposal status to executed
    UPDATE public.payment_proposals
    SET status = 'executed',
        executed_at = timezone('utc'::text, now()),
        transaction_id = v_tx_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_proposal_id;

    -- Log audit trail event
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
