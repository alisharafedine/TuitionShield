import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { forecastCashFlow } from '../financial-engine/engine';
import { formatMoney, toMajorUnits } from '../financial-engine/currency';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const CashFlowPage: React.FC = () => {
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

  const forecast = forecastCashFlow(planInput);

  const barChartData = forecast.periods.map((p) => ({
    name: p.label,
    Inflows: toMajorUnits(p.inflowsMinor, baseCurrency),
    Outflows: toMajorUnits(p.outflowsMinor, baseCurrency),
    ClosingBalance: toMajorUnits(p.closingBalanceMinor, baseCurrency),
    NetCashFlow: toMajorUnits(p.netCashFlowMinor, baseCurrency),
  }));

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lowest Projected Balance"
          value={formatMoney(forecast.lowestProjectedBalanceMinor, baseCurrency)}
          subValue={forecast.lowestBalanceDate ? `Occurs in ${forecast.lowestBalanceDate}` : 'Baseline stable'}
          tooltipText="The lowest point your available bank balance will reach across your 12-month study program."
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          trend={forecast.lowestProjectedBalanceMinor < 0 ? 'negative' : 'warning'}
          trendText={forecast.lowestProjectedBalanceMinor < 0 ? 'Projected Deficit' : 'Reserve Warning'}
        />

        <StatCard
          title="First Projected Shortfall"
          value={forecast.firstShortageDate || 'None'}
          subValue={forecast.firstShortageDate ? 'Action needed prior to this date' : 'Full 12-month runway'}
          tooltipText="The chronological month when your balance drops below zero or the minimum reserve cushion."
          icon={<Calendar className="w-4 h-4 text-blue-600" />}
          trend={forecast.firstShortageDate ? 'negative' : 'positive'}
          trendText={forecast.firstShortageDate ? 'Shortfall Date' : 'No Shortage'}
        />

        <StatCard
          title="Total Planned Inflows"
          value={formatMoney(forecast.totalProjectedInflowsMinor, baseCurrency)}
          subValue="Confirmed scholarships & earned income"
          tooltipText="Sum of all eligible confirmed income across the 12-month forecasting horizon."
          icon={<ArrowUpRight className="w-4 h-4 text-emerald-600" />}
          trend="positive"
          trendText="Confirmed Resources"
        />

        <StatCard
          title="Total Planned Outflows"
          value={formatMoney(forecast.totalProjectedOutflowsMinor, baseCurrency)}
          subValue="Tuition installments & living costs"
          tooltipText="Sum of all planned educational and subsistence expenses across the 12 months."
          icon={<ArrowDownRight className="w-4 h-4 text-slate-500" />}
          trend="neutral"
          trendText="12-Month Outflows"
        />
      </div>

      {/* Bar Chart: Monthly Inflows vs. Outflows */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Monthly Cash Movement (Inflows vs. Outflows)</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic monthly tracking showing large tuition disbursements and living expenses
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `€${val}`}
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
                  formatter={(value: any, name: any) => [`€${Number(value).toLocaleString()}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Inflows" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outflows" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Monthly Cash-Flow Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Monthly Cash-Flow Ledger</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Opening Balance + Inflows − Outflows = Projected Closing Balance
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3.5">Month</th>
                  <th className="p-3.5 text-right">Opening Balance</th>
                  <th className="p-3.5 text-right">Inflows</th>
                  <th className="p-3.5 text-right">Outflows</th>
                  <th className="p-3.5 text-right">Net Flow</th>
                  <th className="p-3.5 text-right">Closing Balance</th>
                  <th className="p-3.5 text-center">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {forecast.periods.map((p) => (
                  <tr
                    key={p.periodKey}
                    className={`hover:bg-slate-50/70 ${
                      p.isDeficit ? 'bg-rose-50/40' : p.isBelowReserve ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="p-3.5 font-semibold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {p.label}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {formatMoney(p.openingBalanceMinor, baseCurrency)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-700 font-medium">
                      {p.inflowsMinor > 0 ? `+${formatMoney(p.inflowsMinor, baseCurrency)}` : '€0.00'}
                    </td>
                    <td className="p-3.5 text-right font-mono text-rose-700 font-medium">
                      {p.outflowsMinor > 0 ? `-${formatMoney(p.outflowsMinor, baseCurrency)}` : '€0.00'}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      <span
                        className={
                          p.netCashFlowMinor >= 0 ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'
                        }
                      >
                        {p.netCashFlowMinor >= 0 ? '+' : ''}
                        {formatMoney(p.netCashFlowMinor, baseCurrency)}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatMoney(p.closingBalanceMinor, baseCurrency)}
                    </td>
                    <td className="p-3.5 text-center">
                      {p.isDeficit ? (
                        <Badge status="deficit">DEFICIT</Badge>
                      ) : p.isBelowReserve ? (
                        <Badge status="warning">BELOW BUFFER</Badge>
                      ) : (
                        <Badge status="confirmed">HEALTHY</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
