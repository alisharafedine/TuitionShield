import React, { useState } from 'react';
import {
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { simulateScenario } from '../financial-engine/engine';
import { formatMoney } from '../financial-engine/currency';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { ScenarioAssumptions } from '../../types';

export const ScenariosPage: React.FC = () => {
  const { success, info } = useToast();
  const [state, setState] = useState(localDb.getState());
  const baseCurrency = state.profile.home_currency;

  const baselineInput = {
    baseCurrency,
    planStartDate: '2026-10-01',
    planEndDate: '2027-09-30',
    reserveThresholdMinor: state.profile.reserve_threshold_minor,
    accounts: state.accounts,
    fundingSources: state.fundingSources,
    obligations: state.obligations,
  };

  // Scenario parameter controls state
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>({
    rentIncreasePercent: 15,
    livingCostIncreasePercent: 0,
    tuitionAdjustmentMinor: 0,
    scholarshipDelayMonths: 0,
    scholarshipCancelled: false,
    partTimeMonthlyIncomeMinor: 0,
  });

  const [scenarioName, setScenarioName] = useState('Rent +15% Stress Test');

  // Compute live scenario result
  const result = simulateScenario(baselineInput, assumptions);

  const handleResetSliders = () => {
    setAssumptions({
      rentIncreasePercent: 0,
      livingCostIncreasePercent: 0,
      tuitionAdjustmentMinor: 0,
      scholarshipDelayMonths: 0,
      scholarshipCancelled: false,
      partTimeMonthlyIncomeMinor: 0,
    });
    info('Sliders Reset', 'Assumptions restored to baseline values.');
  };

  const handleSaveScenario = () => {
    const run = localDb.addScenarioRun({
      name: scenarioName || `Scenario (${new Date().toLocaleDateString()})`,
      baseline_reference: 'current_plan_v1',
      assumptions,
      results: result,
      currency: baseCurrency,
    });
    setState({ ...localDb.getState() });
    success('Scenario Saved', `Saved "${run.name}" for future comparative analysis.`);
  };

  const handleDeleteSaved = (id: string) => {
    localDb.deleteScenarioRun(id);
    setState({ ...localDb.getState() });
    success('Saved Scenario Removed');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-300 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900">What-If Financial Stress Simulator</h4>
            <p className="text-slate-400 mt-0.5">
              Simulate hypothetical cross-border inflation, rent jumps, or delayed DAAD scholarship funding without altering your actual financial records. All results are deterministic.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleResetSliders} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
          Reset Parameters
        </Button>
      </div>

      {/* Main Grid: Controls vs Live Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Assumption Sliders & Inputs (5 Cols) */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Simulation Assumptions</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Adjust variables to stress test your funding plan</p>
          </CardHeader>
          <CardContent className="space-y-5 text-xs">
            {/* Rent Increase Slider */}
            <div>
              <div className="flex justify-between font-medium text-slate-200 mb-1.5">
                <span>Housing / Rent Increase</span>
                <span className="font-mono text-emerald-400">+{assumptions.rentIncreasePercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={assumptions.rentIncreasePercent}
                onChange={(e) => setAssumptions({ ...assumptions, rentIncreasePercent: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0% (Baseline)</span>
                <span>+25%</span>
                <span>+50% (Max)</span>
              </div>
            </div>

            {/* Living Expenses Inflation */}
            <div>
              <div className="flex justify-between font-medium text-slate-200 mb-1.5">
                <span>Daily Living Costs Inflation</span>
                <span className="font-mono text-emerald-400">+{assumptions.livingCostIncreasePercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={assumptions.livingCostIncreasePercent}
                onChange={(e) => setAssumptions({ ...assumptions, livingCostIncreasePercent: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0%</span>
                <span>+15%</span>
                <span>+30%</span>
              </div>
            </div>

            {/* Tuition Hike */}
            <div>
              <div className="flex justify-between font-medium text-slate-200 mb-1.5">
                <span>Tuition Adjustment</span>
                <span className="font-mono text-slate-900">
                  {assumptions.tuitionAdjustmentMinor! >= 0 ? '+' : ''}
                  {formatMoney(assumptions.tuitionAdjustmentMinor || 0, baseCurrency)}
                </span>
              </div>
              <select
                value={assumptions.tuitionAdjustmentMinor || 0}
                onChange={(e) => setAssumptions({ ...assumptions, tuitionAdjustmentMinor: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="0">No tuition change (€0.00)</option>
                <option value="50000">+€500 Tuition Hike</option>
                <option value="100000">+€1,000 Tuition Hike</option>
                <option value="-50000">-€500 Tuition Fee Waiver</option>
              </select>
            </div>

            {/* Scholarship Delay */}
            <div>
              <div className="flex justify-between font-medium text-slate-200 mb-1.5">
                <span>Scholarship Disbursement Delay</span>
                <span className="font-mono text-amber-400">
                  {assumptions.scholarshipDelayMonths ? `Delayed by ${assumptions.scholarshipDelayMonths} mo` : 'On Time'}
                </span>
              </div>
              <select
                value={assumptions.scholarshipDelayMonths || 0}
                onChange={(e) => setAssumptions({ ...assumptions, scholarshipDelayMonths: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="0">Expected on scheduled date</option>
                <option value="1">Delayed by 1 Month</option>
                <option value="2">Delayed by 2 Months</option>
                <option value="3">Delayed by 3 Months</option>
              </select>
            </div>

            {/* Part-Time Employment Income */}
            <div>
              <div className="flex justify-between font-medium text-slate-200 mb-1.5">
                <span>Student Part-Time Employment (Minijob)</span>
                <span className="font-mono text-emerald-400">
                  {assumptions.partTimeMonthlyIncomeMinor ? `+${formatMoney(assumptions.partTimeMonthlyIncomeMinor, baseCurrency)}/mo` : 'None'}
                </span>
              </div>
              <select
                value={assumptions.partTimeMonthlyIncomeMinor || 0}
                onChange={(e) => setAssumptions({ ...assumptions, partTimeMonthlyIncomeMinor: Number(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="0">No part-time job</option>
                <option value="45000">+€450 / month (German Minijob)</option>
                <option value="52000">+€520 / month (Expanded Minijob)</option>
                <option value="80000">+€800 / month (Working Student)</option>
              </select>
            </div>

            {/* Save Scenario Form */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <label className="block text-slate-400 text-[11px] font-medium">Scenario Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. High Inflation + Delayed DAAD"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
                <Button size="sm" onClick={handleSaveScenario} leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Scenario vs Baseline Comparison (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Key Metric Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Scenario Funding Gap"
              value={formatMoney(result.scenarioFundingGapMinor, baseCurrency)}
              subValue={`Baseline: ${formatMoney(result.baselineFundingGapMinor, baseCurrency)}`}
              tooltipText="Recalculated funding gap with your simulated assumptions applied."
              icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
              trend={result.gapChangeMinor > 0 ? 'negative' : result.gapChangeMinor < 0 ? 'positive' : 'neutral'}
              trendText={
                result.gapChangeMinor > 0
                  ? `+${formatMoney(result.gapChangeMinor, baseCurrency)} Gap Increase`
                  : result.gapChangeMinor < 0
                  ? `${formatMoney(result.gapChangeMinor, baseCurrency)} Gap Reduction`
                  : 'Same as Baseline'
              }
            />

            <StatCard
              title="Projected Ending Balance"
              value={formatMoney(result.scenarioEndingBalanceMinor, baseCurrency)}
              subValue={`Baseline: ${formatMoney(result.baselineEndingBalanceMinor, baseCurrency)}`}
              tooltipText="Ending liquid balance at the close of 12 months in this simulation."
              icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
              trend={result.balanceDifferenceMinor >= 0 ? 'positive' : 'negative'}
              trendText={`${result.balanceDifferenceMinor >= 0 ? '+' : ''}${formatMoney(result.balanceDifferenceMinor, baseCurrency)}`}
            />

            <StatCard
              title="First Deficit Date"
              value={result.firstShortageDate || 'None'}
              subValue="Earliest shortage"
              tooltipText="Date your projected balance drops below zero in this simulation."
              icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
              trend={result.firstShortageDate ? 'negative' : 'positive'}
              trendText={result.firstShortageDate ? 'Liquidity Shortage' : 'Solvent'}
            />
          </div>

          {/* Key Drivers Explanation */}
          <Card>
            <CardHeader>
              <CardTitle>Simulation Impact & Key Drivers</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Deterministic decomposition of changes</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
                <span className="font-semibold text-slate-200">Active Simulation Drivers:</span>
                {result.keyDrivers.length === 0 ? (
                  <p className="text-slate-400">No adjustments active. Scenario is identical to baseline.</p>
                ) : (
                  <ul className="space-y-1 text-slate-300">
                    {result.keyDrivers.map((d, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Side-by-side Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-400 font-medium">
                    <tr>
                      <th className="p-3">Financial Metric</th>
                      <th className="p-3 text-right">Baseline Plan</th>
                      <th className="p-3 text-right">Scenario Plan</th>
                      <th className="p-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50 text-slate-200">
                    <tr>
                      <td className="p-3 font-medium">Funding Gap</td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {formatMoney(result.baselineFundingGapMinor, baseCurrency)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatMoney(result.scenarioFundingGapMinor, baseCurrency)}
                      </td>
                      <td className={`p-3 text-right font-mono font-semibold ${result.gapChangeMinor > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {result.gapChangeMinor > 0 ? '+' : ''}
                        {formatMoney(result.gapChangeMinor, baseCurrency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Ending Balance</td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {formatMoney(result.baselineEndingBalanceMinor, baseCurrency)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatMoney(result.scenarioEndingBalanceMinor, baseCurrency)}
                      </td>
                      <td className={`p-3 text-right font-mono font-semibold ${result.balanceDifferenceMinor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.balanceDifferenceMinor >= 0 ? '+' : ''}
                        {formatMoney(result.balanceDifferenceMinor, baseCurrency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Saved Scenarios List */}
          {state.scenarioRuns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Saved Scenarios ({state.scenarioRuns.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.scenarioRuns.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <div>
                      <h5 className="font-semibold text-slate-900">{s.name}</h5>
                      <p className="text-[11px] text-slate-400">
                        Gap: {formatMoney(s.results.scenarioFundingGapMinor, s.currency)} (
                        {s.results.gapChangeMinor > 0 ? '+' : ''}
                        {formatMoney(s.results.gapChangeMinor, s.currency)})
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSaved(s.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
