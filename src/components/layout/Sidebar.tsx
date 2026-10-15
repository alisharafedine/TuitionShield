import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Layers,
  Wallet,
  GraduationCap,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  CreditCard,
  History,
  Settings,
  RotateCcw,
  LogIn,
  LogOut,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { calculateFundingGap } from '../../features/financial-engine/engine';
import { formatMoney } from '../../features/financial-engine/currency';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { AuthModal } from '../auth/AuthModal';

interface SidebarProps {
  onResetDemo?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onResetDemo,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, signOut } = useAuth();
  const { info } = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const state = localDb.getState();
  const planInput = {
    baseCurrency: state.profile.home_currency,
    planStartDate: '2026-10-01',
    planEndDate: '2027-09-30',
    accounts: state.accounts,
    fundingSources: state.fundingSources,
    obligations: state.obligations,
  };
  const gapResult = calculateFundingGap(planInput);

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { name: 'Financial Overview', path: '/', icon: LayoutDashboard },
        { name: 'Setup Portal', path: '/portal', icon: Layers, highlight: true },
        { name: 'Accounts & Cash', path: '/finances', icon: Wallet },
        { name: 'Funding & Grants', path: '/funding', icon: GraduationCap },
      ],
    },
    {
      title: 'INTELLIGENCE & AI',
      items: [
        { name: 'Cash Flow Forecast', path: '/cash-flow', icon: TrendingUp },
        { name: 'What-If Simulator', path: '/scenarios', icon: SlidersHorizontal },
        { name: 'AI Copilot', path: '/ai-copilot', icon: Sparkles, badge: 'DeepSeek' },
      ],
    },
    {
      title: 'SECURITY & LEDGER',
      items: [
        {
          name: 'Sandbox Payments',
          path: '/payments',
          icon: CreditCard,
          badge: state.paymentProposals.filter((p) => p.status === 'awaiting_approval').length
            ? `${state.paymentProposals.filter((p) => p.status === 'awaiting_approval').length}`
            : undefined,
        },
        { name: 'Activity Audit Log', path: '/audit', icon: History },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  const handleReset = () => {
    localDb.resetToDemo();
    if (onResetDemo) onResetDemo();
    info('Demonstration Reset', 'Loaded official Shenzhen FinTech Competition baseline scenario (€8,000 funds, €10,500 costs).');
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                TuitionShield <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono font-bold">AI</span>
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Student Financial Co-Pilot</p>
            </div>
          </div>
        </div>

        {/* Compact Student Card */}
        <div className="p-3 mx-3 mt-3 rounded-2xl bg-blue-50/60 border border-blue-100/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 truncate">{state.profile.display_name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 font-mono font-medium border border-blue-200/50">
              {state.profile.home_currency}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{state.profile.university}</p>

          <div className="mt-2.5 pt-2 border-t border-blue-200/40 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">Funding Gap</span>
            <span
              className={`text-xs font-bold font-mono ${
                gapResult.fundingGapMinor > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {formatMoney(gapResult.fundingGapMinor, state.profile.home_currency)}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {navSections.map((sec) => (
            <div key={sec.title}>
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 mb-1">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item: any) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-sm'
                            : item.highlight
                            ? 'bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/70'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-medium">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Profile & Session */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {user ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="min-w-0 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-700 font-medium truncate max-w-[120px]">{user.email}</span>
              </div>
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connect Supabase Account</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="w-full py-1.5 px-3 rounded-lg text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Demo Baseline</span>
          </button>
        </div>
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
