import { describe, it, expect, beforeEach } from 'vitest';
import { executeApprovedTool, sendChatMessage } from '../features/ai-assistant/ai-service';
import { localDb } from '../lib/storage/mock-db';

describe('AI Agent & Controlled Tool-Calling Security — Tests', () => {
  beforeEach(() => {
    localDb.resetToDemo();
  });

  it('A-01: Approved tool "get_financial_summary" returns verified calculation engine results', () => {
    const result = executeApprovedTool('get_financial_summary', {});
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.availableStartingBalanceMinor).toBe(800000); // €8,000
    expect(data.eligibleUnpaidObligationsMinor).toBe(1050000); // €10,500
    expect(data.fundingGapMinor).toBe(250000); // €2,500 gap
  });

  it('A-02: Approved tool "calculate_funding_gap" returns deterministic outputs', () => {
    const result = executeApprovedTool('calculate_funding_gap', { currency: 'EUR' });
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.fundingGapMinor).toBe(250000);
    expect(data.pendingFundingMinor).toBe(200000);
  });

  it('A-03: Approved tool "simulate_financial_scenario" executes isolated simulation', () => {
    const result = executeApprovedTool('simulate_financial_scenario', {
      rent_increase_percent: 15,
    });
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.gapChangeMinor).toBe(63000); // +€630
    expect(data.scenarioFundingGapMinor).toBe(313000); // €3,130
  });

  it('A-04: Rejects unauthorized or unknown tool names safely', () => {
    const result = executeApprovedTool('execute_arbitrary_sql_query', { query: 'DROP TABLE profiles;' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unsupported tool/);
  });

  it('A-05: Tool "create_payment_proposal" creates proposal in awaiting_approval and never auto-executes', () => {
    const result = executeApprovedTool('create_payment_proposal', {
      amount_minor: 200000,
      currency: 'EUR',
      recipient_label: 'Technical University of Munich',
      purpose: 'Semester 1 Tuition Fee',
    });

    expect(result.success).toBe(true);
    const proposal = result.data as any;
    expect(proposal.status).toBe('awaiting_approval');

    // Confirm that transactions remain zero (AI cannot execute!)
    expect(localDb.getState().transactions).toHaveLength(0);
  });

  it('A-06: sendChatMessage orchestrates full query, tool invocation, and logs audit record', async () => {
    const startAudits = localDb.getState().auditEvents.length;
    const response = await sendChatMessage('What happens if my rent increases by 15%?');

    expect(response.message.content).toContain('What-If Scenario Analysis Results');
    expect(response.message.toolActivity?.name).toBe('simulate_financial_scenario');

    // Verify audit event logged for the AI tool invocation
    const endAudits = localDb.getState().auditEvents.length;
    expect(endAudits).toBeGreaterThan(startAudits);
    const lastAudit = localDb.getState().auditEvents[0];
    expect(lastAudit.actor_type).toBe('ai_agent');
    expect(lastAudit.event_type).toBe('ai_tool_invoked');
  });
});
