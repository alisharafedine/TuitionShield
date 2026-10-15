import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { InfoPortalPage } from './features/portal/InfoPortalPage';
import { FinancesPage } from './features/finances/FinancesPage';
import { FundingPage } from './features/funding/FundingPage';
import { CashFlowPage } from './features/cash-flow/CashFlowPage';
import { ScenariosPage } from './features/scenarios/ScenariosPage';
import { AiCopilotPage } from './features/ai-assistant/AiCopilotPage';
import { PaymentsPage } from './features/payments/PaymentsPage';
import { AuditPage } from './features/audit/AuditPage';
import { SettingsPage } from './features/settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="portal" element={<InfoPortalPage />} />
              <Route path="finances" element={<FinancesPage />} />
              <Route path="funding" element={<FundingPage />} />
              <Route path="cash-flow" element={<CashFlowPage />} />
              <Route path="scenarios" element={<ScenariosPage />} />
              <Route path="ai-copilot" element={<AiCopilotPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
