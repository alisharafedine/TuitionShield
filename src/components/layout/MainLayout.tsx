import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ShieldCheck } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Financial Overview';
      case '/portal':
        return 'Student Setup Portal';
      case '/finances':
        return 'Accounts & Available Funds';
      case '/funding':
        return 'Funding & Scholarships';
      case '/cash-flow':
        return 'Cash Flow Projections';
      case '/scenarios':
        return 'What-If Simulator';
      case '/ai-copilot':
        return 'DeepSeek AI Copilot';
      case '/payments':
        return 'Sandbox Tuition Payments';
      case '/audit':
        return 'Compliance & Audit Log';
      case '/settings':
        return 'Settings & Transparency';
      default:
        return 'TuitionShield AI';
    }
  };

  const handleResetDemo = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-700">
      <div className="flex flex-1">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onResetDemo={handleResetDemo}
        />

        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          <Header
            onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
            pageTitle={getPageTitle(location.pathname)}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto" key={refreshTrigger}>
            <Outlet />
          </main>

          {/* Clean Light Footer */}
          <footer className="py-4 px-6 border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-slate-700">TuitionShield AI</span>
              <span>•</span>
              <span>2026 Shenzhen International FinTech Competition</span>
            </div>
            <div className="text-xs text-slate-500">
              Deterministic Financial Calculations • Sandbox Execution Rail
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
