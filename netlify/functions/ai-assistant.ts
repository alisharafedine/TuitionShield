import type { Handler, HandlerEvent } from "@netlify/functions";

const APPROVED_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Retrieve the student's authorized financial overview, including starting funds, confirmed funding, pending funding, planned costs, and calculated funding gap.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
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
          currency: {
            type: "string",
            description: "Currency code (default is EUR)",
            enum: ["EUR", "USD", "GBP", "CNY", "CAD", "AUD", "JPY"],
          },
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
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_financial_risks",
      description: "Run factual, deterministic risk rules against the current plan to flag funding deficits or reliance on unconfirmed money.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_financial_scenario",
      description: "Run an isolated, deterministic what-if scenario (e.g. rent increase, delayed scholarship, part-time job) without mutating saved baseline data.",
      parameters: {
        type: "object",
        properties: {
          rent_increase_percent: { type: "number", description: "Percentage increase in housing rent, e.g. 15 for 15%" },
          living_cost_increase_percent: { type: "number", description: "Percentage increase in general living expenses" },
          scholarship_delay_months: { type: "integer", description: "Number of months pending scholarships are delayed" },
          tuition_adjustment_minor: { type: "integer", description: "Adjustment to tuition in integer minor units (cents)" },
          part_time_monthly_income_minor: { type: "integer", description: "Added monthly income in minor units" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_payment_proposal",
      description: "Prepare an immutable tuition payment proposal for explicit student review and authorization.",
      parameters: {
        type: "object",
        properties: {
          obligation_id: { type: "string", description: "ID of the obligation to pay" },
          amount_minor: { type: "integer", description: "Amount in integer minor units" },
          currency: { type: "string", enum: ["EUR", "USD", "GBP"] },
          recipient_label: { type: "string", description: "Beneficiary university name" },
          purpose: { type: "string", description: "Payment purpose" },
        },
        required: ["amount_minor", "currency", "recipient_label", "purpose"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_upcoming_obligations",
      description: "List scheduled educational and subsistence obligations with due dates and payment status.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter category" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_exchange_rate_assumptions",
      description: "Inspect the current exchange rates and baseline conversion factors.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "DEEPSEEK_API_KEY environment variable is not configured in Netlify." }),
    };
  }

  try {
    const { messages = [] } = JSON.parse(event.body || "{}");

    const systemPrompt = {
      role: "system",
      content: `You are TuitionShield AI, an autonomous, highly knowledgeable AI financial co-pilot and mentor for international students preparing to study abroad (competing in the 2026 Shenzhen International FinTech Competition).

AGENTIC ROLE & BEHAVIOR:
1. You are proactive, comprehensive, and structured. Do NOT give lazy, short, single-sentence replies. Provide thoughtful, thorough financial counsel with executive summaries, clear bullet points, data breakdowns, and actionable next steps.
2. ALWAYS proactively call the approved tools (get_financial_summary, calculate_funding_gap, forecast_cash_flow, detect_financial_risks, simulate_financial_scenario, create_payment_proposal) to extract verified ground-truth data from the engine.
3. NEVER guess, assume, or hallucinate financial numbers. Explain figures using the retrieved tool outputs.
4. Distinguish between confirmed liquid funds and unconfirmed pending funding (like pending DAAD scholarships).
5. For payment requests: clarify that AI agents never execute money transfers autonomously; you can prepare a structured proposal via create_payment_proposal and guide the student to explicitly authorize it in the Payments tab.
6. Always conclude with 2-3 proactive suggestions or what-if scenarios the student should explore next.`,
    };

    const hasToolResults = messages.some((m: any) => m.role === "tool");
    const fullMessages = [systemPrompt, ...messages];

    const requestBody: Record<string, unknown> = {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: fullMessages,
      temperature: 0.3,
    };

    if (!hasToolResults) {
      requestBody.tools = APPROVED_TOOLS;
      requestBody.tool_choice = "auto";
    }

    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await deepseekRes.json();

    return {
      statusCode: deepseekRes.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};
