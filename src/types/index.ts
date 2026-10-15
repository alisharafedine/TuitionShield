// ==============================================================================
// TuitionShield AI — TypeScript Type Definitions
// ==============================================================================

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CNY' | 'CAD' | 'AUD' | 'JPY';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  minorUnits: number; // e.g. 2 for EUR/USD/CNY (cents), 0 for JPY
}

export interface UserProfile {
  id: string;
  display_name: string;
  destination_country: string;
  university: string;
  study_program: string;
  study_start_date: string; // ISO date 'YYYY-MM-DD'
  study_duration_months: number;
  home_currency: SupportedCurrency;
  reserve_threshold_minor: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountType = 'checking' | 'savings' | 'cash' | 'term_deposit' | 'other';
export type VerifiedStatus = 'declared' | 'reviewed' | 'pending_evidence';

export interface FinancialAccount {
  id: string;
  user_id: string;
  name: string;
  currency: SupportedCurrency;
  balance_minor: number; // Stored in minor units (e.g., cents)
  account_type: AccountType;
  source_type: 'manual_declaration' | 'document_import' | 'sandbox_seed';
  verified_status: VerifiedStatus;
  as_of_date: string;
  created_at?: string;
  updated_at?: string;
}

export type FundingStatus = 'pending' | 'confirmed' | 'received' | 'cancelled';
export type FundingSourceType = 'scholarship' | 'family_support' | 'personal_savings' | 'part_time_job' | 'grant' | 'student_loan' | 'other';

export interface FundingSource {
  id: string;
  user_id: string;
  name: string;
  amount_minor: number;
  currency: SupportedCurrency;
  status: FundingStatus;
  expected_date?: string; // ISO date
  received_at?: string;
  source_type: FundingSourceType;
  recurrence_rule?: string;
  notes?: string;
  source_reference?: string;
  created_at?: string;
  updated_at?: string;
}

export type ObligationCategory = 
  | 'tuition' 
  | 'housing' 
  | 'food' 
  | 'transportation' 
  | 'insurance' 
  | 'visa' 
  | 'travel' 
  | 'books' 
  | 'personal' 
  | 'other';

export type ObligationStatus = 'planned' | 'due' | 'paid' | 'cancelled' | 'overdue';

export interface FinancialObligation {
  id: string;
  user_id: string;
  title: string;
  category: ObligationCategory;
  amount_minor: number;
  currency: SupportedCurrency;
  due_date: string; // ISO date
  status: ObligationStatus;
  is_essential: boolean;
  recurrence_rule?: string;
  paid_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinancialTransaction {
  id: string;
  user_id: string;
  account_id?: string;
  transaction_type: 'inflow' | 'outflow';
  amount_minor: number;
  currency: SupportedCurrency;
  transaction_date: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  category: string;
  description: string;
  source_type: 'manual' | 'imported' | 'sandbox_ledger';
  source_reference?: string;
  idempotency_key?: string;
  created_at?: string;
}

export type PaymentProposalStatus = 
  | 'draft' 
  | 'validated' 
  | 'awaiting_approval' 
  | 'approved' 
  | 'executing' 
  | 'executed' 
  | 'rejected' 
  | 'failed' 
  | 'expired';

export interface PaymentProposal {
  id: string;
  user_id: string;
  obligation_id?: string;
  amount_minor: number;
  currency: SupportedCurrency;
  recipient_label: string;
  purpose: string;
  status: PaymentProposalStatus;
  approval_hash?: string;
  approved_at?: string;
  executed_at?: string;
  expires_at: string;
  rejection_reason?: string;
  failure_reason?: string;
  idempotency_key: string;
  transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScenarioRun {
  id: string;
  user_id: string;
  name: string;
  baseline_reference: string;
  assumptions: ScenarioAssumptions;
  results: ScenarioResult;
  currency: SupportedCurrency;
  created_at?: string;
}

export interface ScenarioAssumptions {
  rentIncreasePercent?: number; // e.g. 15 for 15%
  livingCostIncreasePercent?: number; // e.g. 10
  tuitionAdjustmentMinor?: number; // e.g. +500 EUR in minor units
  scholarshipDelayMonths?: number; // e.g. 1 or 2
  scholarshipCancelled?: boolean;
  partTimeMonthlyIncomeMinor?: number; // e.g. 450 EUR monthly
  customNotes?: string;
}

export interface ScenarioResult {
  baselineEndingBalanceMinor: number;
  scenarioEndingBalanceMinor: number;
  balanceDifferenceMinor: number;
  baselineFundingGapMinor: number;
  scenarioFundingGapMinor: number;
  gapChangeMinor: number;
  lowestProjectedBalanceMinor: number;
  firstShortageDate?: string;
  affectedObligations: string[];
  keyDrivers: string[];
}

export type AuditEventType = 
  | 'profile_created'
  | 'profile_updated'
  | 'financial_account_created'
  | 'financial_account_updated'
  | 'funding_source_created'
  | 'funding_source_updated'
  | 'obligation_created'
  | 'obligation_updated'
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'sandbox_payment_executed'
  | 'payment_execution_failed'
  | 'scenario_simulated'
  | 'ai_tool_invoked'
  | 'security_denied'
  | 'competition_dataset_loaded';

export interface AuditEvent {
  id: string;
  user_id?: string;
  actor_type: 'user' | 'system' | 'ai_agent';
  event_type: AuditEventType;
  resource_type: string;
  resource_id?: string;
  result: 'success' | 'denied' | 'failure' | 'warning';
  request_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// Deterministic Financial Engine Interfaces
export interface FinancialPlanInput {
  baseCurrency: SupportedCurrency;
  planStartDate: string;
  planEndDate: string;
  accounts: FinancialAccount[];
  fundingSources: FundingSource[];
  obligations: FinancialObligation[];
  reserveThresholdMinor?: number;
}

export interface FundingGapResult {
  baseCurrency: SupportedCurrency;
  availableStartingBalanceMinor: number;
  eligibleConfirmedInflowsMinor: number;
  totalConfirmedResourcesMinor: number;
  eligibleUnpaidObligationsMinor: number;
  alreadyPaidExpensesMinor: number;
  pendingFundingMinor: number;
  fundingGapMinor: number; // max(0, costs - resources)
  projectedSurplusMinor: number; // max(0, resources - costs)
  isFullyFunded: boolean;
  obligationsCount: number;
  warnings: string[];
}

export interface CashFlowPeriod {
  periodKey: string; // e.g. '2026-10'
  label: string; // e.g. 'Oct 2026'
  startDate: string;
  endDate: string;
  openingBalanceMinor: number;
  inflowsMinor: number;
  outflowsMinor: number;
  netCashFlowMinor: number;
  closingBalanceMinor: number;
  inflowItems: { id: string; name: string; amount_minor: number; status: FundingStatus }[];
  outflowItems: { id: string; title: string; category: ObligationCategory; amount_minor: number; status: ObligationStatus }[];
  isDeficit: boolean;
  isBelowReserve: boolean;
}

export interface CashFlowForecast {
  baseCurrency: SupportedCurrency;
  periods: CashFlowPeriod[];
  lowestProjectedBalanceMinor: number;
  lowestBalanceDate?: string;
  firstShortageDate?: string;
  firstLowReserveDate?: string;
  endingBalanceMinor: number;
  totalProjectedInflowsMinor: number;
  totalProjectedOutflowsMinor: number;
}

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskType = 
  | 'projected_deficit' 
  | 'tuition_deadline_risk' 
  | 'low_reserve_warning' 
  | 'pending_funding_reliance' 
  | 'expense_concentration' 
  | 'currency_mismatch'
  | 'data_staleness';

export interface FinancialRisk {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  evidence: string;
  affectedDate?: string;
  explanation: string;
  recommendedAction: string;
}

// AI Agent & Tool Calling Interfaces
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface ToolCallRequest {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolCallExecutionResult {
  tool_call_id: string;
  tool_name: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCallRequest[];
  tool_call_id?: string;
  created_at: string;
  suggestedQuestions?: string[];
  toolActivity?: {
    name: string;
    status: 'calling' | 'completed' | 'failed';
    summary?: string;
  };
}
