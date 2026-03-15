import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // =====================================================
    // 1️⃣ Fetch prediction history
    // =====================================================
    const { data, error } = await supabase
      .from("predictions")
      .select("id, predicted_fault, probabilities, timestamp")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    // =====================================================
    // 2️⃣ Transform rows for frontend
    // =====================================================
    const history = (data || []).map(row => {
      const probs = row.probabilities || {};
      const confidence =
        Object.values(probs).length > 0
          ? Math.round(Math.max(...Object.values(probs)) * 100)
          : 0;

      let severity = "Low";
      if (confidence >= 90) severity = "Critical";
      else if (confidence >= 80) severity = "High";
      else if (confidence >= 70) severity = "Medium";

      return {
        id: row.id,
        timestamp: row.timestamp,
        fault: row.predicted_fault,
        confidence,
        severity
      };
    });

    // =====================================================
    // ✅ Response
    // =====================================================
    return new Response(
      JSON.stringify(history),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "History API failed",
        details: String(err)
      }),
      { status: 500 }
    );
  }
});
