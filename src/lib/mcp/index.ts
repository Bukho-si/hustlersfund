import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getWalletBalances from "./tools/get-wallet-balances";
import getAccountStatement from "./tools/get-account-statement";
import getLoanHistory from "./tools/get-loan-history";
import getPaymentHistory from "./tools/get-payment-history";
import getCurrentCycle from "./tools/get-current-cycle";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (Vite inlines this literal at build time, so the module stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hustlers-fund",
  title: "Hustlers Fund",
  version: "0.1.0",
  instructions:
    "Tools for Hustlers Fund, a stokvel savings platform for South African Uber drivers. All tools act as the signed-in member and are read-only. Use `get_wallet_balances` for savings and loan totals, `get_account_statement` for the chronological ledger, `get_loan_history` for petrol/personal loans, `get_payment_history` for weekly contributions, and `get_current_cycle` for this week's deadline and whether the member has paid. Amounts are South African Rand (R).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getWalletBalances, getAccountStatement, getLoanHistory, getPaymentHistory, getCurrentCycle],
});
