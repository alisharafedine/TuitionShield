import { describe, it, expect } from 'vitest';
import {
  calculateFundingGap,
  forecastCashFlow,
  detectFinancialRisks,
  simulateScenario,
  validateFinancialPlan,
} from '../features/financial-engine/engine';
import {
  convertCurrency,
  formatMoney,
  toMinorUnits,
  toMajorUnits,
} from '../features/financial-engine/currency';
import { FinancialPlanInput } from '../types';

describe('Deterministic Financial Engine — Tests', () => {
  // Base test fixture: Competition Baseline Scenario
  // €8,000 available funds
  // €10,500 expenses (€4,000 tuition, €5,500 living, €1,000 other)
  // €0 confirmed scholarship, €2,000 pending scholarship
  const createBaselinePlan = (): FinancialPlanInput => ({
    baseCurrency: 'EUR',
    planStartDate: '2026-10-01',
    planEndDate: '2027-09-30',
    reserveThresholdMinor: 100000, // €1,000
    accounts: [
      {
        id: 'acc-1',
        user_id: 'user-1',
        name: 'Euro Savings',
        currency: 'EUR',
        balance_minor: 800000, // €8,000.00
        account_type: 'savings',
        source_type: 'manual_declaration',
        verified_status: 'declared',
        as_of_date: '2026-10-01',
      },
    ],
    fundingSources: [
      {
        id: 'fund-1',
        user_id: 'user-1',
        name: 'DAAD Scholarship (Pending)',
        amount_minor: 200000, // €2,000.00
        currency: 'EUR',
        status: 'pending', // Pending, NOT confirmed
        source_type: 'scholarship',
        expected_date: '2026-12-01',
      },
    ],
    obligations: [
      {
        id: 'ob-1',
        user_id: 'user-1',
        title: 'Tuition Installment 1',
        category: 'tuition',
        amount_minor: 200000, // €2,000.00
        currency: 'EUR',
        due_date: '2026-10-25',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-2',
        user_id: 'user-1',
        title: 'Tuition Installment 2',
        category: 'tuition',
        amount_minor: 200000, // €2,000.00
        currency: 'EUR',
        due_date: '2027-04-15',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-3',
        user_id: 'user-1',
        title: 'Student Housing Rent',
        category: 'housing',
        amount_minor: 420000, // €4,200.00
        currency: 'EUR',
        due_date: '2027-01-01',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-4',
        user_id: 'user-1',
        title: 'Food & Subsistence',
        category: 'food',
        amount_minor: 130000, // €1,300.00
        currency: 'EUR',
        due_date: '2027-02-01',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-5',
        user_id: 'user-1',
        title: 'Health Insurance',
        category: 'insurance',
        amount_minor: 60000, // €600.00
        currency: 'EUR',
        due_date: '2026-11-15',
        status: 'planned',
        is_essential: true,
      },
      {
        id: 'ob-6',
        user_id: 'user-1',
        title: 'Visa & Residence Permit',
        category: 'visa',
        amount_minor: 40000, // €400.00
        currency: 'EUR',
        due_date: '2026-10-15',
        status: 'planned',
        is_essential: true,
      },
    ],
  });

  describe('Section 21 & F-01/F-02/F-03: Funding Gap Calculations', () => {
    it('Calculates exact competition baseline shortfall: €8,000 funds vs €10,500 expenses = €2,500 gap', () => {
      const plan = createBaselinePlan();
      const result = calculateFundingGap(plan);

      expect(result.availableStartingBalanceMinor).toBe(800000); // €8,000
      expect(result.eligibleConfirmedInflowsMinor).toBe(0); // €0 confirmed
      expect(result.totalConfirmedResourcesMinor).toBe(800000); // €8,000 total confirmed
      expect(result.eligibleUnpaidObligationsMinor).toBe(1050000); // €10,500 total expenses
      expect(result.pendingFundingMinor).toBe(200000); // €2,000 pending
      expect(result.fundingGapMinor).toBe(250000); // €2,500 funding gap
      expect(result.projectedSurplusMinor).toBe(0);
      expect(result.isFullyFunded).toBe(false);
    });

    it('F-01: Funding exactly equals expenses -> gap = 0, surplus = 0', () => {
      const plan = createBaselinePlan();
      // Remove obligations until expenses = €8,000
      plan.obligations = [
        {
          id: 'ob-1',
          user_id: 'user-1',
          title: 'Tuition and living',
          category: 'tuition',
          amount_minor: 800000,
          currency: 'EUR',
          due_date: '2026-11-01',
          status: 'planned',
          is_essential: true,
        },
      ];

      const result = calculateFundingGap(plan);
      expect(result.fundingGapMinor).toBe(0);
      expect(result.projectedSurplusMinor).toBe(0);
      expect(result.isFullyFunded).toBe(true);
    });

    it('F-03: Funding exceeds expenses -> gap = 0, surplus = difference', () => {
      const plan = createBaselinePlan();
      // Available funds €12,000
      plan.accounts[0].balance_minor = 1200000;
      // Expenses = €10,500
      const result = calculateFundingGap(plan);

      expect(result.fundingGapMinor).toBe(0);
      expect(result.projectedSurplusMinor).toBe(150000); // €1,500 surplus
      expect(result.isFullyFunded).toBe(true);
    });

    it('F-04: Pending scholarship is excluded from confirmed funding', () => {
      const plan = createBaselinePlan();
      const result = calculateFundingGap(plan);

      // Even though pending scholarship is €2,000, confirmed resources remain €8,000
      expect(result.totalConfirmedResourcesMinor).toBe(800000);
      expect(result.pendingFundingMinor).toBe(200000);
      expect(result.fundingGapMinor).toBe(250000); // still €2,500, NOT €500
      expect(result.warnings.some((w) => w.includes('pending funding'))).toBe(true);
    });

    it('F-05: Cancelled obligations are excluded from eligible expenses', () => {
      const plan = createBaselinePlan();
      plan.obligations[0].status = 'cancelled'; // cancel €2,000 tuition

      const result = calculateFundingGap(plan);
      // Expenses drop from €10,500 to €8,500
      expect(result.eligibleUnpaidObligationsMinor).toBe(850000);
      // Gap drops from €2,500 to €500
      expect(result.fundingGapMinor).toBe(50000);
    });

    it('F-06: Already paid expenses are not double-counted as future outflows', () => {
      const plan = createBaselinePlan();
      plan.obligations[5].status = 'paid'; // mark €400 visa fee as paid

      const result = calculateFundingGap(plan);
      expect(result.alreadyPaidExpensesMinor).toBe(40000);
      // Unpaid obligations: €10,500 - €400 = €10,100
      expect(result.eligibleUnpaidObligationsMinor).toBe(1010000);
      expect(result.fundingGapMinor).toBe(210000); // €2,100
    });
  });

  describe('Dated Cash-Flow Forecasting & Risk Detection', () => {
    it('Forecasts monthly balances chronologically and detects first shortage date', () => {
      const plan = createBaselinePlan();
      const forecast = forecastCashFlow(plan);

      expect(forecast.periods.length).toBeGreaterThan(0);
      expect(forecast.periods[0].openingBalanceMinor).toBe(800000); // €8,000 opening
      expect(forecast.lowestProjectedBalanceMinor).toBeLessThan(0); // Will be negative by end
      expect(forecast.firstShortageDate).toBeDefined();
    });

    it('Detects financial risks: deficit, tuition deadline risk, and pending funding reliance', () => {
      const plan = createBaselinePlan();
      const gapResult = calculateFundingGap(plan);
      const forecast = forecastCashFlow(plan);
      const risks = detectFinancialRisks(plan, gapResult, forecast);

      expect(risks.length).toBeGreaterThan(0);
      const riskTypes = risks.map((r) => r.type);
      expect(riskTypes).toContain('projected_deficit');
      expect(riskTypes).toContain('pending_funding_reliance');
    });
  });

  describe('Scenario Simulation: Isolation & Reproducibility', () => {
    it('Simulates rent increase without mutating baseline data', () => {
      const baseline = createBaselinePlan();
      const baselineRentBefore = baseline.obligations.find((o) => o.category === 'housing')?.amount_minor;

      const scenario = simulateScenario(baseline, {
        rentIncreasePercent: 15,
      });

      // Verify baseline rent is completely untouched
      const baselineRentAfter = baseline.obligations.find((o) => o.category === 'housing')?.amount_minor;
      expect(baselineRentAfter).toBe(baselineRentBefore);

      // Verify scenario results reflect the 15% increase (€4,200 * 1.15 = €4,830 -> +€630 gap)
      expect(scenario.gapChangeMinor).toBe(63000); // €630.00
      expect(scenario.scenarioFundingGapMinor).toBe(313000); // €2,500 + €630 = €3,130
      expect(scenario.keyDrivers.some((d) => d.includes('Housing expenses increased by 15%'))).toBe(true);
    });

    it('Simulates adding a part-time job reducing the funding gap', () => {
      const baseline = createBaselinePlan();
      const scenario = simulateScenario(baseline, {
        partTimeMonthlyIncomeMinor: 45000, // €450/month
      });

      expect(scenario.scenarioFundingGapMinor).toBeLessThan(scenario.baselineFundingGapMinor);
      expect(scenario.keyDrivers.some((d) => d.includes('Part-time job added'))).toBe(true);
    });
  });

  describe('Currency & Integer Precision', () => {
    it('Converts minor and major units accurately', () => {
      expect(toMinorUnits(8000, 'EUR')).toBe(800000);
      expect(toMinorUnits('4,200.50', 'EUR')).toBe(420050);
      expect(toMajorUnits(800000, 'EUR')).toBe(8000);
      expect(toMajorUnits(150, 'JPY')).toBe(150); // JPY precision 0
      expect(toMinorUnits(150, 'JPY')).toBe(150);
    });

    it('Formats currencies with correct locale symbols', () => {
      expect(formatMoney(800000, 'EUR')).toBe('€8,000.00');
      expect(formatMoney(250000, 'USD')).toBe('$2,500.00');
      expect(formatMoney(-50000, 'EUR')).toBe('-€500.00');
    });

    it('Rejects negative or invalid exchange rates', () => {
      expect(() => convertCurrency(10000, 'EUR', 'USD', -1.2)).toThrow(/Invalid exchange rate/);
      expect(() => convertCurrency(10000, 'EUR', 'USD', 0)).toThrow(/Invalid exchange rate/);
    });
  });

  describe('Plan Validation', () => {
    it('Validates a correct plan successfully', () => {
      const plan = createBaselinePlan();
      const validation = validateFinancialPlan(plan);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('Catches invalid dates and negative amounts', () => {
      const plan = createBaselinePlan();
      plan.planEndDate = '2025-01-01'; // Before start date
      plan.obligations[0].amount_minor = -500; // Negative amount

      const validation = validateFinancialPlan(plan);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('strictly before'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('negative amount'))).toBe(true);
    });
  });
});
