import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {

    const body = await req.json().catch(() => null);

    if (!body || !body.data || body.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No dataset provided" }),
        { status: 400 }
      );
    }

    const dataset = body.data;
    const datasetName = body.datasetName ?? null;

    const row = dataset[dataset.length - 1];

    const mlRes = await fetch("http://host.docker.internal:8000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Voltage: Number(row.Voltage),
        Current: Number(row.Current),
        Power: Number(row.Power),
        Irradiance: Number(row.Irradiance),
        Temperature: Number(row.Temperature)
      })
    });

    if (!mlRes.ok) {
      const txt = await mlRes.text();
      return new Response(
        JSON.stringify({ error: "ML backend error", detail: txt }),
        { status: 500 }
      );
    }

    const ml = await mlRes.json();

    const allFaults = ["Normal", "Line-Line", "Ground", "Partial Shading"];

    const probabilities: Record<string, number> = {};

    allFaults.forEach((f) => {
      probabilities[f] =
        f === ml.fault ? ml.confidence : (1 - ml.confidence) / 3;
    });

    const predictions = Object.entries(probabilities).map(
      ([faultType, probability]) => ({
        faultType,
        probability
      })
    );

    const topPrediction = {
      faultType: ml.fault,
      probability: ml.confidence
    };

    let severity: "Low" | "Medium" | "High" | "Critical" = "Low";
    if (ml.confidence > 0.9) severity = "High";
    else if (ml.confidence > 0.75) severity = "Medium";

    await supabase.from("predictions").insert({
      fault_type: ml.fault,
      severity,
      confidence: ml.confidence,
      dataset_name: datasetName,
      features_used: ["Voltage", "Current", "Power", "Irradiance", "Temperature"]
    });

    const { data: existing } = await supabase
      .from("system_status")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("system_status")
        .update({
          status: ml.fault === "Normal" ? "Normal" : "Fault",
          current_fault: ml.fault,
          confidence: ml.confidence,
          last_updated: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("system_status").insert({
        status: ml.fault === "Normal" ? "Normal" : "Fault",
        current_fault: ml.fault,
        confidence: ml.confidence,
        last_updated: new Date().toISOString()
      });
    }

    return new Response(
      JSON.stringify({
        predictions,
        topPrediction,
        severity,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: String(err)
      }),
      { status: 500 }
    );
  }
});