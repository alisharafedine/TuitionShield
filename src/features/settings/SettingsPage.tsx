import React, { useState } from 'react';
import {
  Download,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { SupportedCurrency } from '../../types';

export const SettingsPage: React.FC = () => {
  const { success, info } = useToast();
  const [profile, setProfile] = useState(localDb.getState().profile);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.updateProfile(profile);
    success('Settings Updated', 'Student profile and planning preferences saved.');
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(localDb.getState(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tuition_shield_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    success('Data Exported', 'Downloaded complete offline JSON export of your financial workspace.');
  };

  const handleResetDemo = () => {
    localDb.resetToDemo();
    setProfile(localDb.getState().profile);
    info('Demo Reset', 'Reset to 2026 Shenzhen Competition baseline dataset.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Student Profile Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Study & Financial Preferences</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Configure your institution, country, and base reporting currency</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Student Display Name</label>
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Destination Country</label>
                <input
                  type="text"
                  value={profile.destination_country}
                  onChange={(e) => setProfile({ ...profile, destination_country: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">University / Institution</label>
                <input
                  type="text"
                  value={profile.university}
                  onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Study Program</label>
                <input
                  type="text"
                  value={profile.study_program}
                  onChange={(e) => setProfile({ ...profile, study_program: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Base Planning Currency</label>
                <select
                  value={profile.home_currency}
                  onChange={(e) => setProfile({ ...profile, home_currency: e.target.value as SupportedCurrency })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="EUR">Euro (EUR - €)</option>
                  <option value="USD">US Dollar (USD - $)</option>
                  <option value="GBP">British Pound (GBP - £)</option>
                  <option value="CNY">Chinese Yuan (CNY - ¥)</option>
                  <option value="CAD">Canadian Dollar (CAD - CA$)</option>
                  <option value="AUD">Australian Dollar (AUD - A$)</option>
                  <option value="JPY">Japanese Yen (JPY - ¥)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Emergency Reserve Buffer (€)</label>
                <input
                  type="number"
                  value={profile.reserve_threshold_minor / 100}
                  onChange={(e) =>
                    setProfile({ ...profile, reserve_threshold_minor: Math.round(parseFloat(e.target.value || '0') * 100) })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                Save Preferences
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Data Export & Reset Card */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management & Reset Controls</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Export workspace records or reset to competition demonstration baseline</p>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200">
            <div>
              <h5 className="font-semibold text-slate-900">Full JSON Data Export</h5>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Download all accounts, obligations, scenarios, proposals, and audit logs.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExportData} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Export JSON
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200">
            <div>
              <h5 className="font-semibold text-slate-900">Reset Demo Scenario</h5>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Restore the official competition single-currency demonstrator (€8,000 savings, €10,500 costs).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetDemo} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset Dataset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transparency & Security Disclosure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Security & Data Transparency Disclosure
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Competition compliance declarations</p>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-lg bg-white/60 border border-slate-200 space-y-1">
            <h5 className="font-semibold text-slate-900">1. What information is stored?</h5>
            <p className="text-slate-400">
              Only student-declared financial accounts, planned living costs, tuition obligations, and simulation runs. TuitionShield AI does not request or store bank logins, PINs, or credit card security codes.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white/60 border border-slate-200 space-y-1">
            <h5 className="font-semibold text-slate-900">2. How is DeepSeek AI utilized?</h5>
            <p className="text-slate-400">
              The AI co-pilot functions through controlled server-side tool calling. It never performs authoritative arithmetic or writes directly to the database. All financial sums and forecasts come from deterministic code.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white/60 border border-slate-200 space-y-1">
            <h5 className="font-semibold text-slate-900">3. Why do sandbox payments not move real money?</h5>
            <p className="text-slate-400">
              This application is built for the 2026 Shenzhen International FinTech Competition (Topic C). All payments are simulated in a sandbox ledger to safely demonstrate explicit user approval, cryptographic hash binding, and idempotency protection without risking real student funds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
