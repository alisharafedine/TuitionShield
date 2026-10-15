import {
  FinancialPlanInput,
  FundingGapResult,
  CashFlowForecast,
  CashFlowPeriod,
  FinancialRisk,
  ScenarioAssumptions,
  ScenarioResult,
} from '../../types';
import { convertCurrency } from './currency';

/**
 * Validates a financial plan input before calculation.
 * Ensures dates are logical, currencies are supported, and records are coherent.
 */
export function validateFinancialPlan(input: FinancialPlanInput): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.baseCurrency) {
    errors.push('Base planning currency must be specified.');
  }

  const startDate = new Date(input.planStartDate);
  const endDate = new Date(input.planEndDate);

  if (isNaN(startDate.getTime())) {
    errors.push(`Invalid plan start date: ${input.planStartDate}`);
  }
  if (isNaN(endDate.getTime())) {
    errors.push(`Invalid plan end date: ${input.planEndDate}`);
  }
  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
    errors.push('Plan start date must be strictly before plan end date.');
  }

  // Account checks
  for (const account of input.accounts) {
    if (account.balance_minor < 0) {
      warnings.push(`Account "${account.name}" has a negative declared balance.`);
    }
  }

  // Obligation checks
  for (const ob of input.obligations) {
    if (ob.amount_minor < 0) {
      errors.push(`Obligation "${ob.title}" cannot have a negative amount.`);
    }
    const due = new Date(ob.due_date);
    if (isNaN(due.getTime())) {
      errors.push(`Obligation "${ob.title}" has an invalid due date: ${ob.due_date}`);
    }
  }

  // Funding checks
  for (const fund of input.fundingSources) {
    if (fund.amount_minor < 0) {
      errors.push(`Funding source "${fund.name}" cannot have a negative amount.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Pure function: Calculates the aggregate funding gap for a student's plan horizon.
 * 
 * Formulas:
 * confirmed resources = available starting balance + eligible confirmed future inflows
 * eligible planned costs = eligible unpaid obligations within the plan horizon
 * funding gap = max(0, eligible planned costs - confirmed resources)
 * projected surplus = max(0, confirmed resources - eligible planned costs)
 * 
 * Rules:
 * - Starting balance is never double-counted as future inflow.
 * - Already-paid expenses are not counted again as future outflows.
 * - Pending funding is strictly excluded from confirmed resources (reported separately).
 * - Cancelled obligations and cancelled funding are excluded.
 */
export function calculateFundingGap(input: FinancialPlanInput): FundingGapResult {
  const baseCurrency = input.baseCurrency;
  const warnings: string[] = [];

  const startTimestamp = new Date(input.planStartDate).getTime();
  const endTimestamp = new Date(input.planEndDate).getTime();

  // 1. Available Starting Balance (converted to baseCurrency if necessary)
  let availableStartingBalanceMinor = 0;
  for (const acc of input.accounts) {
    const converted = convertCurrency(acc.balance_minor, acc.currency, baseCurrency);
    if (acc.currency !== baseCurrency) {
      warnings.push(`Converted account "${acc.name}" from ${acc.currency} to ${baseCurrency} using estimated rate.`);
    }
    // Only include positive declared resources
    if (converted.targetAmountMinor > 0) {
      availableStartingBalanceMinor += converted.targetAmountMinor;
    }
  }

  // 2. Inflows within plan horizon
  let eligibleConfirmedInflowsMinor = 0;
  let pendingFundingMinor = 0;

  for (const fund of input.fundingSources) {
    if (fund.status === 'cancelled') continue;

    const converted = convertCurrency(fund.amount_minor, fund.currency, baseCurrency);

    if (fund.status === 'pending') {
      pendingFundingMinor += converted.targetAmountMinor;
      continue;
    }

    // Only 'confirmed' or 'received' are counted as confirmed resources
    if (fund.status === 'confirmed' || fund.status === 'received') {
      // Check if expected date is within horizon (if date provided)
      if (fund.expected_date) {
        const expectedTime = new Date(fund.expected_date).getTime();
        if (!isNaN(expectedTime) && expectedTime > endTimestamp) {
          // Funding arrives after plan horizon
          warnings.push(`Confirmed funding "${fund.name}" arrives after the plan horizon and is excluded.`);
          continue;
        }
      }
      eligibleConfirmedInflowsMinor += converted.targetAmountMinor;
    }
  }

  const totalConfirmedResourcesMinor = availableStartingBalanceMinor + eligibleConfirmedInflowsMinor;

  // 3. Outflows within plan horizon
  let eligibleUnpaidObligationsMinor = 0;
  let alreadyPaidExpensesMinor = 0;
  let countedObligations = 0;

  for (const ob of input.obligations) {
    if (ob.status === 'cancelled') continue;

    const converted = convertCurrency(ob.amount_minor, ob.currency, baseCurrency);
    const dueTime = new Date(ob.due_date).getTime();

    // Check plan horizon bounds
    if (!isNaN(dueTime) && (dueTime < startTimestamp || dueTime > endTimestamp)) {
      continue; // Outside current plan horizon
    }

    if (ob.status === 'paid') {
      alreadyPaidExpensesMinor += converted.targetAmountMinor;
    } else {
      // 'planned', 'due', 'overdue' are unpaid obligations
      eligibleUnpaidObligationsMinor += converted.targetAmountMinor;
      countedObligations++;
    }
  }

  // 4. Funding Gap and Surplus
  const netDiff = eligibleUnpaidObligationsMinor - totalConfirmedResourcesMinor;
  const fundingGapMinor = Math.max(0, netDiff);
  const projectedSurplusMinor = Math.max(0, -netDiff);
  const isFullyFunded = fundingGapMinor === 0;

  if (pendingFundingMinor > 0) {
    warnings.push(
      `You have pending funding of ${pendingFundingMinor / 100} ${baseCurrency} that is not counted in confirmed resources.`
    );
  }

  return {
    baseCurrency,
    availableStartingBalanceMinor,
    eligibleConfirmedInflowsMinor,
    totalConfirmedResourcesMinor,
    eligibleUnpaidObligationsMinor,
    alreadyPaidExpensesMinor,
    pendingFundingMinor,
    fundingGapMinor,
    projectedSurplusMinor,
    isFullyFunded,
    obligationsCount: countedObligations,
    warnings,
  };
}

/**
 * Pure function: Forecasts monthly dated cash flow chronologically.
 * Tracks month-by-month opening balance, inflows, outflows, net cash flow, and closing balance.
 */
export function forecastCashFlow(input: FinancialPlanInput): CashFlowForecast {
  const baseCurrency = input.baseCurrency;
  const reserveThreshold = input.reserveThresholdMinor ?? 100000; // default 1,000 EUR

  const startDate = new Date(input.planStartDate);
  const endDate = new Date(input.planEndDate);

  // Generate monthly buckets
  const periods: CashFlowPeriod[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  // Starting balance across all accounts
  let runningBalanceMinor = 0;
  for (const acc of input.accounts) {
    const conv = convertCurrency(acc.balance_minor, acc.currency, baseCurrency);
    if (conv.targetAmountMinor > 0) {
      runningBalanceMinor += conv.targetAmountMinor;
    }
  }

  let lowestProjectedBalanceMinor = runningBalanceMinor;
  let lowestBalanceDate: string | undefined = undefined;
  let firstShortageDate: string | undefined = undefined;
  let firstLowReserveDate: string | undefined = undefined;
  let totalProjectedInflowsMinor = 0;
  let totalProjectedOutflowsMinor = 0;

  while (current <= endMonth) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthName = current.toLocaleString('en-US', { month: 'short' });
    const label = `${monthName} ${year}`;

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    const periodOpeningBalance = runningBalanceMinor;
    let periodInflowsMinor = 0;
    let periodOutflowsMinor = 0;

    const inflowItems: CashFlowPeriod['inflowItems'] = [];
    const outflowItems: CashFlowPeriod['outflowItems'] = [];

    // Find inflows in this month (confirmed or received only)
    for (const fund of input.fundingSources) {
      if (fund.status !== 'confirmed' && fund.status !== 'received') continue;
      if (!fund.expected_date) continue;

      const fundDate = new Date(fund.expected_date);
      if (fundDate >= monthStart && fundDate <= monthEnd) {
        const conv = convertCurrency(fund.amount_minor, fund.currency, baseCurrency);
        periodInflowsMinor += conv.targetAmountMinor;
        inflowItems.push({
          id: fund.id,
          name: fund.name,
          amount_minor: conv.targetAmountMinor,
          status: fund.status,
        });
      }
    }

    // Find outflows in this month (unpaid obligations only)
    for (const ob of input.obligations) {
      if (ob.status === 'paid' || ob.status === 'cancelled') continue;

      const obDate = new Date(ob.due_date);
      if (obDate >= monthStart && obDate <= monthEnd) {
        const conv = convertCurrency(ob.amount_minor, ob.currency, baseCurrency);
        periodOutflowsMinor += conv.targetAmountMinor;
        outflowItems.push({
          id: ob.id,
          title: ob.title,
          category: ob.category,
          amount_minor: conv.targetAmountMinor,
          status: ob.status,
        });
      }
    }

    const netCashFlowMinor = periodInflowsMinor - periodOutflowsMinor;
    const closingBalanceMinor = periodOpeningBalance + netCashFlowMinor;

    totalProjectedInflowsMinor += periodInflowsMinor;
    totalProjectedOutflowsMinor += periodOutflowsMinor;
    runningBalanceMinor = closingBalanceMinor;

    if (closingBalanceMinor < lowestProjectedBalanceMinor) {
      lowestProjectedBalanceMinor = closingBalanceMinor;
      lowestBalanceDate = periodKey;
    }

    if (closingBalanceMinor < 0 && !firstShortageDate) {
      firstShortageDate = periodKey;
    }

    if (closingBalanceMinor < reserveThreshold && !firstLowReserveDate) {
      firstLowReserveDate = periodKey;
    }

    periods.push({
      periodKey,
      label,
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0],
      openingBalanceMinor: periodOpeningBalance,
      inflowsMinor: periodInflowsMinor,
      outflowsMinor: periodOutflowsMinor,
      netCashFlowMinor,
      closingBalanceMinor,
      inflowItems,
      outflowItems,
      isDeficit: closingBalanceMinor < 0,
      isBelowReserve: closingBalanceMinor < reserveThreshold,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return {
    baseCurrency,
    periods,
    lowestProjectedBalanceMinor,
    lowestBalanceDate,
    firstShortageDate,
    firstLowReserveDate,
    endingBalanceMinor: runningBalanceMinor,
    totalProjectedInflowsMinor,
    totalProjectedOutflowsMinor,
  };
}

/**
 * Pure function: Detects concrete, evidence-based financial risks.
 * Never invents subjective probability scores; provides factual evidence and actionable next steps.
 */
export function detectFinancialRisks(
  input: FinancialPlanInput,
  gapResult: FundingGapResult,
  forecast: CashFlowForecast
): FinancialRisk[] {
  const risks: FinancialRisk[] = [];
  const baseCurrency = input.baseCurrency;
  const reserveThreshold = input.reserveThresholdMinor ?? 100000;

  // 1. Projected Deficit Risk
  if (gapResult.fundingGapMinor > 0 || forecast.firstShortageDate) {
    const gapFormatted = (gapResult.fundingGapMinor / 100).toLocaleString();
    risks.push({
      id: 'risk-deficit',
      type: 'projected_deficit',
      severity: 'critical',
      title: 'Projected Funding Shortfall',
      evidence: `Funding gap of ${gapFormatted} ${baseCurrency}. Balance falls below zero in ${forecast.firstShortageDate || 'plan horizon'}.`,
      affectedDate: forecast.firstShortageDate,
      explanation: `Your planned expenses (${(gapResult.eligibleUnpaidObligationsMinor / 100).toLocaleString()} ${baseCurrency}) exceed confirmed available resources (${(gapResult.totalConfirmedResourcesMinor / 100).toLocaleString()} ${baseCurrency}).`,
      recommendedAction: 'Secure additional funding, convert pending scholarships to confirmed, or explore housing/living cost reductions.',
    });
  }

  // 2. Tuition Payment Deadline Risk (Check if balance is sufficient immediately prior to tuition)
  const tuitionObligations = input.obligations.filter(
    (o) => o.category === 'tuition' && o.status !== 'paid' && o.status !== 'cancelled'
  );

  for (const t of tuitionObligations) {
    const tDate = new Date(t.due_date);
    const tPeriodKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
    const period = forecast.periods.find((p) => p.periodKey === tPeriodKey);

    if (period && period.closingBalanceMinor < 0) {
      risks.push({
        id: `risk-tuition-${t.id}`,
        type: 'tuition_deadline_risk',
        severity: 'high',
        title: `Tuition Deadline Risk: ${t.title}`,
        evidence: `Due on ${t.due_date} (${(t.amount_minor / 100).toLocaleString()} ${baseCurrency}). Monthly closing balance is negative (${(period.closingBalanceMinor / 100).toLocaleString()} ${baseCurrency}).`,
        affectedDate: t.due_date,
        explanation: 'The projected funds available in this month are insufficient to meet this tuition installment.',
        recommendedAction: 'Reallocate available funds before the tuition due date or request an installment payment plan from your university.',
      });
      break; // Report the earliest at-risk tuition
    }
  }

  // 3. Low Reserve Warning
  if (forecast.firstLowReserveDate && (!forecast.firstShortageDate || forecast.firstLowReserveDate < forecast.firstShortageDate)) {
    risks.push({
      id: 'risk-reserve',
      type: 'low_reserve_warning',
      severity: 'medium',
      title: 'Emergency Reserve Depletion',
      evidence: `Projected balance drops below ${reserveThreshold / 100} ${baseCurrency} in ${forecast.firstLowReserveDate}. Lowest balance: ${(forecast.lowestProjectedBalanceMinor / 100).toLocaleString()} ${baseCurrency}.`,
      affectedDate: forecast.firstLowReserveDate,
      explanation: 'Your balance will drop below your configured safety buffer, leaving little cushion for emergency medical, flight, or deposit costs.',
      recommendedAction: 'Set aside an emergency cash buffer before departure to avoid running out of liquidity.',
    });
  }

  // 4. Heavy Dependence on Pending Funding
  if (gapResult.pendingFundingMinor > 0) {
    const totalPotentialResources = gapResult.totalConfirmedResourcesMinor + gapResult.pendingFundingMinor;
    const pendingRatio = totalPotentialResources > 0 ? gapResult.pendingFundingMinor / totalPotentialResources : 0;

    if (pendingRatio > 0.25 || gapResult.fundingGapMinor > 0) {
      risks.push({
        id: 'risk-pending-reliance',
        type: 'pending_funding_reliance',
        severity: gapResult.fundingGapMinor > 0 ? 'high' : 'medium',
        title: 'Unconfirmed Funding Exposure',
        evidence: `${(gapResult.pendingFundingMinor / 100).toLocaleString()} ${baseCurrency} in funding is currently pending confirmation (${Math.round(pendingRatio * 100)}% of total potential funding).`,
        explanation: 'Pending scholarships or grants cannot be guaranteed. If delayed or rejected, this creates an immediate funding deficit.',
        recommendedAction: 'Contact the scholarship committee to confirm disbursement timing, or prepare a backup family/savings contingency.',
      });
    }
  }

  // 5. Expense Concentration
  let totalTuitionMinor = 0;
  for (const ob of input.obligations) {
    if (ob.category === 'tuition' && ob.status !== 'cancelled') {
      const conv = convertCurrency(ob.amount_minor, ob.currency, baseCurrency);
      totalTuitionMinor += conv.targetAmountMinor;
    }
  }
  if (gapResult.eligibleUnpaidObligationsMinor > 0 && totalTuitionMinor / gapResult.eligibleUnpaidObligationsMinor > 0.45) {
    risks.push({
      id: 'risk-concentration',
      type: 'expense_concentration',
      severity: 'low',
      title: 'Tuition Concentration',
      evidence: `Tuition represents ${Math.round((totalTuitionMinor / gapResult.eligibleUnpaidObligationsMinor) * 100)}% of total planned expenses.`,
      explanation: 'A significant portion of your financial plan is locked into fixed tuition installments, leaving less flexibility for flexible budget cuts.',
      recommendedAction: 'Ensure tuition due dates are firmly marked and protected from general spending.',
    });
  }

  return risks;
}

/**
 * Pure function: Simulates a What-If scenario against a baseline plan.
 * Deeply isolates simulation data: Baseline records are completely untouched.
 */
export function simulateScenario(
  baseline: FinancialPlanInput,
  assumptions: ScenarioAssumptions
): ScenarioResult {
  // Deep clone baseline to prevent any mutation
  const simulatedInput: FinancialPlanInput = {
    baseCurrency: baseline.baseCurrency,
    planStartDate: baseline.planStartDate,
    planEndDate: baseline.planEndDate,
    reserveThresholdMinor: baseline.reserveThresholdMinor,
    accounts: baseline.accounts.map((a) => ({ ...a })),
    fundingSources: baseline.fundingSources.map((f) => ({ ...f })),
    obligations: baseline.obligations.map((o) => ({ ...o })),
  };

  const keyDrivers: string[] = [];
  const affectedObligations: string[] = [];

  // Apply Rent Increase
  if (assumptions.rentIncreasePercent && assumptions.rentIncreasePercent !== 0) {
    const factor = 1 + assumptions.rentIncreasePercent / 100;
    for (const ob of simulatedInput.obligations) {
      if (ob.category === 'housing' && ob.status !== 'cancelled') {
        ob.amount_minor = Math.round(ob.amount_minor * factor);
        affectedObligations.push(ob.id);
      }
    }
    keyDrivers.push(`Housing expenses increased by ${assumptions.rentIncreasePercent}%`);
  }

  // Apply General Living Cost Increase (Food, Transportation, Personal)
  if (assumptions.livingCostIncreasePercent && assumptions.livingCostIncreasePercent !== 0) {
    const factor = 1 + assumptions.livingCostIncreasePercent / 100;
    for (const ob of simulatedInput.obligations) {
      if (['food', 'transportation', 'personal', 'other'].includes(ob.category) && ob.status !== 'cancelled') {
        ob.amount_minor = Math.round(ob.amount_minor * factor);
        if (!affectedObligations.includes(ob.id)) affectedObligations.push(ob.id);
      }
    }
    keyDrivers.push(`Daily living costs increased by ${assumptions.livingCostIncreasePercent}%`);
  }

  // Apply Tuition Adjustment
  if (assumptions.tuitionAdjustmentMinor && assumptions.tuitionAdjustmentMinor !== 0) {
    const tuitionObs = simulatedInput.obligations.filter((o) => o.category === 'tuition' && o.status !== 'cancelled');
    if (tuitionObs.length > 0) {
      // Distribute adjustment equally among active tuition obligations
      const perItem = Math.round(assumptions.tuitionAdjustmentMinor / tuitionObs.length);
      for (const t of tuitionObs) {
        t.amount_minor = Math.max(0, t.amount_minor + perItem);
        if (!affectedObligations.includes(t.id)) affectedObligations.push(t.id);
      }
      keyDrivers.push(`Tuition adjusted by ${assumptions.tuitionAdjustmentMinor / 100} ${baseline.baseCurrency}`);
    }
  }

  // Apply Scholarship Delay
  if (assumptions.scholarshipDelayMonths && assumptions.scholarshipDelayMonths > 0) {
    for (const fund of simulatedInput.fundingSources) {
      if (fund.source_type === 'scholarship' && fund.expected_date && fund.status !== 'cancelled') {
        const d = new Date(fund.expected_date);
        d.setMonth(d.getMonth() + assumptions.scholarshipDelayMonths);
        fund.expected_date = d.toISOString().split('T')[0];
        keyDrivers.push(`Scholarship "${fund.name}" delayed by ${assumptions.scholarshipDelayMonths} month(s) to ${fund.expected_date}`);
      }
    }
  }

  // Apply Scholarship Cancellation
  if (assumptions.scholarshipCancelled) {
    for (const fund of simulatedInput.fundingSources) {
      if (fund.source_type === 'scholarship') {
        fund.status = 'cancelled';
      }
    }
    keyDrivers.push('Scholarship funding cancelled in simulation');
  }

  // Apply Part-Time Monthly Job Income
  if (assumptions.partTimeMonthlyIncomeMinor && assumptions.partTimeMonthlyIncomeMinor > 0) {
    const start = new Date(simulatedInput.planStartDate);
    const end = new Date(simulatedInput.planEndDate);
    const current = new Date(start.getFullYear(), start.getMonth() + 1, 15);
    let jobMonthIndex = 1;

    while (current <= end) {
      simulatedInput.fundingSources.push({
        id: `sim-part-time-${jobMonthIndex}`,
        user_id: 'simulation',
        name: `Part-Time Job Income (Month ${jobMonthIndex})`,
        amount_minor: assumptions.partTimeMonthlyIncomeMinor,
        currency: baseline.baseCurrency,
        status: 'confirmed',
        source_type: 'part_time_job',
        expected_date: current.toISOString().split('T')[0],
      });
      jobMonthIndex++;
      current.setMonth(current.getMonth() + 1);
    }
    keyDrivers.push(
      `Part-time job added: ${assumptions.partTimeMonthlyIncomeMinor / 100} ${baseline.baseCurrency}/month across ${jobMonthIndex - 1} months`
    );
  }

  // Calculate baseline & scenario results
  const baselineGap = calculateFundingGap(baseline);
  const baselineForecast = forecastCashFlow(baseline);

  const scenarioGap = calculateFundingGap(simulatedInput);
  const scenarioForecast = forecastCashFlow(simulatedInput);

  return {
    baselineEndingBalanceMinor: baselineForecast.endingBalanceMinor,
    scenarioEndingBalanceMinor: scenarioForecast.endingBalanceMinor,
    balanceDifferenceMinor: scenarioForecast.endingBalanceMinor - baselineForecast.endingBalanceMinor,
    baselineFundingGapMinor: baselineGap.fundingGapMinor,
    scenarioFundingGapMinor: scenarioGap.fundingGapMinor,
    gapChangeMinor: scenarioGap.fundingGapMinor - baselineGap.fundingGapMinor,
    lowestProjectedBalanceMinor: scenarioForecast.lowestProjectedBalanceMinor,
    firstShortageDate: scenarioForecast.firstShortageDate,
    affectedObligations,
    keyDrivers,
  };
}
