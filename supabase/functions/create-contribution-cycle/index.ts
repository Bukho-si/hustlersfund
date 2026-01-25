import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date in Africa/Johannesburg timezone
    const now = new Date();
    const joburg = new Intl.DateTimeFormat("en-ZA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    
    const year = parseInt(joburg.find(p => p.type === "year")?.value || "2026");
    const month = parseInt(joburg.find(p => p.type === "month")?.value || "1") - 1;
    const day = parseInt(joburg.find(p => p.type === "day")?.value || "1");
    
    const today = new Date(year, month, day);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate Monday of this week (week_start_date)
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    
    // Calculate Sunday of this week (week_end_date)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Calculate Tuesday (closes_on) - 23:59:59 SAST
    const tuesday = new Date(monday);
    tuesday.setDate(monday.getDate() + 1);
    
    // Calculate Wednesday (deadline) - 23:59:59 SAST
    const wednesday = new Date(monday);
    wednesday.setDate(monday.getDate() + 2);
    
    // Format dates
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const weekStartDate = formatDate(monday);
    const weekEndDate = formatDate(sunday);
    const closesOn = `${formatDate(tuesday)}T23:59:59+02:00`;
    const deadline = `${formatDate(wednesday)}T23:59:59+02:00`;

    console.log("Creating cycle for week:", { weekStartDate, weekEndDate, closesOn, deadline });

    // Check if a cycle already exists for this week
    const { data: existingCycle, error: checkError } = await supabase
      .from("contribution_cycles")
      .select("id")
      .eq("week_start_date", weekStartDate)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing cycle:", checkError);
      throw checkError;
    }

    if (existingCycle) {
      console.log("Cycle already exists for this week:", existingCycle.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Cycle already exists for this week",
          cycle_id: existingCycle.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new cycle
    const { data: newCycle, error: insertError } = await supabase
      .from("contribution_cycles")
      .insert({
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        closes_on: closesOn,
        deadline: deadline,
        is_closed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating cycle:", insertError);
      throw insertError;
    }

    console.log("New cycle created:", newCycle.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "New contribution cycle created",
        cycle: newCycle 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in create-contribution-cycle:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
