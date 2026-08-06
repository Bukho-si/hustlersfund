import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, toolError, jsonResult } from "../supabase";

export default defineTool({
  name: "get_loan_history",
  title: "Get loan history",
  description:
    "List the signed-in member's petrol and personal loans with amount, interest, status, outstanding balance and due date.",
  inputSchema: {
    type: z
      .enum(["petrol", "personal"])
      .optional()
      .describe("Filter to one loan type. Omit to return both."),
    status: z
      .enum(["pending", "approved", "rejected", "requested", "under_review", "disbursed", "repaid"])
      .optional()
      .describe("Filter to a single loan status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ type, status }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("loans")
      .select(
        "id, type, amount, interest_rate_percent, interest_amount, total_repayable, outstanding_balance, status, reason, requested_at, approved_at, disbursed_at, due_date"
      )
      .eq("member_user_id", ctx.getUserId())
      .order("requested_at", { ascending: false });

    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return toolError(error.message);

    const loans = data ?? [];
    const outstanding = loans.reduce(
      (sum: number, l: { outstanding_balance: number | null }) =>
        sum + Number(l.outstanding_balance ?? 0),
      0
    );

    return jsonResult({
      loan_count: loans.length,
      total_outstanding: outstanding,
      loans,
    });
  },
});
