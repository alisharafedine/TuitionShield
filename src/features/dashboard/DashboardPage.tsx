import React from 'react';
import {
  Wallet,
  TrendingDown,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { localDb } from '../../lib/storage/mock-db';
import {
  calculateFundingGap,
  forecastCashFlow,
  detectFinancialRisks,
} from '../financial-engine/engine';
import { formatMoney, toMajorUnits } from '../financial-engine/currency';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const state = localDb.getState();
  const baseCurrency = state.profile.home_currency;

  const planInput = {
    baseCurrency,
    planStartDate: '2026-10-01',
    planEndDate: '2027-09-30',
    reserveThresholdMinor: state.profile.reserve_threshold_minor,
    accounts: state.accounts,
    fundingSources: state.fundingSources,
    obligations: state.obligations,
  };

  const gapResult = calculateFundingGap(planInput);
  const forecast = forecastCashFlow(planInput);
  const risks = detectFinancialRisks(planInput, gapResult, forecast);

  // Next upcoming tuition payment
  const upcomingTuition = state.obligations
    .filter((o) => o.category === 'tuition' && o.status !== 'paid' && o.status !== 'cancelled')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  // Chart data formatting
  const chartData = forecast.periods.map((p) => ({
    name: p.label,
    balance: toMajorUnits(p.closingBalanceMinor, baseCurrency),
    inflows: toMajorUnits(p.inflowsMinor, baseCurrency),
    outflows: toMajorUnits(p.outflowsMinor, baseCurrency),
    reserve: toMajorUnits(planInput.reserveThresholdMinor, baseCurrency),
  }));

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  state.obligations
    .filter((o) => o.status !== 'cancelled')
    .forEach((o) => {
      categoryTotals[o.category] = (categoryTotals[o.category] || 0) + o.amount_minor;
    });

  const totalExpenseMinor = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const fundedPercent = Math.min(
    100,
    Math.round(
      (gapResult.availableStartingBalanceMinor / Math.max(1, gapResult.eligibleUnpaidObligationsMinor)) * 100
    )
  );

  return (
    <div className="space-y-6">
      {/* Small Clean Welcome Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Active Study Plan
            </span>
            <span className="text-xs text-slate-500">
              {state.profile.destination_country} • {state.profile.university}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {state.profile.display_name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Tracking <span className="font-medium text-slate-800">{state.profile.study_program}</span> finances.
            You have funded <strong className="text-blue-700 font-mono">{fundedPercent}%</strong> of your 12-month educational budget.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('/portal')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Setup Portal</span>
          </button>

          <button
            onClick={() => navigate('/ai-copilot')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-2 border border-slate-200 transition-all"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Ask DeepSeek</span>
          </button>

          <button
            onClick={() => navigate('/scenarios')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 border border-slate-200 shadow-sm transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span>What-If</span>
          </button>
        </div>
      </div>

      {/* 4 Consistent Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Available Funds */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Funds</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {formatMoney(gapResult.availableStartingBalanceMinor, baseCurrency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-700 font-medium">Declared Liquid Funds</span>
            <span>•</span>
            <span>{state.accounts.length} Accounts</span>
          </div>
        </div>

        {/* 2. Planned Expenses */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Planned Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {formatMoney(gapResult.eligibleUnpaidObligationsMinor, baseCurrency)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>Tuition, Rent & Living</span>
            <span>•</span>
            <span>{gapResult.obligationsCount} Obligations</span>
          </div>
        </div>

        {/* 3. Funding Gap */}
        <div
          className={`rounded-2xl p-5 shadow-sm border transition-all ${
            gapResult.fundingGapMinor > 0
              ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
              : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Funding Gap</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                gapResult.fundingGapMinor > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {gapResult.fundingGapMinor > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-2 ${
              gapResult.fundingGapMinor > 0 ? 'text-amber-800' : 'text-emerald-800'
            }`}
          >
            {formatMoney(gapResult.fundingGapMinor, baseCurrency)}
          </div>
          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
            {gapResult.fundingGapMinor > 0 ? (
              <span className="font-medium text-amber-700">Shortfall to be covered</span>
            ) : (
              <span className="font-medium text-emerald-700">100% Fully Covered</span>
            )}
            {gapResult.pendingFundingMinor > 0 && <span>(+€2,000 pending)</span>}
          </div>
        </div>

        {/* 4. Next Tuition Due */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Next Tuition Payment</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {upcomingTuition ? formatMoney(upcomingTuition.amount_minor, upcomingTuition.currency) : 'None'}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{upcomingTuition ? `Due: ${upcomingTuition.due_date}` : 'All Paid'}</span>
            <button
              onClick={() => navigate('/payments')}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
            >
              <span>Pay Sandbox</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Blue Cash-Flow Line Chart & Expense Allocation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Forecast Area Chart (Span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Cash Flow Forecast
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly projected balance with safety threshold ({formatMoney(planInput.reserveThresholdMinor, baseCurrency)})
              </p>
            </div>
            <button
              onClick={() => navigate('/cash-flow')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <span>View Full Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceBlueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '12px',
                    color: '#0F172A',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: any) => [`€${Number(value).toLocaleString()}`, 'Balance']}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#balanceBlueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Projected Balance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-500" /> €1,000 Safety Threshold
              </span>
            </div>
            <span>
              Lowest Point: <strong className="text-slate-800 font-mono">{formatMoney(forecast.lowestProjectedBalanceMinor, baseCurrency)}</strong>
            </span>
          </div>
        </div>

        {/* Expense Category Breakdown (Span 1) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Cost Distribution</h2>
                <p className="text-xs text-slate-500 mt-0.5">€10,500 annual expense breakdown</p>
              </div>
              <button
                onClick={() => navigate('/portal')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(categoryTotals).map(([cat, minor]) => {
                const pct = Math.round((minor / totalExpenseMinor) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize text-slate-700 font-medium">{cat}</span>
                      <span className="font-mono text-slate-500">
                        {formatMoney(minor, baseCurrency)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cat === 'tuition'
                            ? 'bg-blue-600'
                            : cat === 'housing'
                            ? 'bg-indigo-500'
                            : cat === 'food'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Tracked Obligations</span>
            <span className="font-mono text-slate-900 font-bold">{state.obligations.length} records</span>
          </div>
        </div>
      </div>

      {/* Financial Risks & Payment Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Radar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Risk Radar</h2>
                <p className="text-xs text-slate-500 mt-0.5">Automated deterministic health checks</p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                risks.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {risks.length} Detected
            </span>
          </div>

          <div className="space-y-3">
            {risks.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>No critical funding deficits or deadline shortfalls detected.</span>
              </div>
            ) : (
              risks.map((risk) => (
                <div
                  key={risk.id}
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    risk.severity === 'critical'
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${
                          risk.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      />
                      {risk.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                      {risk.severity}
                    </span>
                  </div>
                  <p className="text-slate-600">{risk.explanation}</p>
                  <div className="text-[11px] text-blue-700 font-medium">
                    Action: {risk.recommendedAction}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Payment Deadlines */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Payment Schedule</h2>
              <p className="text-xs text-slate-500 mt-0.5">Earliest upcoming academic commitments</p>
            </div>
            <button
              onClick={() => navigate('/payments')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Simulate</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {state.obligations
              .filter((o) => o.status !== 'cancelled')
              .slice(0, 4)
              .map((ob) => (
                <div
                  key={ob.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        ob.category === 'tuition'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">{ob.title}</h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Due: {ob.due_date} • <span className="capitalize">{ob.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 font-mono">
                      {formatMoney(ob.amount_minor, ob.currency)}
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                      {ob.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
