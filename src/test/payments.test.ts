import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '../lib/storage/mock-db';

describe('Sandbox Payment Workflow — Tests (State Machine & Idempotency)', () => {
  beforeEach(() => {
    // Reset to fresh competition demo state before each test
    localDb.resetToDemo();
  });

  it('P-01: Creates a valid payment proposal in awaiting_approval state without executing', () => {
    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000, // €2,000
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
      obligationId: 'ob-demo-1',
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('awaiting_approval');
    expect(proposal.amount_minor).toBe(200000);
    expect(proposal.currency).toBe('EUR');
    expect(proposal.approval_hash).toBeDefined();

    // Verify ledger transactions were NOT created
    const transactions = localDb.getState().transactions;
    expect(transactions).toHaveLength(0);

    // Verify audit event was logged
    const audits = localDb.getState().auditEvents;
    expect(audits.some((a) => a.event_type === 'proposal_created' && a.resource_id === proposal.id)).toBe(true);
  });

  it('P-02: Rejects execution attempt without explicit user approval', () => {
    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000,
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
    });

    // Attempt direct execution while still awaiting_approval
    expect(() => {
      localDb.executeSandboxPayment(proposal.id, 'idem_test_key_1');
    }).toThrow(/Execution blocked: Proposal status is "awaiting_approval"/);

    // Verify ledger remains empty
    expect(localDb.getState().transactions).toHaveLength(0);
  });

  it('P-03: User declines proposal -> status becomes rejected and cannot execute', () => {
    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000,
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
    });

    const rejected = localDb.rejectPaymentProposal(proposal.id, 'Student changed study plan');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejection_reason).toBe('Student changed study plan');

    // Attempt execution
    expect(() => {
      localDb.executeSandboxPayment(proposal.id, 'idem_test_key_2');
    }).toThrow(/Execution blocked: Proposal status is "rejected"/);
  });

  it('P-04 & P-05: Approval requires matching details hash; modified details invalidate approval', () => {
    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000,
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
    });

    // Valid hash approval succeeds
    const approved = localDb.approvePaymentProposal(proposal.id, proposal.approval_hash!);
    expect(approved.status).toBe('approved');
    expect(approved.approved_at).toBeDefined();

    // Creating another proposal and tampering with the hash fails
    const prop2 = localDb.createPaymentProposal({
      amountMinor: 100000,
      currency: 'EUR',
      recipientLabel: 'Landlord',
      purpose: 'Housing Deposit',
    });

    expect(() => {
      localDb.approvePaymentProposal(prop2.id, 'tampered_or_stale_hash_value');
    }).toThrow(/Security integrity check failed/);
  });

  it('P-06: Executes approved proposal -> updates account balance, writes single ledger transaction, updates obligation', () => {
    const startBalance = localDb.getState().accounts[0].balance_minor; // €8,000

    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000, // €2,000
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
      obligationId: 'ob-demo-1',
    });

    localDb.approvePaymentProposal(proposal.id, proposal.approval_hash!);

    const result = localDb.executeSandboxPayment(proposal.id, 'idem_tx_valid_1');

    expect(result.proposal.status).toBe('executed');
    expect(result.proposal.executed_at).toBeDefined();
    expect(result.transaction).toBeDefined();
    expect(result.transaction.amount_minor).toBe(200000);
    expect(result.transaction.source_type).toBe('sandbox_ledger');

    // Verify account balance was deducted: €8,000 - €2,000 = €6,000
    const endBalance = localDb.getState().accounts[0].balance_minor;
    expect(endBalance).toBe(startBalance - 200000);

    // Verify linked obligation status changed to 'paid'
    const linkedOb = localDb.getState().obligations.find((o) => o.id === 'ob-demo-1');
    expect(linkedOb?.status).toBe('paid');

    // Verify audit event
    const audits = localDb.getState().auditEvents;
    expect(audits.some((a) => a.event_type === 'sandbox_payment_executed' && a.resource_id === proposal.id)).toBe(true);
  });

  it('P-07: Idempotency: Duplicate execution requests produce at most ONE ledger entry', () => {
    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000,
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
    });

    localDb.approvePaymentProposal(proposal.id, proposal.approval_hash!);

    // First execution
    const run1 = localDb.executeSandboxPayment(proposal.id, 'idem_unique_key_100');
    expect(run1.idempotentReplay).toBe(false);
    expect(localDb.getState().transactions).toHaveLength(1);

    // Second execution with identical proposal ID (e.g. network retry or double click)
    const run2 = localDb.executeSandboxPayment(proposal.id, 'idem_unique_key_100');
    expect(run2.idempotentReplay).toBe(true);
    expect(run2.transaction.id).toBe(run1.transaction.id);

    // Total transactions MUST still be exactly 1!
    expect(localDb.getState().transactions).toHaveLength(1);
  });

  it('P-08: Insufficient balance fails safely without altering ledger or reporting success', () => {
    // Set account balance to €500
    localDb.updateAccount('acc-demo-1', { balance_minor: 50000 });

    const proposal = localDb.createPaymentProposal({
      amountMinor: 200000, // €2,000 (exceeds balance)
      currency: 'EUR',
      recipientLabel: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
    });

    localDb.approvePaymentProposal(proposal.id, proposal.approval_hash!);

    expect(() => {
      localDb.executeSandboxPayment(proposal.id, 'idem_fail_key');
    }).toThrow(/Insufficient funds/);

    // Verify proposal status marked as failed
    const updatedProp = localDb.getState().paymentProposals.find((p) => p.id === proposal.id);
    expect(updatedProp?.status).toBe('failed');

    // Verify no ledger transaction was written
    expect(localDb.getState().transactions).toHaveLength(0);
  });
});
