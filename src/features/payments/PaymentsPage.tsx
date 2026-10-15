import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Hash,
} from 'lucide-react';
import { localDb } from '../../lib/storage/mock-db';
import { formatMoney } from '../financial-engine/currency';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { PaymentProposal, SupportedCurrency } from '../../types';

export const PaymentsPage: React.FC = () => {
  const { success, error, info } = useToast();
  const [state, setState] = useState(localDb.getState());

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposalToApprove, setSelectedProposalToApprove] = useState<PaymentProposal | null>(null);
  const [isExecutingId, setIsExecutingId] = useState<string | null>(null);
  const [approvalConfirmedCheck, setApprovalConfirmedCheck] = useState(false);

  // New proposal form
  const [newProposalForm, setNewProposalForm] = useState({
    obligationId: state.obligations[0]?.id || '',
    amountMajor: '2000',
    currency: 'EUR' as SupportedCurrency,
    recipientLabel: state.profile.university || 'Technical University of Munich',
    purpose: 'Semester 1 Tuition Fee',
  });

  const refreshState = () => {
    setState({ ...localDb.getState() });
  };

  // Handlers
  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(parseFloat(newProposalForm.amountMajor) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      error('Invalid Amount', 'Please provide a strictly positive payment amount.');
      return;
    }

    const proposal = localDb.createPaymentProposal({
      obligationId: newProposalForm.obligationId || undefined,
      amountMinor,
      currency: newProposalForm.currency,
      recipientLabel: newProposalForm.recipientLabel,
      purpose: newProposalForm.purpose,
    });

    setIsCreateModalOpen(false);
    refreshState();
    success('Proposal Created', `Payment Proposal ${proposal.id} is ready for explicit student review.`);
  };

  const handleApproveProposal = () => {
    if (!selectedProposalToApprove) return;
    if (!approvalConfirmedCheck) {
      error('Authorization Required', 'You must check the explicit authorization confirmation box.');
      return;
    }

    try {
      localDb.approvePaymentProposal(
        selectedProposalToApprove.id,
        selectedProposalToApprove.approval_hash!
      );
      success('Explicit Approval Verified', 'Proposal status transitioned to "Approved". Ready for sandbox execution.');
      setSelectedProposalToApprove(null);
      setApprovalConfirmedCheck(false);
      refreshState();
    } catch (err: any) {
      error('Approval Failed', err.message);
    }
  };

  const handleRejectProposal = (id: string) => {
    try {
      localDb.rejectPaymentProposal(id, 'Student declined proposal in sandbox review');
      info('Proposal Rejected', 'The proposal has been marked as rejected and cannot be executed.');
      refreshState();
    } catch (err: any) {
      error('Action Failed', err.message);
    }
  };

  const handleExecutePayment = (proposal: PaymentProposal) => {
    setIsExecutingId(proposal.id);
    const idempotencyKey = `exec_${proposal.id}_${Date.now()}`;

    setTimeout(() => {
      try {
        const res = localDb.executeSandboxPayment(proposal.id, idempotencyKey);
        refreshState();
        success(
          'Simulated Payment Executed',
          `Sandbox ledger transaction created (${res.transaction.id}). Account balance updated.`
        );
      } catch (err: any) {
        error('Execution Blocked', err.message);
        refreshState();
      } finally {
        setIsExecutingId(null);
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Compliance Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Controlled Sandbox Payment Rails
              <Badge status="success">Competition Task 7-10</Badge>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Strict state machine: <strong>Draft → Validated → Awaiting Approval → Approved → Executed</strong>. Simulated execution only.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Payment Proposal
        </Button>
      </div>

      {/* Payment Proposals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Payment Proposals ({state.paymentProposals.length})
          </h3>
          <span className="text-xs text-slate-500">
            Awaiting Approval:{' '}
            <strong className="text-amber-700">
              {state.paymentProposals.filter((p) => p.status === 'awaiting_approval').length}
            </strong>
          </span>
        </div>

        {state.paymentProposals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-500 space-y-3">
              <CreditCard className="w-8 h-8 mx-auto text-slate-400" />
              <p>No active payment proposals. You can create one manually or ask the AI Copilot to prepare a tuition payment.</p>
              <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                Prepare Sample Proposal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.paymentProposals.map((prop) => (
              <Card key={prop.id} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{prop.id}</span>
                      <Badge status={prop.status}>{prop.status.replace('_', ' ').toUpperCase()}</Badge>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{prop.purpose}</h4>
                    <p className="text-xs text-slate-500">Beneficiary: {prop.recipient_label}</p>
                  </div>
                  <div className="text-right font-mono font-bold text-base text-slate-900">
                    {formatMoney(prop.amount_minor, prop.currency)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {/* Cryptographic Details Hash */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="w-3 h-3 text-blue-600" /> Details Signature Hash
                      </span>
                      <span className="text-[10px] text-slate-400">Immutable</span>
                    </div>
                    <code className="text-xs text-blue-700 block truncate font-mono">
                      {prop.approval_hash}
                    </code>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                    <span>Expires: {new Date(prop.expires_at).toLocaleTimeString()}</span>
                    <span>Created: {new Date(prop.created_at || '').toLocaleTimeString()}</span>
                  </div>

                  {/* Action Controls based on State */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    {prop.status === 'awaiting_approval' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectProposal(prop.id)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          Decline
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedProposalToApprove(prop);
                            setApprovalConfirmedCheck(false);
                          }}
                        >
                          Review & Explicitly Approve
                        </Button>
                      </>
                    )}

                    {prop.status === 'approved' && (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isExecutingId === prop.id}
                        onClick={() => handleExecutePayment(prop)}
                        leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                      >
                        Execute Sandbox Payment
                      </Button>
                    )}

                    {prop.status === 'executed' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Executed to Sandbox Ledger (Tx: {prop.transaction_id?.slice(0, 8)}...)</span>
                      </div>
                    )}

                    {prop.status === 'rejected' && (
                      <span className="text-xs text-rose-600 font-medium">
                        Declined: {prop.rejection_reason}
                      </span>
                    )}

                    {prop.status === 'failed' && (
                      <span className="text-xs text-rose-600 font-medium">
                        Failed: {prop.failure_reason}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Sandbox Ledger Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sandbox Execution Ledger</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative simulated transactions executed with atomic balance reconciliation
            </p>
          </div>
          <Badge status="success">Simulated Transactions: {state.transactions.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {state.transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No transactions recorded in the sandbox ledger yet. Approve and execute a payment proposal above to create your first simulated transaction.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3.5">Transaction ID</th>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Source & Idempotency Key</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                  {state.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-semibold text-blue-700">{tx.id}</td>
                      <td className="p-3.5 text-slate-500 font-sans">
                        {new Date(tx.transaction_date).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-sans text-slate-900">{tx.description}</td>
                      <td className="p-3.5 text-slate-500">
                        <div>{tx.source_type}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{tx.idempotency_key}</div>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        -{formatMoney(tx.amount_minor, tx.currency)}
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <Badge status="executed">COMPLETED</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Explicit Proposal Review & Approval */}
      <Modal
        isOpen={Boolean(selectedProposalToApprove)}
        onClose={() => setSelectedProposalToApprove(null)}
        title="Explicit Payment Approval"
        description="Verify transaction parameters before authorizing execution"
        maxWidth="lg"
      >
        {selectedProposalToApprove && (
          <div className="space-y-4 text-xs">
            {/* Warning Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Sandbox Security Check:</strong> You are about to authorize a simulated payment.
                TuitionShield AI binds your approval cryptographically to the exact amount and beneficiary below.
              </div>
            </div>

            {/* Details Table */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Proposal Reference:</span>
                <span className="font-mono text-slate-900 font-semibold">{selectedProposalToApprove.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Beneficiary / Payee:</span>
                <span className="text-slate-900 font-semibold">{selectedProposalToApprove.recipient_label}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Payment Purpose:</span>
                <span className="text-slate-900">{selectedProposalToApprove.purpose}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Simulated Amount:</span>
                <span className="font-mono text-blue-700 text-sm font-bold">
                  {formatMoney(selectedProposalToApprove.amount_minor, selectedProposalToApprove.currency)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Cryptographic Hash:</span>
                <code className="font-mono text-[11px] text-slate-600 truncate max-w-xs">
                  {selectedProposalToApprove.approval_hash}
                </code>
              </div>
            </div>

            {/* Explicit Student Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={approvalConfirmedCheck}
                onChange={(e) => setApprovalConfirmedCheck(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-700 text-xs">
                I, as the authenticated student owner, have reviewed the beneficiary and amount details and <strong>explicitly authorize</strong> this simulated sandbox transfer.
              </span>
            </label>

            {/* Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setSelectedProposalToApprove(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!approvalConfirmedCheck}
                onClick={handleApproveProposal}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Approve Proposal
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Create Proposal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Prepare Tuition Payment Proposal"
        description="Specify recipient and tuition obligation to generate a formal proposal"
      >
        <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Tuition Obligation</label>
            <select
              value={newProposalForm.obligationId}
              onChange={(e) => {
                const ob = state.obligations.find((o) => o.id === e.target.value);
                setNewProposalForm({
                  ...newProposalForm,
                  obligationId: e.target.value,
                  amountMajor: ob ? (ob.amount_minor / 100).toString() : newProposalForm.amountMajor,
                  purpose: ob ? ob.title : newProposalForm.purpose,
                });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              {state.obligations
                .filter((o) => o.status !== 'paid')
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} — {formatMoney(o.amount_minor, o.currency)} (Due: {o.due_date})
                  </option>
                ))}
              <option value="">Other / Custom Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Beneficiary University / Payee</label>
            <input
              type="text"
              required
              value={newProposalForm.recipientLabel}
              onChange={(e) => setNewProposalForm({ ...newProposalForm, recipientLabel: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Amount</label>
              <input
                type="number"
                step="any"
                required
                value={newProposalForm.amountMajor}
                onChange={(e) => setNewProposalForm({ ...newProposalForm, amountMajor: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Currency</label>
              <select
                value={newProposalForm.currency}
                onChange={(e) => setNewProposalForm({ ...newProposalForm, currency: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Purpose</label>
            <input
              type="text"
              required
              value={newProposalForm.purpose}
              onChange={(e) => setNewProposalForm({ ...newProposalForm, purpose: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Generate Proposal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
