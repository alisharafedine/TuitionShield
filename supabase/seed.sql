-- ==============================================================================
-- TuitionShield AI — Seed Data for 2026 Shenzhen FinTech Competition Demo
-- Fictional Profile: Single-Currency Demonstrator (Germany / Euro)
-- Matches exact specifications from Section 21 of Competition Requirements:
-- - Available starting funds: €8,000 (800,000 minor units)
-- - Annual tuition: €4,000 (400,000 minor units)
-- - Annual living expenses: €5,500 (550,000 minor units)
-- - Other annual expenses: €1,000 (100,000 minor units)
-- - Confirmed scholarship: €0
-- Total planned expenses = €10,500 (1,050,000 minor units)
-- Baseline funding gap = €2,500 (250,000 minor units)
-- Optional pending scholarship: €2,000 (200,000 minor units) -> Pending, NOT confirmed
-- ==============================================================================

-- Demo User UUID (constant for reproducible testing and demonstration)
DO $$
DECLARE
    demo_user_id UUID := 'd0000000-0000-4000-a000-000000000001';
BEGIN
    -- 1. Create or update profile
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
        demo_user_id,
        'Elena Vance',
        'Germany',
        'Technical University of Munich',
        'M.Sc. Sustainable FinTech',
        CURRENT_DATE + INTERVAL '14 days',
        24,
        'EUR',
        100000, -- €1,000 reserve threshold
        true
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        home_currency = EXCLUDED.home_currency;

    -- 2. Financial Accounts (€8,000 starting available balance)
    DELETE FROM public.financial_accounts WHERE user_id = demo_user_id;
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
        demo_user_id,
        'Euro Blocked & Savings Account',
        'EUR',
        800000, -- €8,000.00
        'savings',
        'manual_declaration',
        'declared',
        CURRENT_DATE
    );

    -- 3. Funding Sources (Pending Scholarship of €2,000; Confirmed €0)
    DELETE FROM public.funding_sources WHERE user_id = demo_user_id;
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
        demo_user_id,
        'DAAD Global Mobility Grant (Pending Review)',
        200000, -- €2,000.00
        'pending',
        CURRENT_DATE + INTERVAL '60 days',
        'scholarship',
        'Application submitted. Verification expected next month. NOT yet confirmed.'
    );

    -- 4. Financial Obligations (Total Annual: €10,500)
    -- - Annual Tuition: €4,000 (Semester 1: €2,000 due in 30 days, Semester 2: €2,000 due in 180 days)
    -- - Living Expenses: €5,500 (Housing + Food across the year)
    -- - Other expenses: €1,000 (Health insurance & Visa fees)
    DELETE FROM public.financial_obligations WHERE user_id = demo_user_id;
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
        'o0000000-0000-4000-a000-000000000001',
        demo_user_id,
        'Semester 1 Tuition Fee',
        'tuition',
        200000, -- €2,000.00
        'EUR',
        CURRENT_DATE + INTERVAL '25 days',
        'planned',
        true
    ),
    (
        'o0000000-0000-4000-a000-000000000002',
        demo_user_id,
        'Semester 2 Tuition Fee',
        'tuition',
        200000, -- €2,000.00
        'EUR',
        CURRENT_DATE + INTERVAL '180 days',
        'planned',
        true
    ),
    (
        'o0000000-0000-4000-a000-000000000003',
        demo_user_id,
        'Student Residence Rent (Yearly Allocation)',
        'housing',
        420000, -- €4,200.00 (€350/mo)
        'EUR',
        CURRENT_DATE + INTERVAL '90 days',
        'planned',
        true
    ),
    (
        'o0000000-0000-4000-a000-000000000004',
        demo_user_id,
        'Groceries & Subsistence (Yearly Allocation)',
        'food',
        130000, -- €1,300.00
        'EUR',
        CURRENT_DATE + INTERVAL '120 days',
        'planned',
        true
    ),
    (
        'o0000000-0000-4000-a000-000000000005',
        demo_user_id,
        'Statutory Health Insurance (TK Student)',
        'insurance',
        60000, -- €600.00
        'EUR',
        CURRENT_DATE + INTERVAL '45 days',
        'planned',
        true
    ),
    (
        'o0000000-0000-4000-a000-000000000006',
        demo_user_id,
        'Student Visa Application & Residence Permit Fee',
        'visa',
        40000, -- €400.00
        'EUR',
        CURRENT_DATE + INTERVAL '10 days',
        'planned',
        true
    );

    -- 5. Audit Log Entry for seed initialization
    INSERT INTO public.audit_events (
        user_id,
        actor_type,
        event_type,
        resource_type,
        resource_id,
        result,
        details
    ) VALUES (
        demo_user_id,
        'system',
        'competition_dataset_loaded',
        'profile',
        demo_user_id,
        'success',
        jsonb_build_object(
            'available_funds', '8000 EUR',
            'planned_expenses', '10500 EUR',
            'confirmed_gap', '2500 EUR',
            'status', 'competition_ready'
        )
    );

END $$;
