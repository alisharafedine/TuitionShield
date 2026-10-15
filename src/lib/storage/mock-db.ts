import {
  UserProfile,
  FinancialAccount,
  FundingSource,
  FinancialObligation,
  FinancialTransaction,
  PaymentProposal,
  ScenarioRun,
  AuditEvent,
  AIMessage,
} from '../../types';

const STORAGE_KEY = 'tuition_shield_mock_data_v1';

export interface DatabaseState {
  profile: UserProfile;
  accounts: FinancialAccount[];
  fundingSources: FundingSource[];
  obligations: FinancialObligation[];
  transactions: FinancialTransaction[];
  paymentProposals: PaymentProposal[];
  scenarioRuns: ScenarioRun[];
  auditEvents: AuditEvent[];
  messages: AIMessage[];
}

/**
 * Generates the official competition baseline dataset
 * Defined in Section 21:
 * - Starting available funds: €8,000
 * - Annual tuition: €4,000
 * - Annual living expenses: €5,500
 * - Other annual expenses: €1,000
 * - Confirmed scholarship: €0
 * Total expenses: €10,500
 * Funding gap: €2,500
 * Pending scholarship: €2,000 (explicitly pending, not confirmed)
 */
export function getInitialDemoState(): DatabaseState {
  const now = new Date();
  const userId = 'd0000000-0000-4000-a000-000000000001';

  const addDays = (days: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return {
    profile: {
      id: userId,
      display_name: 'Elena Vance',
      destination_country: 'Germany',
      university: 'Technical University of Munich',
      study_program: 'M.Sc. Sustainable FinTech',
      study_start_date: addDays(30),
      study_duration_months: 24,
      home_currency: 'EUR',
      reserve_threshold_minor: 100000, // €1,000
      onboarding_completed: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    accounts: [
      {
        id: 'acc-demo-1',
        user_id: userId,
        name: 'Euro Blocked & Savings Account',
        currency: 'EUR',
        balance_minor: 800000, // €8,000.00
        account_type: 'savings',
        source_type: 'sandbox_seed',
        verified_status: 'declared',
        as_of_date: now.toISOString().split('T')[0],
      },
    ],
    fundingSources: [
      {
        id: 'fund-demo-1',
        user_id: userId,
        name: 'DAAD Global Mobility Grant (Pending Review)',
        amount_minor: 200000, // €2,000.00
        currency: 'EUR',
        status: 'pending', // Pending, NOT confirmed
        source_type: 'scholarship',
        expected_date: addDays(60),
        notes: 'Under review by selection committee. Not yet confirmed.',
      },
    ],
    obligations: [
      {
        id: 'ob-demo-1',
        user_id: userId,
        title: 'Semester 1 Tuition Fee',
        category: 'tuition',
        amount_minor: 200000, // €2,000.00
        currency: 'EUR',
        due_date: addDays(25),
        status: 'planned',
        is_essential: true,
        notes: 'Payable directly to Technical University of Munich cashier office.',
      },
      {
        id: 'ob-demo-2',
        user_id: userId,
        title: 'Semester 2 Tuition Fee',
        category: 'tuition',
        amount_minor: 200000, // €2,000.00
        currency: 'EUR',
        due_date: addDays(180),
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-demo-3',
        user_id: userId,
        title: 'Student Residence Rent (Annual Allocation)',
        category: 'housing',
        amount_minor: 420000, // €4,200.00 (€350/mo)
        due_date: addDays(90),
        currency: 'EUR',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-demo-4',
        user_id: userId,
        title: 'Food & Subsistence (Annual Allocation)',
        category: 'food',
        amount_minor: 130000, // €1,300.00
        due_date: addDays(120),
        currency: 'EUR',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-demo-5',
        user_id: userId,
        title: 'Statutory Health Insurance (TK Student)',
        category: 'insurance',
        amount_minor: 60000, // €600.00
        due_date: addDays(45),
        currency: 'EUR',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-demo-6',
        user_id: userId,
        title: 'Student Visa & Residence Permit Fee',
        category: 'visa',
        amount_minor: 40000, // €400.00
        due_date: addDays(10),
        currency: 'EUR',
        status: 'planned',
        is_essential: true,
      },
    ],
    transactions: [],
    paymentProposals: [],
    scenarioRuns: [],
    auditEvents: [
      {
        id: 'audit-demo-init',
        user_id: userId,
        actor_type: 'system',
        event_type: 'competition_dataset_loaded',
        resource_type: 'profile',
        resource_id: userId,
        result: 'success',
        details: {
          available_starting_funds: '€8,000',
          planned_annual_expenses: '€10,500',
          baseline_funding_gap: '€2,500',
          pending_scholarship: '€2,000',
          environment: 'Interactive Sandbox Simulation',
        },
        created_at: now.toISOString(),
      },
    ],
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Hello Elena! I am **TuitionShield AI**, your cross-border student financial co-pilot.\n\nI have analyzed your baseline financial plan for your upcoming master's at **Technical University of Munich**:\n- **Available Starting Funds**: €8,000\n- **Total Planned Expenses**: €10,500\n- **Current Funding Gap**: **€2,500**\n- **Upcoming Tuition Due**: €2,000 in 25 days\n\nHow can I help you today? You can ask me to forecast cash flows, simulate a rent increase or scholarship delay, or prepare a sandbox tuition payment proposal.`,
        created_at: now.toISOString(),
        suggestedQuestions: [
          'Will I have enough money to pay tuition?',
          'When could my balance become negative?',
          'What if my rent increases by 15%?',
          'Prepare a sandbox tuition payment for my review',
        ],
      },
    ],
  };
}

class LocalDatabaseManager {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback if localStorage not accessible
    }
    const initial = getInitialDemoState();
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DatabaseState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore in environments without localStorage
    }
    this.state = state;
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public resetToDemo(): DatabaseState {
    const demo = getInitialDemoState();
    this.saveState(demo);
    return demo;
  }

  // Profile operations
  public updateProfile(updates: Partial<UserProfile>): UserProfile {
    const profile = { ...this.state.profile, ...updates, updated_at: new Date().toISOString() };
    this.recordAudit({
      actor_type: 'user',
      event_type: 'profile_updated',
      resource_type: 'profile',
      resource_id: profile.id,
      result: 'success',
      details: updates,
    });
    this.saveState({ ...this.state, profile });
    return profile;
  }

  // Account operations
  public addAccount(account: Omit<FinancialAccount, 'id' | 'user_id'>): FinancialAccount {
    const newAccount: FinancialAccount = {
      ...account,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: this.state.profile.id,
    };
    const accounts = [...this.state.accounts, newAccount];
    this.recordAudit({
      actor_type: 'user',
      event_type: 'financial_account_created',
      resource_type: 'financial_account',
      resource_id: newAccount.id,
      result: 'success',
      details: { name: newAccount.name, balance_minor: newAccount.balance_minor, currency: newAccount.currency },
    });
    this.saveState({ ...this.state, accounts });
    return newAccount;
  }

  public updateAccount(id: string, updates: Partial<FinancialAccount>): FinancialAccount {
    const accounts = this.state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    const updated = accounts.find((a) => a.id === id)!;
    this.recordAudit({
      actor_type: 'user',
      event_type: 'financial_account_updated',
      resource_type: 'financial_account',
      resource_id: id,
      result: 'success',
      details: updates,
    });
    this.saveState({ ...this.state, accounts });
    return updated;
  }

  public deleteAccount(id: string): void {
    const accounts = this.state.accounts.filter((a) => a.id !== id);
    this.saveState({ ...this.state, accounts });
  }

  // Funding operations
  public addFunding(funding: Omit<FundingSource, 'id' | 'user_id'>): FundingSource {
    const newFunding: FundingSource = {
      ...funding,
      id: `fund-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: this.state.profile.id,
    };
    const fundingSources = [...this.state.fundingSources, newFunding];
    this.recordAudit({
      actor_type: 'user',
      event_type: 'funding_source_created',
      resource_type: 'funding_source',
      resource_id: newFunding.id,
      result: 'success',
      details: { name: newFunding.name, amount_minor: newFunding.amount_minor, status: newFunding.status },
    });
    this.saveState({ ...this.state, fundingSources });
    return newFunding;
  }

  public updateFunding(id: string, updates: Partial<FundingSource>): FundingSource {
    const fundingSources = this.state.fundingSources.map((f) => (f.id === id ? { ...f, ...updates } : f));
    const updated = fundingSources.find((f) => f.id === id)!;
    this.recordAudit({
      actor_type: 'user',
      event_type: 'funding_source_updated',
      resource_type: 'funding_source',
      resource_id: id,
      result: 'success',
      details: updates,
    });
    this.saveState({ ...this.state, fundingSources });
    return updated;
  }

  public deleteFunding(id: string): void {
    const fundingSources = this.state.fundingSources.filter((f) => f.id !== id);
    this.saveState({ ...this.state, fundingSources });
  }

  // Obligation operations
  public addObligation(ob: Omit<FinancialObligation, 'id' | 'user_id'>): FinancialObligation {
    const newOb: FinancialObligation = {
      ...ob,
      id: `ob-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: this.state.profile.id,
    };
    const obligations = [...this.state.obligations, newOb];
    this.recordAudit({
      actor_type: 'user',
      event_type: 'obligation_created',
      resource_type: 'financial_obligation',
      resource_id: newOb.id,
      result: 'success',
      details: { title: newOb.title, amount_minor: newOb.amount_minor, due_date: newOb.due_date },
    });
    this.saveState({ ...this.state, obligations });
    return newOb;
  }

  public updateObligation(id: string, updates: Partial<FinancialObligation>): FinancialObligation {
    const obligations = this.state.obligations.map((o) => (o.id === id ? { ...o, ...updates } : o));
    const updated = obligations.find((o) => o.id === id)!;
    this.recordAudit({
      actor_type: 'user',
      event_type: 'obligation_updated',
      resource_type: 'financial_obligation',
      resource_id: id,
      result: 'success',
      details: updates,
    });
    this.saveState({ ...this.state, obligations });
    return updated;
  }

  public deleteObligation(id: string): void {
    const obligations = this.state.obligations.filter((o) => o.id !== id);
    this.saveState({ ...this.state, obligations });
  }

  // Scenario operations
  public addScenarioRun(scenario: Omit<ScenarioRun, 'id' | 'user_id' | 'created_at'>): ScenarioRun {
    const newRun: ScenarioRun = {
      ...scenario,
      id: `scen-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: this.state.profile.id,
      created_at: new Date().toISOString(),
    };
    const scenarioRuns = [newRun, ...this.state.scenarioRuns];
    this.recordAudit({
      actor_type: 'user',
      event_type: 'scenario_simulated',
      resource_type: 'scenario',
      resource_id: newRun.id,
      result: 'success',
      details: { name: newRun.name, assumptions: newRun.assumptions },
    });
    this.saveState({ ...this.state, scenarioRuns });
    return newRun;
  }

  public deleteScenarioRun(id: string): void {
    const scenarioRuns = this.state.scenarioRuns.filter((s) => s.id !== id);
    this.saveState({ ...this.state, scenarioRuns });
  }

  // Messages operations
  public addMessage(msg: Omit<AIMessage, 'id' | 'created_at'>): AIMessage {
    const newMsg: AIMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const messages = [...this.state.messages, newMsg];
    this.saveState({ ...this.state, messages });
    return newMsg;
  }

  public clearMessages(): void {
    const initial = getInitialDemoState();
    this.saveState({ ...this.state, messages: initial.messages });
  }

  // Audit recording helper
  public recordAudit(event: Omit<AuditEvent, 'id' | 'user_id' | 'created_at'>): AuditEvent {
    const newEvent: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: this.state.profile.id,
      created_at: new Date().toISOString(),
    };
    const auditEvents = [newEvent, ...this.state.auditEvents];
    this.saveState({ ...this.state, auditEvents });
    return newEvent;
  }

  // ============================================================================
  // CONTROLLED PAYMENT WORKFLOW & STATE MACHINE
  // Draft -> Validated -> AwaitingApproval -> Approved -> Executing -> Executed
  // ============================================================================

  /**
   * Generates a deterministic SHA-like hash binding the exact immutable details of a proposal
   */
  public generateApprovalHash(details: {
    userId: string;
    amountMinor: number;
    currency: string;
    recipient: string;
    purpose: string;
    obligationId?: string;
  }): string {
    const raw = `${details.userId}|${details.amountMinor}|${details.currency}|${details.recipient}|${details.purpose}|${details.obligationId || ''}`;
    // Simple fast hashing for sandbox verification
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_sha256_${Math.abs(hash).toString(16)}_${details.amountMinor}`;
  }

  /**
   * Step 1: Create Proposal (status: awaiting_approval)
   */
  public createPaymentProposal(params: {
    obligationId?: string;
    amountMinor: number;
    currency: 'EUR' | 'USD' | 'GBP' | 'CNY' | 'CAD' | 'AUD' | 'JPY';
    recipientLabel: string;
    purpose: string;
  }): PaymentProposal {
    const userId = this.state.profile.id;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins
    const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (params.amountMinor <= 0) {
      throw new Error('Payment amount must be strictly positive.');
    }

    const approvalHash = this.generateApprovalHash({
      userId,
      amountMinor: params.amountMinor,
      currency: params.currency,
      recipient: params.recipientLabel,
      purpose: params.purpose,
      obligationId: params.obligationId,
    });

    const proposal: PaymentProposal = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      obligation_id: params.obligationId,
      amount_minor: params.amountMinor,
      currency: params.currency,
      recipient_label: params.recipientLabel,
      purpose: params.purpose,
      status: 'awaiting_approval',
      approval_hash: approvalHash,
      expires_at: expiresAt,
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const paymentProposals = [proposal, ...this.state.paymentProposals];
    this.recordAudit({
      actor_type: 'user',
      event_type: 'proposal_created',
      resource_type: 'payment_proposal',
      resource_id: proposal.id,
      result: 'success',
      details: {
        amount_minor: proposal.amount_minor,
        currency: proposal.currency,
        recipient: proposal.recipient_label,
        purpose: proposal.purpose,
      },
    });

    this.saveState({ ...this.state, paymentProposals });
    return proposal;
  }

  /**
   * Step 2: Explicit User Approval
   */
  public approvePaymentProposal(proposalId: string, providedHash: string): PaymentProposal {
    const proposal = this.state.paymentProposals.find((p) => p.id === proposalId);
    if (!proposal) throw new Error('Payment proposal not found.');

    if (proposal.status !== 'awaiting_approval' && proposal.status !== 'validated') {
      throw new Error(`Cannot approve proposal in "${proposal.status}" state.`);
    }

    if (new Date(proposal.expires_at).getTime() < Date.now()) {
      proposal.status = 'expired';
      this.saveState({ ...this.state });
      throw new Error('Payment proposal has expired. A new proposal must be created.');
    }

    if (proposal.approval_hash !== providedHash) {
      throw new Error('Security integrity check failed: Payment parameters were modified after proposal creation.');
    }

    proposal.status = 'approved';
    proposal.approved_at = new Date().toISOString();
    proposal.updated_at = new Date().toISOString();

    this.recordAudit({
      actor_type: 'user',
      event_type: 'proposal_approved',
      resource_type: 'payment_proposal',
      resource_id: proposal.id,
      result: 'success',
      details: {
        amount_minor: proposal.amount_minor,
        currency: proposal.currency,
        recipient: proposal.recipient_label,
      },
    });

    this.saveState({ ...this.state });
    return proposal;
  }

  /**
   * Step 2b: User Rejection
   */
  public rejectPaymentProposal(proposalId: string, reason: string = 'User declined proposal'): PaymentProposal {
    const proposal = this.state.paymentProposals.find((p) => p.id === proposalId);
    if (!proposal) throw new Error('Payment proposal not found.');

    if (proposal.status === 'executed') {
      throw new Error('Cannot reject an already executed transaction.');
    }

    proposal.status = 'rejected';
    proposal.rejection_reason = reason;
    proposal.updated_at = new Date().toISOString();

    this.recordAudit({
      actor_type: 'user',
      event_type: 'proposal_rejected',
      resource_type: 'payment_proposal',
      resource_id: proposal.id,
      result: 'denied',
      details: { reason },
    });

    this.saveState({ ...this.state });
    return proposal;
  }

  /**
   * Step 3: Idempotent Execution in Sandbox Ledger
   */
  public executeSandboxPayment(proposalId: string, idempotencyKey: string): {
    proposal: PaymentProposal;
    transaction: FinancialTransaction;
    idempotentReplay: boolean;
  } {
    const proposal = this.state.paymentProposals.find((p) => p.id === proposalId);
    if (!proposal) throw new Error('Payment proposal not found.');

    // Duplicate check / Idempotency replay
    if (proposal.status === 'executed') {
      const existingTx = this.state.transactions.find((t) => t.id === proposal.transaction_id);
      if (existingTx) {
        return {
          proposal,
          transaction: existingTx,
          idempotentReplay: true,
        };
      }
    }

    if (proposal.status !== 'approved') {
      throw new Error(`Execution blocked: Proposal status is "${proposal.status}". Explicit user approval is required.`);
    }

    if (new Date(proposal.expires_at).getTime() < Date.now()) {
      proposal.status = 'expired';
      this.saveState({ ...this.state });
      throw new Error('Execution blocked: Proposal has expired.');
    }

    // Balance check
    const account = this.state.accounts.find((a) => a.currency === proposal.currency);
    if (!account || account.balance_minor < proposal.amount_minor) {
      proposal.status = 'failed';
      proposal.failure_reason = 'Insufficient funds in sandbox account';
      this.recordAudit({
        actor_type: 'system',
        event_type: 'payment_execution_failed',
        resource_type: 'payment_proposal',
        resource_id: proposal.id,
        result: 'failure',
        details: { reason: 'Insufficient funds' },
      });
      this.saveState({ ...this.state });
      throw new Error(`Insufficient funds: Sandbox account has ${account ? account.balance_minor / 100 : 0} ${proposal.currency}, but payment requires ${proposal.amount_minor / 100} ${proposal.currency}.`);
    }

    // Deduct from account
    account.balance_minor -= proposal.amount_minor;

    // Create ledger transaction
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const tx: FinancialTransaction = {
      id: txId,
      user_id: this.state.profile.id,
      account_id: account.id,
      transaction_type: 'outflow',
      amount_minor: proposal.amount_minor,
      currency: proposal.currency,
      transaction_date: new Date().toISOString(),
      status: 'completed',
      category: 'tuition',
      description: `Simulated Sandbox Payment: ${proposal.purpose} to ${proposal.recipient_label}`,
      source_type: 'sandbox_ledger',
      source_reference: proposal.id,
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
    };

    // Update obligation to paid if linked
    if (proposal.obligation_id) {
      const ob = this.state.obligations.find((o) => o.id === proposal.obligation_id);
      if (ob) {
        ob.status = 'paid';
        ob.paid_at = new Date().toISOString();
      }
    }

    // Update proposal to executed
    proposal.status = 'executed';
    proposal.executed_at = new Date().toISOString();
    proposal.transaction_id = txId;
    proposal.updated_at = new Date().toISOString();

    const transactions = [tx, ...this.state.transactions];

    this.recordAudit({
      actor_type: 'system',
      event_type: 'sandbox_payment_executed',
      resource_type: 'payment_proposal',
      resource_id: proposal.id,
      result: 'success',
      details: {
        amount_minor: proposal.amount_minor,
        currency: proposal.currency,
        recipient: proposal.recipient_label,
        transaction_id: txId,
        idempotency_key: idempotencyKey,
      },
    });

    this.saveState({ ...this.state, transactions });

    return {
      proposal,
      transaction: tx,
      idempotentReplay: false,
    };
  }
}

export const localDb = new LocalDatabaseManager();
