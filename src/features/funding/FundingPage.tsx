import React from 'react';
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { formatMoney } from '../financial-engine/currency';
import { calculateFundingGap } from '../financial-engine/engine';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';

export const FundingPage: React.FC = () => {
  const state = localDb.getState();
  const baseCurrency = state.profile.home_currency;

  const planInput = {
    baseCurrency,
    planStartDate: '2026-10-01',
    planEndDate: '2027-09-30',
    accounts: state.accounts,
    fundingSources: state.fundingSources,
    obligations: state.obligations,
  };

  const gapResult = calculateFundingGap(planInput);

  // Group funding by month
  const fundingByMonth: Record<string, { confirmed: number; pending: number }> = {};
  state.fundingSources
    .filter((f) => f.status !== 'cancelled' && f.expected_date)
    .forEach((f) => {
      const monthKey = f.expected_date!.substring(0, 7); // 'YYYY-MM'
      if (!fundingByMonth[monthKey]) {
        fundingByMonth[monthKey] = { confirmed: 0, pending: 0 };
      }
      if (f.status === 'confirmed' || f.status === 'received') {
        fundingByMonth[monthKey].confirmed += f.amount_minor;
      } else if (f.status === 'pending') {
        fundingByMonth[monthKey].pending += f.amount_minor;
      }
    });

  return (
    <div className="space-y-6">
      {/* Educational Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-300 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-slate-900">Understanding Confirmed vs. Pending Funding</h4>
          <p className="text-slate-400 mt-1">
            In international student financial management, <strong>Pending Funding</strong> (such as an unconfirmed DAAD scholarship or preliminary grant) carries verification risk. TuitionShield AI strictly excludes pending awards from confirmed resources to safeguard you from tuition payment default.
          </p>
        </div>
      </div>

      {/* Top Funding Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Confirmed Funding"
          value={formatMoney(gapResult.eligibleConfirmedInflowsMinor, baseCurrency)}
          subValue="Guaranteed future cash inflows"
          tooltipText="Only funding marked as Confirmed or Received with documented scholarship letters."
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          trend="positive"
          trendText="Safe Cash Inflows"
        />

        <StatCard
          title="Pending Scholarships"
          value={formatMoney(gapResult.pendingFundingMinor, baseCurrency)}
          subValue="Under committee evaluation"
          tooltipText="Awards applied for but not yet formally approved. Cannot be used to meet visa deposit or tuition deadlines."
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          trend="warning"
          trendText="Not Guaranteed"
        />

        <StatCard
          title="Total Planned Costs"
          value={formatMoney(gapResult.eligibleUnpaidObligationsMinor, baseCurrency)}
          subValue="Tuition, rent & living costs"
          tooltipText="Combined required financial outlay over your 12-month study abroad horizon."
          icon={<GraduationCap className="w-4 h-4 text-blue-400" />}
          trend="neutral"
        />

        <StatCard
          title="Remaining Needed"
          value={formatMoney(gapResult.fundingGapMinor, baseCurrency)}
          subValue={gapResult.isFullyFunded ? 'Plan is fully funded' : 'Uncovered balance shortfall'}
          tooltipText="Net deficit: Planned Costs minus (Starting Available Funds + Confirmed Inflows)."
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          trend={gapResult.fundingGapMinor > 0 ? 'negative' : 'positive'}
          trendText={gapResult.fundingGapMinor > 0 ? 'Shortfall Identified' : 'Fully Funded'}
        />
      </div>

      {/* Scholarship Details Table & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracked Scholarships List (Span 2) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tracked Scholarships & Grants</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Individual verification records and disbursement statuses</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.fundingSources.map((fund) => (
              <div
                key={fund.id}
                className="p-4 rounded-xl bg-white/60 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-600 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{fund.name}</h4>
                    <Badge status={fund.status}>{fund.status.toUpperCase()}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="capitalize">Type: {fund.source_type.replace('_', ' ')}</span>
                    {fund.expected_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Disbursement: {fund.expected_date}
                      </span>
                    )}
                  </div>
                  {fund.notes && <p className="text-[11px] text-slate-400 mt-1">{fund.notes}</p>}
                </div>

                <div className="sm:text-right">
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {formatMoney(fund.amount_minor, fund.currency)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {fund.status === 'confirmed' ? 'Counted in Resources' : 'Excluded from Confirmed Total'}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expected Disbursement by Month (Span 1) */}
        <Card>
          <CardHeader>
            <CardTitle>Disbursement Schedule</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Expected funding inflow timeline</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(fundingByMonth).length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">
                No dated funding disbursements scheduled.
              </div>
            ) : (
              Object.entries(fundingByMonth).map(([month, sums]) => (
                <div
                  key={month}
                  className="p-3 rounded-lg bg-white/60 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>{month}</span>
                    <span className="font-mono text-slate-900">
                      {formatMoney(sums.confirmed + sums.pending, baseCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Confirmed: {formatMoney(sums.confirmed, baseCurrency)}</span>
                    <span className="text-amber-400">Pending: {formatMoney(sums.pending, baseCurrency)}</span>
                  </div>
                </div>
              ))
            )}

            <div className="pt-3 border-t border-slate-200/60 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Concentration Risk:</span>
                <span className="font-semibold text-amber-400">High (1 Primary Grant)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Diversifying into part-time work or secondary university aid significantly lowers funding volatility.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
