import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { formatMoney, toMinorUnits } from '../financial-engine/currency';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { SupportedCurrency } from '../../types';

export const FinancesPage: React.FC = () => {
  const { success, error } = useToast();
  const [state, setState] = useState(localDb.getState());
  const [activeTab, setActiveTab] = useState<'accounts' | 'funding' | 'obligations'>('accounts');

  // Modal States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isObligationModalOpen, setIsObligationModalOpen] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    currency: 'EUR' as SupportedCurrency,
    balanceMajor: '',
    accountType: 'savings' as any,
  });

  const [fundingForm, setFundingForm] = useState({
    name: '',
    currency: 'EUR' as SupportedCurrency,
    amountMajor: '',
    status: 'pending' as any,
    sourceType: 'scholarship' as any,
    expectedDate: '',
    notes: '',
  });

  const [obligationForm, setObligationForm] = useState({
    title: '',
    category: 'tuition' as any,
    currency: 'EUR' as SupportedCurrency,
    amountMajor: '',
    dueDate: '',
    status: 'planned' as any,
    isEssential: true,
  });

  const refreshState = () => {
    setState({ ...localDb.getState() });
  };

  // Handlers
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name || !accountForm.balanceMajor) {
      error('Validation Error', 'Please provide an account name and balance.');
      return;
    }
    const balanceMinor = toMinorUnits(accountForm.balanceMajor, accountForm.currency);
    localDb.addAccount({
      name: accountForm.name,
      currency: accountForm.currency,
      balance_minor: balanceMinor,
      account_type: accountForm.accountType,
      source_type: 'manual_declaration',
      verified_status: 'declared',
      as_of_date: new Date().toISOString().split('T')[0],
    });
    success('Account Added', `Account ${accountForm.name} declared successfully.`);
    setIsAccountModalOpen(false);
    setAccountForm({ name: '', currency: 'EUR', balanceMajor: '', accountType: 'savings' });
    refreshState();
  };

  const handleSaveFunding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingForm.name || !fundingForm.amountMajor) {
      error('Validation Error', 'Please provide a funding source name and amount.');
      return;
    }
    const amountMinor = toMinorUnits(fundingForm.amountMajor, fundingForm.currency);
    localDb.addFunding({
      name: fundingForm.name,
      currency: fundingForm.currency,
      amount_minor: amountMinor,
      status: fundingForm.status,
      source_type: fundingForm.sourceType,
      expected_date: fundingForm.expectedDate || undefined,
      notes: fundingForm.notes,
    });
    success('Funding Source Added', `${fundingForm.name} recorded with status "${fundingForm.status}".`);
    setIsFundingModalOpen(false);
    setFundingForm({
      name: '',
      currency: 'EUR',
      amountMajor: '',
      status: 'pending',
      sourceType: 'scholarship',
      expectedDate: '',
      notes: '',
    });
    refreshState();
  };

  const handleSaveObligation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!obligationForm.title || !obligationForm.amountMajor || !obligationForm.dueDate) {
      error('Validation Error', 'Please complete title, amount, and due date.');
      return;
    }
    const amountMinor = toMinorUnits(obligationForm.amountMajor, obligationForm.currency);
    localDb.addObligation({
      title: obligationForm.title,
      category: obligationForm.category,
      currency: obligationForm.currency,
      amount_minor: amountMinor,
      due_date: obligationForm.dueDate,
      status: obligationForm.status,
      is_essential: obligationForm.isEssential,
    });
    success('Obligation Added', `Upcoming obligation "${obligationForm.title}" recorded.`);
    setIsObligationModalOpen(false);
    setObligationForm({
      title: '',
      category: 'tuition',
      currency: 'EUR',
      amountMajor: '',
      dueDate: '',
      status: 'planned',
      isEssential: true,
    });
    refreshState();
  };

  const handleDeleteAccount = (id: string) => {
    localDb.deleteAccount(id);
    refreshState();
    success('Account Removed');
  };

  const handleDeleteFunding = (id: string) => {
    localDb.deleteFunding(id);
    refreshState();
    success('Funding Source Removed');
  };

  const handleDeleteObligation = (id: string) => {
    localDb.deleteObligation(id);
    refreshState();
    success('Obligation Removed');
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'accounts'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : 'text-slate-400 hover:text-slate-900 hover:bg-surface-card'
            }`}
          >
            Accounts ({state.accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('funding')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'funding'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : 'text-slate-400 hover:text-slate-900 hover:bg-surface-card'
            }`}
          >
            Income & Grants ({state.fundingSources.length})
          </button>
          <button
            onClick={() => setActiveTab('obligations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'obligations'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : 'text-slate-400 hover:text-slate-900 hover:bg-surface-card'
            }`}
          >
            Expenses & Obligations ({state.obligations.length})
          </button>
        </div>

        <div>
          {activeTab === 'accounts' && (
            <Button
              size="sm"
              onClick={() => setIsAccountModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Declared Account
            </Button>
          )}
          {activeTab === 'funding' && (
            <Button
              size="sm"
              onClick={() => setIsFundingModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Funding Source
            </Button>
          )}
          {activeTab === 'obligations' && (
            <Button
              size="sm"
              onClick={() => setIsObligationModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Obligation
            </Button>
          )}
        </div>
      </div>

      {/* 1. ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-300 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Compliance Notice:</strong> Balances listed below are declared by the student and verified for sandbox calculation purposes. TuitionShield AI does not claim direct bank integration or open-banking verification in this MVP.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.accounts.map((acc) => (
              <Card key={acc.id} hoverEffect>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{acc.name}</h4>
                      <p className="text-[11px] text-slate-400 capitalize">{acc.account_type} Account</p>
                    </div>
                  </div>
                  <Badge status="declared">{acc.verified_status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-xs text-slate-400">Current Balance</span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                      {formatMoney(acc.balance_minor, acc.currency)}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                    <span>Source: {acc.source_type}</span>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Remove account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. FUNDING TAB */}
      {activeTab === 'funding' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-300 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Funding Calculation Policy:</strong> Only funding marked as <strong>Confirmed</strong> or <strong>Received</strong> is counted in confirmed available resources. Pending funding is tracked separately to prevent student funding deficits.
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-medium">
                <tr>
                  <th className="p-3.5">Source Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Expected Date</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {state.fundingSources.map((f) => (
                  <tr key={f.id} className="hover:bg-white/50">
                    <td className="p-3.5 font-medium text-slate-900">
                      <div>{f.name}</div>
                      {f.notes && <div className="text-[11px] text-slate-400">{f.notes}</div>}
                    </td>
                    <td className="p-3.5 capitalize text-slate-300">{f.source_type.replace('_', ' ')}</td>
                    <td className="p-3.5">
                      <Badge status={f.status}>{f.status.toUpperCase()}</Badge>
                    </td>
                    <td className="p-3.5 text-slate-400">{f.expected_date || '—'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatMoney(f.amount_minor, f.currency)}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteFunding(f.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. OBLIGATIONS TAB */}
      {activeTab === 'obligations' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-medium">
                <tr>
                  <th className="p-3.5">Expense Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50 text-slate-200">
                {state.obligations.map((ob) => (
                  <tr key={ob.id} className="hover:bg-white/50">
                    <td className="p-3.5 font-medium text-slate-900">
                      <div>{ob.title}</div>
                      {ob.notes && <div className="text-[11px] text-slate-400">{ob.notes}</div>}
                    </td>
                    <td className="p-3.5 capitalize text-slate-300">{ob.category}</td>
                    <td className="p-3.5 text-slate-400">{ob.due_date}</td>
                    <td className="p-3.5">
                      <Badge status={ob.status}>{ob.status.toUpperCase()}</Badge>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatMoney(ob.amount_minor, ob.currency)}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteObligation(ob.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Account */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Declare Financial Account"
        description="Add a savings account, blocked account, or cash reserve."
      >
        <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Account Label</label>
            <input
              type="text"
              required
              placeholder="e.g. Blocked Account (Expatrio / Fintiba)"
              value={accountForm.name}
              onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Currency</label>
              <select
                value={accountForm.currency}
                onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CNY">CNY (¥)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Balance</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 8000"
                value={accountForm.balanceMajor}
                onChange={(e) => setAccountForm({ ...accountForm, balanceMajor: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Account Type</label>
            <select
              value={accountForm.accountType}
              onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value as any })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="savings">Savings / Blocked Account</option>
              <option value="checking">Current / Checking Account</option>
              <option value="cash">Cash on Hand</option>
              <option value="term_deposit">Term Deposit</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button variant="ghost" type="button" onClick={() => setIsAccountModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Declared Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Funding */}
      <Modal
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
        title="Add Funding / Scholarship Source"
        description="Specify grants, scholarships, or family support."
      >
        <form onSubmit={handleSaveFunding} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Source Name</label>
            <input
              type="text"
              required
              placeholder="e.g. DAAD Scholarship / Family Support"
              value={fundingForm.name}
              onChange={(e) => setFundingForm({ ...fundingForm, name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Amount</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 2000"
                value={fundingForm.amountMajor}
                onChange={(e) => setFundingForm({ ...fundingForm, amountMajor: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Status</label>
              <select
                value={fundingForm.status}
                onChange={(e) => setFundingForm({ ...fundingForm, status: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending (Not yet confirmed)</option>
                <option value="confirmed">Confirmed (Guaranteed)</option>
                <option value="received">Received (Already in bank)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Expected Date</label>
              <input
                type="date"
                value={fundingForm.expectedDate}
                onChange={(e) => setFundingForm({ ...fundingForm, expectedDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Category</label>
              <select
                value={fundingForm.sourceType}
                onChange={(e) => setFundingForm({ ...fundingForm, sourceType: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="scholarship">Scholarship / Grant</option>
                <option value="family_support">Family Support</option>
                <option value="part_time_job">Part-Time Employment</option>
                <option value="personal_savings">Personal Savings</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button variant="ghost" type="button" onClick={() => setIsFundingModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Funding Source
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Obligation */}
      <Modal
        isOpen={isObligationModalOpen}
        onClose={() => setIsObligationModalOpen(false)}
        title="Record Financial Obligation / Expense"
        description="Add upcoming tuition installment, rent, or living expense."
      >
        <form onSubmit={handleSaveObligation} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Expense Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Semester 2 Tuition Fee"
              value={obligationForm.title}
              onChange={(e) => setObligationForm({ ...obligationForm, title: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Category</label>
              <select
                value={obligationForm.category}
                onChange={(e) => setObligationForm({ ...obligationForm, category: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="tuition">Tuition</option>
                <option value="housing">Housing / Rent</option>
                <option value="food">Food & Groceries</option>
                <option value="insurance">Health Insurance</option>
                <option value="visa">Visa & Permit Fees</option>
                <option value="other">Other Expenses</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Amount</label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 2000"
                value={obligationForm.amountMajor}
                onChange={(e) => setObligationForm({ ...obligationForm, amountMajor: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Due Date</label>
              <input
                type="date"
                required
                value={obligationForm.dueDate}
                onChange={(e) => setObligationForm({ ...obligationForm, dueDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Status</label>
              <select
                value={obligationForm.status}
                onChange={(e) => setObligationForm({ ...obligationForm, status: e.target.value as any })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="planned">Planned</option>
                <option value="due">Due Now</option>
                <option value="paid">Already Paid</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button variant="ghost" type="button" onClick={() => setIsObligationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Obligation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
