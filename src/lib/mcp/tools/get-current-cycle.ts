import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthenticated, toolError, jsonResult } from "../supabase";

export default defineTool({
  name: "get_current_cycle",
  title: "Get current contribution cycle",
  description:
    "Get the open weekly contribution cycle (dates and deadline), the standard contribution amounts, and whether the signed-in member has already paid for it.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const [{ data: cycle, error: cycleError }, { data: settings }] = await Promise.all([
      supabase
        .from("contribution_cycles")
        .select("id, week_start_date, week_end_date, closes_on, deadline, is_closed")
        .eq("is_closed", false)
        .order("week_start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("contribution_settings")
        .select(
          "weekly_subscription_amount, joining_fee_amount, late_fine_amount, cash_atm_fee_amount"
        )
        .limit(1)
        .maybeSingle(),
    ]);

    if (cycleError) return toolError(cycleError.message);
    if (!cycle) {
      return jsonResult({ open_cycle: null, message: "No open contribution cycle right now." });
    }

    const { data: payment } = await supabase
      .from("payments")
      .select("id, status, total_amount, submitted_at")
      .eq("member_user_id", ctx.getUserId())
      .eq("cycle_id", cycle.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return jsonResult({
      open_cycle: cycle,
      amounts: settings ?? null,
      my_payment_for_cycle: payment ?? null,
      has_paid: payment?.status === "verified",
    });
  },
});
