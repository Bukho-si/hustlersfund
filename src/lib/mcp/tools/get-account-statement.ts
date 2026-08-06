import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, toolError, jsonResult } from "../supabase";

export default defineTool({
  name: "get_account_statement",
  title: "Get account statement",
  description:
    "Get the signed-in member's mini statement: a chronological ledger of contributions, loans, repayments and interest with running savings and loan balances.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .optional()
      .describe("Maximum number of most recent entries to return. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase.rpc("get_member_statement", {
      _user_id: ctx.getUserId(),
    });
    if (error) return toolError(error.message);

    const rows: Record<string, unknown>[] = Array.isArray(data) ? data : [];
    const capped = Math.min(Math.max(limit ?? 50, 1), 200);
    const recent = rows.slice(-capped);
    const last = rows[rows.length - 1];

    return jsonResult({
      entry_count: rows.length,
      returned: recent.length,
      savings_balance: Number(last?.savings_balance ?? 0),
      loan_balance: Number(last?.loan_balance ?? 0),
      entries: recent.map((r) => ({
        date: r.entry_date,
        type: r.entry_type,
        description: r.description,
        amount: Number(r.amount ?? 0),
        savings_balance: Number(r.savings_balance ?? 0),
        loan_balance: Number(r.loan_balance ?? 0),
      })),
    });
  },
});
