import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check if user has any admin role
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "emergency_admin", "petrol_loan_admin", "personal_loan_admin", "accident_admin", "funeral_admin"]);

    if (!adminRoles || adminRoles.length === 0) throw new Error("Admin access required");

    const { email, redirectUrl } = await req.json();
    if (!email) throw new Error("Email is required");

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectUrl || `${req.headers.get("origin")}/reset-password`,
      },
    });

    if (error) throw error;

    console.log(`Password reset email triggered for: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Password reset email sent to ${email}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message === "Unauthorized" || error.message === "Admin access required" ? 403 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
