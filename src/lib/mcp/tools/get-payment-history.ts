import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, toolError, jsonResult } from "../supabase";

export default defineTool({
  name: "get_payment_history",
  title: "Get payment history",
  description:
    "List the signed-in member's submitted weekly contributions and other payments, with amounts, method, verification status and the cycle they belong to.",
  inputSchema: {
    status: z
      .enum(["submitted", "pending_verification", "verified", "rejected", "withdrawn"])
      .optional()
      .describe("Filter to a single payment status."),
    limit: z.number().int().optional().describe("Maximum payments to return. Defaults to 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("payments")
      .select(
        "id, method, base_amount, joining_fee_amount, late_fine_amount, cash_fee_amount, total_amount, status, submitted_at, verified_at, notes, cycle_id, contribution_cycles(week_start_date, week_end_date)"
      )
      .eq("member_user_id", ctx.getUserId())
      .order("submitted_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return toolError(error.message);

    const payments = data ?? [];
    const verifiedTotal = payments
      .filter((p: { status: string }) => p.status === "verified")
      .reduce(
        (sum: number, p: { total_amount: number | null }) => sum + Number(p.total_amount ?? 0),
        0
      );

    return jsonResult({
      payment_count: payments.length,
      verified_total_in_result: verifiedTotal,
      payments,
    });
  },
});
