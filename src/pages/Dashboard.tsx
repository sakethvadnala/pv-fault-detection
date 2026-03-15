import { useState, useEffect } from "react";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { generateTimeSeriesData } from "@/lib/mock-data";
import { getSystemStatus } from "@/lib/api";
import { PVDataPoint } from "@/types/pv-system";

export default function Dashboard() {

  const [timeSeriesData, setTimeSeriesData] = useState<PVDataPoint[]>([]);
  const [currentFault, setCurrentFault] = useState("Normal");
  const [confidence, setConfidence] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    const data = generateTimeSeriesData(24, true);
    setTimeSeriesData(data);

    async function loadStatus() {
      try {

        const status = await getSystemStatus();

        setCurrentFault(status.current_fault);
        setConfidence(Number(status.confidence));
        setLastUpdated(status.last_updated);

      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadStatus();

    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);

  }, []);

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString("en-US")
    : "--";

  const confidencePercent = confidence * 100;

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Overview</h2>
        <span className="text-xs text-muted-foreground font-mono">
          {isLoading ? "Loading..." : `Last updated: ${formattedDate}`}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">

        <StatusCard
          label="System Status"
          value={currentFault === "Normal" ? "Normal" : "Fault"}
          status={currentFault === "Normal" ? "normal" : "fault"}
        />

        <StatusCard
          label="Detected Fault"
          value={currentFault}
          status={currentFault === "Normal" ? "normal" : "fault"}
        />

        <StatusCard
          label="Model Confidence"
          value={confidencePercent.toFixed(1)}
          unit="%"
          status={
            confidence > 0.85
              ? "normal"
              : confidence > 0.5
              ? "warning"
              : "fault"
          }
        />

        <StatusCard
          label="Active Alerts"
          value={currentFault === "Normal" ? 0 : 1}
          status={currentFault === "Normal" ? "normal" : "fault"}
        />

      </div>

      <div className="grid grid-cols-1 gap-4">

        <TimeSeriesChart
          data={timeSeriesData}
          dataKey="voltage"
          title="DC Voltage"
          unit="V"
          color="hsl(210, 90%, 50%)"
          showFaultZone={true}
        />

        <div className="grid grid-cols-2 gap-4">

          <TimeSeriesChart
            data={timeSeriesData}
            dataKey="current"
            title="DC Current"
            unit="A"
            color="hsl(142, 60%, 45%)"
            showFaultZone={true}
          />

          <TimeSeriesChart
            data={timeSeriesData}
            dataKey="power"
            title="Output Power"
            unit="W"
            color="hsl(38, 92%, 50%)"
            showFaultZone={true}
          />

        </div>

      </div>

      <div className="industrial-card">

        <h3 className="text-sm font-medium mb-4">Current Readings</h3>

        {timeSeriesData.length > 0 && (

          <div className="grid grid-cols-5 gap-6">

            <div>
              <p className="data-label">Voltage</p>
              <p className="data-value">{timeSeriesData.at(-1)!.voltage.toFixed(2)} V</p>
            </div>

            <div>
              <p className="data-label">Current</p>
              <p className="data-value">{timeSeriesData.at(-1)!.current.toFixed(2)} A</p>
            </div>

            <div>
              <p className="data-label">Power</p>
              <p className="data-value">{timeSeriesData.at(-1)!.power.toFixed(2)} W</p>
            </div>

            <div>
              <p className="data-label">Irradiance</p>
              <p className="data-value">{timeSeriesData.at(-1)!.irradiance} W/m²</p>
            </div>

            <div>
              <p className="data-label">Temperature</p>
              <p className="data-value">{timeSeriesData.at(-1)!.temperature?.toFixed(1)} °C</p>
            </div>

          </div>

        )}

      </div>

    </div>
  );
}