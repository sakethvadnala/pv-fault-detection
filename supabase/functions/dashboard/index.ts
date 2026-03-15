import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // =====================================================
    // 1️⃣ Get latest prediction
    // =====================================================
    const { data: latest, error: latestError } = await supabase
      .from("predictions")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latest) {
      return new Response(
        JSON.stringify({
          systemStatus: "NORMAL",
          detectedFault: "None",
          modelConfidence: 0,
          activeAlerts: 0
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // =====================================================
    // 2️⃣ Compute confidence (max probability)
    // =====================================================
    const probabilities = latest.probabilities || {};
    const confidence =
      Object.values(probabilities).length > 0
        ? Math.round(Math.max(...Object.values(probabilities)) * 100)
        : 0;

    // =====================================================
    // 3️⃣ Determine system status
    // =====================================================
    const detectedFault = latest.predicted_fault;
    const systemStatus = detectedFault === "Normal" ? "NORMAL" : "FAULT";

    // =====================================================
    // 4️⃣ Count active alerts (non-normal faults)
    // =====================================================
    const { count } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .neq("predicted_fault", "Normal");

    // =====================================================
    // ✅ Response to frontend
    // =====================================================
    return new Response(
      JSON.stringify({
        systemStatus,
        detectedFault,
        modelConfidence: confidence,
        activeAlerts: count ?? 0
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Dashboard API failed",
        details: String(err)
      }),
      { status: 500 }
    );
  }
});
