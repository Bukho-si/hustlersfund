import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthenticated, toolError, jsonResult, currency } from "../supabase";

export default defineTool({
  name: "get_wallet_balances",
  title: "Get wallet balances",
  description:
    "Get the signed-in member's Hustlers Fund wallet: total savings/contributions, outstanding petrol and personal loan balances, emergency contributions and joining fee status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: wallet, error: walletError }, { data: profile }] = await Promise.all([
      supabase
        .from("member_wallets")
        .select(
          "contribution_balance, petrol_loan_balance, personal_loan_balance, emergency_contributions_total, joining_fee_balance, updated_at"
        )
        .eq("member_user_id", userId)
        .maybeSingle(),
      supabase
        .from("member_profiles")
        .select("full_name, status, membership_slots, joining_fee_paid, joining_fee_paid_total")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (walletError) return toolError(walletError.message);
    if (!wallet) return toolError("No wallet found for this member yet.");

    const totalLoans =
      Number(wallet.petrol_loan_balance ?? 0) + Number(wallet.personal_loan_balance ?? 0);

    return jsonResult({
      member: profile?.full_name ?? null,
      status: profile?.status ?? null,
      membership_slots: profile?.membership_slots ?? null,
      joining_fee_paid: profile?.joining_fee_paid ?? null,
      savings_balance: Number(wallet.contribution_balance ?? 0),
      petrol_loan_outstanding: Number(wallet.petrol_loan_balance ?? 0),
      personal_loan_outstanding: Number(wallet.personal_loan_balance ?? 0),
      total_loans_outstanding: totalLoans,
      emergency_contributions_total: Number(wallet.emergency_contributions_total ?? 0),
      net_position: Number(wallet.contribution_balance ?? 0) - totalLoans,
      summary: `Savings ${currency(wallet.contribution_balance)} · Loans owed ${currency(totalLoans)}`,
      last_updated: wallet.updated_at,
    });
  },
});
