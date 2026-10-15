# TuitionShield AI — Core Algorithms & Calculation Engine

**Module:** Deterministic Financial Engine  
**Implementation File:** `src/features/financial-engine/engine.ts`  
**Currency File:** `src/features/financial-engine/currency.ts`  
**Test Suite:** `src/test/financial-engine.test.ts` (15/15 Tests Passing)  
**Status:** Implemented, Fully Tested, and Verified  

---

## 1. Principles of the Financial Engine

1. **Integer Minor-Unit Representation:** All authoritative monetary calculations use integer minor units (cents / pence / fen) to eliminate binary floating-point rounding errors. For EUR, USD, CNY, and GBP, 1 unit = 100 minor units. For JPY, 1 unit = 1 minor unit.
2. **Separation of Fact vs. Expectation:** Pending scholarships and unconfirmed family support are strictly segregated from confirmed resources. They are displayed for planning transparency but are never added to the confirmed funding total.
3. **Double-Counting Prevention:** Available starting balances represent cash on hand at the start date. They are never re-counted as future inflows. Already-paid expenses are tracked for history but are never subtracted again as future outflows.
4. **Chronological Time-Awareness:** Aggregate funding gap does not prove solvent timing. The dated cash-flow engine evaluates liquidity on every date to identify cash-flow shortages that occur before delayed funding arrives.
5. **Scenario Isolation:** What-if simulations operate on deep copies and never mutate baseline user data.

---

## 2. Core Mathematical Formulations

### 2.1 Confirmed Resources ($F_{\text{confirmed}}$)
Let $B_0$ be the verified available starting funds in declared accounts. Let $I_j$ be confirmed future inflows arriving within the plan horizon $[T_{\text{start}}, T_{\text{end}}]$:

$$F_{\text{confirmed}} = B_0 + \sum_{j=1}^{m} I_j \quad \text{where } \text{status}(I_j) \in \{\text{confirmed}, \text{received}\}$$

Pending and cancelled funding sources are excluded:
$$\text{Pending Funding} = \sum_{k=1}^{p} I_k \quad \text{where } \text{status}(I_k) = \text{pending}$$

### 2.2 Eligible Planned Costs ($E_{\text{total}}$)
Let $E_i$ be eligible upcoming obligations due within $[T_{\text{start}}, T_{\text{end}}]$:

$$E_{\text{total}} = \sum_{i=1}^{n} E_i \quad \text{where } \text{status}(E_i) \in \{\text{planned}, \text{due}, \text{overdue}\}$$

Obligations marked `paid` or `cancelled` are excluded from future outflows.

### 2.3 Funding Gap ($G$) & Projected Surplus ($S$)
$$G = \max(0, E_{\text{total}} - F_{\text{confirmed}})$$
$$S = \max(0, F_{\text{confirmed}} - E_{\text{total}})$$

#### Competition Baseline Benchmark:
- Starting Funds ($B_0$): €8,000 (800,000 cents)
- Annual Tuition: €4,000 (400,000 cents)
- Annual Living Costs: €5,500 (550,000 cents)
- Other Annual Costs: €1,000 (100,000 cents)
- Confirmed Inflows: €0
- Total Planned Costs ($E_{\text{total}}$): €10,500
- **Funding Gap ($G$): €2,500 (250,000 cents)**
- Pending DAAD Scholarship: €2,000 (tracked separately)

### 2.4 Dated Cash-Flow Forecast
For each discrete monthly period $t \in [1, N]$:
$$B_t = B_{t-1} + \text{Inflows}_t - \text{Outflows}_t$$
Where:
- $B_t$ is the closing balance for month $t$ (which becomes month $t+1$'s opening balance).
- $\text{Inflows}_t$ are confirmed inflows with expected dates in month $t$.
- $\text{Outflows}_t$ are unpaid obligations due in month $t$.

The engine computes:
- $\text{Lowest Balance} = \min_{t} (B_t)$
- $\text{First Shortage Date} = \min \{ t \mid B_t < 0 \}$
- $\text{First Low Reserve Date} = \min \{ t \mid B_t < R \}$ (where $R$ is the configurable reserve threshold, e.g., €1,000).

---

## 3. Pure Functions Reference

### `calculateFundingGap(input: FinancialPlanInput): FundingGapResult`
- Computes aggregate confirmed starting balance, confirmed inflows, eligible costs, funding gap, and surplus.
- Outputs structured warnings regarding pending scholarships or overdue payments.

### `forecastCashFlow(input: FinancialPlanInput): CashFlowForecast`
- Progresses chronologically month-by-month through the plan horizon.
- Produces period-by-period opening balances, itemized inflows and outflows, net flow, and closing balance.

### `detectFinancialRisks(input, gapResult, forecast): FinancialRisk[]`
- Evaluates factual triggers:
  1. `projected_deficit`: Closing balance drops below 0.
  2. `tuition_deadline_risk`: Projected monthly balance insufficient to cover upcoming tuition due date.
  3. `low_reserve_warning`: Balance breaches safety buffer.
  4. `pending_funding_reliance`: Over 25% of funding relies on unconfirmed scholarships.
  5. `expense_concentration`: Fixed tuition constitutes over 45% of total budget.

### `simulateScenario(baseline, assumptions): ScenarioResult`
- Clones baseline input deeply.
- Applies rent increases, inflation, tuition changes, scholarship delays, cancellations, or part-time job earnings.
- Computes variance against baseline without altering baseline records.

### `convertCurrency(amountMinor, fromCurrency, toCurrency, customRate?): CurrencyConversionResult`
- Converts currencies using integer-safe arithmetic.
- Enforces exchange rate positivity ($r > 0$) and returns documented rate metadata.

---

## 4. Test Verification Results

All 15 test cases in `src/test/financial-engine.test.ts` pass:
- **F-01 Exact Funding Coverage:** €8,000 funds vs €8,000 costs $\rightarrow$ Gap = €0.
- **F-02 Baseline Shortfall:** €8,000 funds vs €10,500 costs $\rightarrow$ Gap = €2,500.
- **F-03 Funding Surplus:** €12,000 funds vs €10,500 costs $\rightarrow$ Surplus = €1,500.
- **F-04 Pending Scholarship Exclusion:** €2,000 pending grant does not reduce confirmed gap.
- **F-05 Cancelled Obligation:** Excluded from planned costs.
- **F-06 Paid Obligation:** Not double-counted as future outflow.
- **Scenario Rent +15%:** Baseline rent remains completely unchanged; scenario gap increases by exactly €630.
- **Part-Time Income Simulation:** Reduces funding gap reproducibly.
- **Invalid Rate Rejection:** Negative or zero rates throw validation errors.
