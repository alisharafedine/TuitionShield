import React, { useState } from 'react';
import {
  User,
  Wallet,
  GraduationCap,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Save,
  Globe,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { localDb } from '../../lib/storage/mock-db';
import { SupabaseDataService } from '../../lib/supabase/data-service';
import { calculateFundingGap } from '../financial-engine/engine';
import { formatMoney, toMinorUnits, toMajorUnits } from '../financial-engine/currency';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { SupportedCurrency } from '../../types';

export const InfoPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'accounts' | 'funding' | 'obligations'>('profile');
  const [dataVersion, setDataVersion] = useState(0);

  const state = localDb.getState();
  const planInput = {
    baseCurrency: state.profile.home_currency,
    planStartDate: '2026-10-01',
    planEndDate: '2027-09-30',
    reserveThresholdMinor: state.profile.reserve_threshold_minor,
    accounts: state.accounts,
    fundingSources: state.fundingSources,
    obligations: state.obligations,
  };
  const gapResult = calculateFundingGap(planInput);

  // Profile Form State
  const [displayName, setDisplayName] = useState(state.profile.display_name);
  const [destinationCountry, setDestinationCountry] = useState(state.profile.destination_country);
  const [university, setUniversity] = useState(state.profile.university);
  const [studyProgram, setStudyProgram] = useState(state.profile.study_program);
  const [studyStartDate, setStudyStartDate] = useState(state.profile.study_start_date);
  const [studyDuration] = useState(state.profile.study_duration_months);
  const [homeCurrency, setHomeCurrency] = useState<SupportedCurrency>(state.profile.home_currency);
  const [reserveThreshold, setReserveThreshold] = useState(toMajorUnits(state.profile.reserve_threshold_minor));

  // Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState<number | ''>('');
  const [newAccType, setNewAccType] = useState<'checking' | 'savings' | 'term_deposit' | 'cash'>('savings');

  // Funding Form State
  const [newFundName, setNewFundName] = useState('');
  const [newFundAmount, setNewFundAmount] = useState<number | ''>('');
  const [newFundStatus, setNewFundStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [newFundType, setNewFundType] = useState<'scholarship' | 'family_support' | 'part_time_job' | 'grant'>('scholarship');

  // Obligation Form State
  const [newOblTitle, setNewOblTitle] = useState('');
  const [newOblCategory, setNewOblCategory] = useState<'tuition' | 'housing' | 'food' | 'insurance' | 'visa' | 'other'>('tuition');
  const [newOblAmount, setNewOblAmount] = useState<number | ''>('');
  const [newOblDueDate, setNewOblDueDate] = useState('');

  const triggerUpdate = () => setDataVersion((v) => v + 1);

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await SupabaseDataService.updateProfile(
      {
        display_name: displayName,
        destination_country: destinationCountry,
        university,
        study_program: studyProgram,
        study_start_date: studyStartDate,
        study_duration_months: Number(studyDuration),
        home_currency: homeCurrency,
        reserve_threshold_minor: toMinorUnits(Number(reserveThreshold)),
      },
      user?.id
    );
    success('Profile Saved', 'Your student destination and study settings have been updated.');
    triggerUpdate();
  };

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName || newAccBalance === '') return;

    await SupabaseDataService.addAccount(
      {
        name: newAccName,
        currency: homeCurrency,
        balance_minor: toMinorUnits(Number(newAccBalance)),
        account_type: newAccType,
        source_type: 'manual_declaration',
        verified_status: 'declared',
        as_of_date: new Date().toISOString().split('T')[0],
      },
      user?.id
    );

    setNewAccName('');
    setNewAccBalance('');
    success('Account Added', `Added ${newAccName} with balance ${formatMoney(toMinorUnits(Number(newAccBalance)), homeCurrency)}`);
    triggerUpdate();
  };

  // Delete Account
  const handleDeleteAccount = (id: string, name: string) => {
    localDb.deleteAccount(id);
    info('Account Removed', `Removed ${name} from active plan.`);
    triggerUpdate();
  };

  // Add Funding
  const handleAddFunding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundName || newFundAmount === '') return;

    await SupabaseDataService.addFundingSource(
      {
        name: newFundName,
        amount_minor: toMinorUnits(Number(newFundAmount)),
        currency: homeCurrency,
        status: newFundStatus,
        source_type: newFundType,
        expected_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      },
      user?.id
    );

    setNewFundName('');
    setNewFundAmount('');
    success('Funding Source Added', `Added ${newFundName} (${newFundStatus.toUpperCase()})`);
    triggerUpdate();
  };

  // Delete Funding
  const handleDeleteFunding = (id: string, name: string) => {
    localDb.deleteFunding(id);
    info('Funding Removed', `Removed ${name} from active plan.`);
    triggerUpdate();
  };

  // Add Obligation
  const handleAddObligation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOblTitle || newOblAmount === '') return;

    await SupabaseDataService.addObligation(
      {
        title: newOblTitle,
        category: newOblCategory,
        amount_minor: toMinorUnits(Number(newOblAmount)),
        currency: homeCurrency,
        due_date: newOblDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'planned',
        is_essential: true,
      },
      user?.id
    );

    setNewOblTitle('');
    setNewOblAmount('');
    success('Obligation Added', `Added ${newOblTitle} (${formatMoney(toMinorUnits(Number(newOblAmount)), homeCurrency)})`);
    triggerUpdate();
  };

  // Delete Obligation
  const handleDeleteObligation = (id: string, title: string) => {
    localDb.deleteObligation(id);
    info('Obligation Removed', `Removed ${title} from active plan.`);
    triggerUpdate();
  };

  // Load Preset
  const handleLoadPreset = async () => {
    await SupabaseDataService.loadPreset('germany', user?.id);
    setDisplayName('Elena Vance');
    setDestinationCountry('Germany');
    setUniversity('Technical University of Munich');
    setStudyProgram('M.Sc. Sustainable FinTech');
    setHomeCurrency('EUR');
    success('Preset Loaded', 'Configured German Study Abroad baseline with €11,208 Sperrkonto and DAAD stipend.');
    triggerUpdate();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" key={dataVersion}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-wide flex items-center gap-1.5 border border-blue-200">
              <Layers className="w-3 h-3 text-blue-600" />
              Unified Data Hub
            </span>
            <span className="text-xs text-slate-500">All-in-One Information Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Student Financial Setup Portal
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Input and manage your entire study abroad budget in one place: starting funds, tuition deadlines, living costs, and scholarships.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleLoadPreset}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Load Quick Study Preset</span>
          </button>
        </div>
      </div>

      {/* Live Financial KPI Header Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Available Starting Funds</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(gapResult.availableStartingBalanceMinor, homeCurrency)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {state.accounts.length} declared account{state.accounts.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Total Planned Costs</span>
            <CreditCard className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatMoney(gapResult.eligibleUnpaidObligationsMinor, homeCurrency)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {state.obligations.length} planned expense obligation{state.obligations.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Projected Funding Gap</span>
            {gapResult.fundingGapMinor > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              gapResult.fundingGapMinor > 0 ? 'text-amber-800' : 'text-emerald-800'
            }`}
          >
            {formatMoney(gapResult.fundingGapMinor, homeCurrency)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {gapResult.fundingGapMinor > 0
              ? 'Shortage requires additional scholarships or savings'
              : 'Education is fully funded!'}
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex p-1.5 rounded-2xl bg-slate-200/70 border border-slate-200 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'profile'
              ? 'bg-white text-blue-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <User className="w-4 h-4 text-blue-600" />
          <span>1. Profile & University</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'accounts'
              ? 'bg-white text-blue-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Wallet className="w-4 h-4 text-blue-600" />
          <span>2. Accounts & Cash ({state.accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('funding')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'funding'
              ? 'bg-white text-blue-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-blue-600" />
          <span>3. Funding & Scholarships ({state.fundingSources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('obligations')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'obligations'
              ? 'bg-white text-blue-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span>4. Tuition & Expenses ({state.obligations.length})</span>
        </button>
      </div>

      {/* Tab 1: Profile & Study Details */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Study Abroad Destination & Plan Settings
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These settings establish the base currency, university costs, and timeline for all financial projections.
              </p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
              Save Profile
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Student Full Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Destination Country</label>
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="Germany">Germany (Sperrkonto / Blocked Account)</option>
                <option value="United Kingdom">United Kingdom (UK CAS & Living)</option>
                <option value="United States">United States (F-1 I-20 Requirement)</option>
                <option value="Canada">Canada (GIC Requirement)</option>
                <option value="Australia">Australia (Overseas Student Health)</option>
                <option value="France">France (Campus France Requirement)</option>
                <option value="Netherlands">Netherlands (Studielink)</option>
                <option value="Switzerland">Switzerland (Cantonal Permit)</option>
                <option value="Singapore">Singapore (MOE Tuition Grant)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">University / College</label>
              <input
                type="text"
                required
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Technical University of Munich"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Study Program / Degree</label>
              <input
                type="text"
                required
                value={studyProgram}
                onChange={(e) => setStudyProgram(e.target.value)}
                placeholder="e.g. M.Sc. Computational Finance"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Study Start Date</label>
              <input
                type="date"
                required
                value={studyStartDate}
                onChange={(e) => setStudyStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base Planning Currency</label>
              <select
                value={homeCurrency}
                onChange={(e) => setHomeCurrency(e.target.value as SupportedCurrency)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="EUR">EUR (€) — Eurozone</option>
                <option value="USD">USD ($) — United States</option>
                <option value="GBP">GBP (£) — United Kingdom</option>
                <option value="CAD">CAD ($) — Canada</option>
                <option value="AUD">AUD ($) — Australia</option>
                <option value="CNY">CNY (¥) — China</option>
                <option value="JPY">JPY (¥) — Japan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Emergency Reserve Cushion ({homeCurrency})
              </label>
              <input
                type="number"
                min="0"
                value={reserveThreshold}
                onChange={(e) => setReserveThreshold(Number(e.target.value))}
                placeholder="1000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum safety buffer you want in reserve at all times (e.g. €1,000).
              </p>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Accounts & Liquid Cash */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <form onSubmit={handleAddAccount} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add a Bank Account or Cash Balance
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter your current savings, blocked account deposit, or family contributions held in bank accounts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account Label</label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Fintiba Blocked Account"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Current Balance ({homeCurrency})</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="8000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account Category</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="savings">Savings Account</option>
                  <option value="term_deposit">Blocked Account (Sperrkonto / GIC)</option>
                  <option value="checking">Checking / Current Account</option>
                  <option value="cash">Cash / Liquid Wallet</option>
                </select>
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Account to Plan
            </Button>
          </form>

          {/* Existing Accounts List */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Active Declared Accounts ({state.accounts.length})</h2>
            {state.accounts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No accounts declared yet. Use the form above to add your first account.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {state.accounts.map((acc) => (
                  <div key={acc.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{acc.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{acc.account_type.replace('_', ' ')} • Declared</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-base font-bold font-mono text-slate-900">
                        {formatMoney(acc.balance_minor, acc.currency)}
                      </span>
                      <button
                        onClick={() => handleDeleteAccount(acc.id, acc.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Funding & Scholarships */}
      {activeTab === 'funding' && (
        <div className="space-y-6">
          <form onSubmit={handleAddFunding} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Scholarship, Grant, or Family Support
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Differentiate confirmed funds from pending scholarships. Pending funds are excluded from confirmed calculations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Source Label</label>
                <input
                  type="text"
                  required
                  value={newFundName}
                  onChange={(e) => setNewFundName(e.target.value)}
                  placeholder="e.g. DAAD Excellence Grant"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount ({homeCurrency})</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newFundAmount}
                  onChange={(e) => setNewFundAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Verification Status</label>
                <select
                  value={newFundStatus}
                  onChange={(e) => setNewFundStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="confirmed">Confirmed (Guaranteed)</option>
                  <option value="pending">Pending (Not yet awarded)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newFundType}
                  onChange={(e) => setNewFundType(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="scholarship">Scholarship</option>
                  <option value="family_support">Family Contribution</option>
                  <option value="grant">University Grant</option>
                  <option value="part_time_job">Part-time Employment</option>
                </select>
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Funding Source
            </Button>
          </form>

          {/* Existing Funding Sources List */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Funding & Aid Stream ({state.fundingSources.length})</h2>
            {state.fundingSources.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No funding sources tracked yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {state.fundingSources.map((f) => (
                  <div key={f.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <span>{f.name}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              f.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {f.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 capitalize">{f.source_type.replace('_', ' ')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-base font-bold font-mono text-slate-900">
                        {formatMoney(f.amount_minor, f.currency)}
                      </span>
                      <button
                        onClick={() => handleDeleteFunding(f.id, f.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Tuition & Living Costs (Obligations) */}
      {activeTab === 'obligations' && (
        <div className="space-y-6">
          <form onSubmit={handleAddObligation} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Tuition, Housing, or Essential Expense
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter mandatory tuition milestones, student residence rent, statutory health insurance, or living costs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Obligation Title</label>
                <input
                  type="text"
                  required
                  value={newOblTitle}
                  onChange={(e) => setNewOblTitle(e.target.value)}
                  placeholder="e.g. Semester 1 Tuition Fee"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={newOblCategory}
                  onChange={(e) => setNewOblCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="tuition">Tuition Fee</option>
                  <option value="housing">Housing / Rent</option>
                  <option value="insurance">Health Insurance</option>
                  <option value="food">Food & Groceries</option>
                  <option value="visa">Visa & Immigration</option>
                  <option value="other">Other Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount ({homeCurrency})</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={newOblAmount}
                  onChange={(e) => setNewOblAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newOblDueDate}
                  onChange={(e) => setNewOblDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Expense Obligation
            </Button>
          </form>

          {/* Existing Obligations List */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Planned Obligations & Costs ({state.obligations.length})</h2>
            {state.obligations.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No obligations planned yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {state.obligations.map((o) => (
                  <div key={o.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <span>{o.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                            {o.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">Due: {o.due_date} • {o.status}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-base font-bold font-mono text-slate-900">
                        {formatMoney(o.amount_minor, o.currency)}
                      </span>
                      <button
                        onClick={() => handleDeleteObligation(o.id, o.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
