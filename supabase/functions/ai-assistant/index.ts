// ==============================================================================
// TuitionShield AI — Supabase Edge Function: DeepSeek AI Financial Copilot
// 2026 Shenzhen International FinTech Competition — Topic C
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Approved Tool Definitions with Strict JSON Schemas
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
      description: "Detect factual financial risks, including low reserves, pending funding dependence, and upcoming tuition deadline risks.",
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
      description: "Simulate a what-if financial scenario (e.g., rent increase, scholarship delay, or part-time job) without modifying baseline records.",
      parameters: {
        type: "object",
        properties: {
          rent_increase_percent: { type: "number", description: "Percentage increase in rent (e.g., 15 for 15%)" },
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
          category: {
            type: "string",
            enum: ["tuition", "housing", "food", "insurance", "visa", "all"],
            description: "Filter by expense category",
          },
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
          obligation_id: { type: "string", description: "Optional UUID of the tuition obligation being paid" },
          amount_minor: { type: "number", description: "Payment amount in minor units (e.g. 200000 for 2,000.00 EUR)" },
          currency: { type: "string", enum: ["EUR", "USD", "GBP", "CNY", "CAD", "AUD", "JPY"] },
          recipient_label: { type: "string", description: "Name of university or institution" },
          purpose: { type: "string", description: "Specific tuition or fee description" },
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
        properties: {
          proposal_id: { type: "string", description: "UUID of the payment proposal" },
        },
        required: ["proposal_id"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Client with User Auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side DeepSeek API Credentials
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const deepseekModel = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";

    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({
          error: "DEEPSEEK_API_KEY is not configured on server. Please set DEEPSEEK_API_KEY in Supabase secrets.",
          mode: "fallback_required",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // System Prompt enforcing security boundaries and financial co-pilot role
    const systemPrompt = {
      role: "system",
      content: `You are TuitionShield AI, an intelligent cross-border financial co-pilot for international students.
You assist students in understanding their financial position, predicting cash-flow shortages, and preparing sandbox payments.

CRITICAL SECURITY RULES:
1. Never invent or guess financial figures. Always invoke the approved tools (get_financial_summary, calculate_funding_gap, forecast_cash_flow, detect_financial_risks) to get exact numbers from the deterministic engine.
2. Clearly distinguish between confirmed resources and pending scholarships. Pending scholarships cannot be treated as guaranteed cash.
3. You CANNOT execute payments directly. You may only call "create_payment_proposal" to prepare a proposal for explicit student review and approval.
4. If a student asks to pay or prepare a tuition installment, call create_payment_proposal with the exact obligation details and instruct the student to review and approve the proposal in the Payments tab.
5. Provide concise, clear, and empathetic financial guidance tailored to international students.`,
    };

    const fullMessages = [systemPrompt, ...messages];

    // Call DeepSeek API with Tools
    const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: fullMessages,
        tools: APPROVED_TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
      }),
    });

    if (!deepseekResponse.ok) {
      const errText = await deepseekResponse.text();
      return new Response(
        JSON.stringify({ error: `DeepSeek API returned error: ${deepseekResponse.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completion = await deepseekResponse.json();
    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
