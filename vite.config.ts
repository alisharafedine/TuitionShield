import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Approved tool definitions for DeepSeek API
const APPROVED_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Retrieve the student's authorized financial overview, including starting funds, confirmed funding, pending funding, planned costs, and calculated funding gap.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_funding_gap",
      description: "Perform deterministic calculation of the student's aggregate funding gap within their study plan horizon.",
      parameters: {
        type: "object",
        properties: {
          currency: { type: "string", enum: ["EUR", "USD", "GBP", "CNY", "CAD", "AUD", "JPY"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forecast_cash_flow",
      description: "Generate chronological monthly cash-flow projections and identify potential balance deficit dates.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_financial_risks",
      description: "Detect factual financial risks, including low reserves, pending funding dependence, and upcoming tuition deadline risks.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_financial_scenario",
      description: "Simulate a what-if financial scenario (e.g. rent increase, scholarship delay, or part-time job) without modifying baseline records.",
      parameters: {
        type: "object",
        properties: {
          rent_increase_percent: { type: "number", description: "Percentage increase in rent (e.g. 15 for 15%)" },
          living_cost_increase_percent: { type: "number", description: "Percentage increase in living expenses" },
          tuition_adjustment_minor: { type: "number", description: "Tuition change in minor units (e.g. +50000 for +500 EUR)" },
          scholarship_delay_months: { type: "number", description: "Number of months a scholarship is delayed" },
          scholarship_cancelled: { type: "boolean", description: "Whether expected scholarship was cancelled" },
          part_time_monthly_income_minor: { type: "number", description: "Additional monthly income from part-time work in minor units" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_upcoming_obligations",
      description: "List unpaid upcoming obligations (tuition, housing, visa, insurance) sorted by due date.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["tuition", "housing", "food", "insurance", "visa", "all"] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_payment_proposal",
      description: "Prepare a simulated sandbox tuition payment proposal for explicit student review and approval. Does NOT execute payment.",
      parameters: {
        type: "object",
        properties: {
          obligation_id: { type: "string" },
          amount_minor: { type: "number" },
          currency: { type: "string", enum: ["EUR", "USD", "GBP", "CNY", "CAD", "AUD", "JPY"] },
          recipient_label: { type: "string" },
          purpose: { type: "string" },
        },
        required: ["amount_minor", "currency", "recipient_label", "purpose"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payment_status",
      description: "Check the status of an existing payment proposal or ledger transaction.",
      parameters: {
        type: "object",
        properties: { proposal_id: { type: "string" } },
        required: ["proposal_id"],
        additionalProperties: false,
      },
    },
  },
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'deepseek-api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/ai-assistant' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const apiKey = env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
                  if (!apiKey) {
                    res.statusCode = 503;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured in .env' }));
                    return;
                  }

                  const parsedBody = JSON.parse(body || '{}');
                  const messages = parsedBody.messages || [];

                  const systemPrompt = {
                    role: 'system',
                    content: `You are TuitionShield AI, an autonomous, highly knowledgeable AI financial co-pilot and mentor for international students preparing to study abroad (competing in the 2026 Shenzhen International FinTech Competition).

AGENTIC ROLE & BEHAVIOR:
1. You are proactive, comprehensive, and structured. Do NOT give lazy, short, single-sentence replies. Provide thoughtful, thorough financial counsel with executive summaries, clear bullet points, data breakdowns, and actionable next steps.
2. ALWAYS proactively call the approved tools (get_financial_summary, calculate_funding_gap, forecast_cash_flow, detect_financial_risks, simulate_financial_scenario, create_payment_proposal) to extract verified ground-truth data from the engine.
3. NEVER guess, assume, or hallucinate financial numbers. Explain figures using the retrieved tool outputs.
4. Distinguish between confirmed liquid funds and unconfirmed pending funding (like pending DAAD scholarships).
5. For payment requests: clarify that AI agents never execute money transfers autonomously; you can prepare a structured proposal via create_payment_proposal and guide the student to explicitly authorize it in the Payments tab.
6. Always conclude with 2-3 proactive suggestions or what-if scenarios the student should explore next.`,
                  };

                  const hasToolResults = messages.some((m: any) => m.role === 'tool');
                  const fullMessages = [systemPrompt, ...messages];
                  const requestBody: Record<string, unknown> = {
                    model: env.DEEPSEEK_MODEL || 'deepseek-chat',
                    messages: fullMessages,
                    temperature: 0.3,
                  };

                  if (!hasToolResults) {
                    requestBody.tools = APPROVED_TOOLS;
                    requestBody.tool_choice = 'auto';
                  }

                  const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(requestBody),
                  });

                  const data = await deepseekRes.json();
                  res.statusCode = deepseekRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal error' }));
                }
              });
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // @ts-ignore
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
