import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchHistoryDirect,
  fetchHistoricalPVTimeSeries,
} from "@/lib/api";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { PVDataPoint } from "@/types/pv-system";

type HistoryAnalysisData = {
  faultType: string;
  severity:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
  confidence: number;
  resolved: boolean;
  resolvedAt: string | null;
  datasetName: string | null;
  timestamp: string;
};

export default function HistoryAnalysis() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  const [analysis, setAnalysis] =
    useState<HistoryAnalysisData | null>(
      null
    );

  const [chartData, setChartData] =
    useState<PVDataPoint[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  /* =========================
  LOAD HISTORICAL ANALYSIS
  ========================= */

  useEffect(() => {
    const loadAnalysis =
      async () => {
        try {
          if (!id) {
            throw new Error(
              "Analysis ID is missing"
            );
          }

          const history =
            await fetchHistoryDirect(
              100,
              0
            );

          const record =
            history.history.find(
              (item) =>
                item.id === id
            );

          if (!record) {
            throw new Error(
              "Analysis record not found"
            );
          }

          if (!record.dataset_id) {
            throw new Error(
              "This historical record does not have a linked dataset."
            );
          }

          setAnalysis({
            faultType:
              record.fault_type,

            severity:
              record.severity,

            confidence:
              Number(
                record.confidence
              ),

            resolved:
              record.resolved,

            resolvedAt:
              record.resolved_at,

            datasetName:
              record.dataset_name,

            timestamp:
              record.timestamp,
          });

          const pvData =
            await fetchHistoricalPVTimeSeries(
              record.dataset_id
            );

          const formattedData:
            PVDataPoint[] =
            pvData.map(
              (row: any) => ({
                timestamp:
                  row.timestamp,

                voltage:
                  row.voltage !== null &&
                  row.voltage !== undefined
                    ? Number(
                        row.voltage
                      )
                    : 0,

                current:
                  row.current !== null &&
                  row.current !== undefined
                    ? Number(
                        row.current
                      )
                    : 0,

                power:
                  row.power !== null &&
                  row.power !== undefined
                    ? Number(
                        row.power
                      )
                    : 0,

                irradiance:
                  row.irradiance !== null &&
                  row.irradiance !== undefined
                    ? Number(
                        row.irradiance
                      )
                    : undefined,

                temperature:
                  row.temperature !== null &&
                  row.temperature !== undefined
                    ? Number(
                        row.temperature
                      )
                    : undefined,

                isFault:
                  Boolean(
                    row.is_fault
                  ),
              })
            );

          setChartData(
            formattedData
          );

        } catch (error) {
          console.error(
            "Failed to load historical analysis:",
            error
          );
        } finally {
          setIsLoading(false);
        }
      };

    loadAnalysis();
  }, [id]);

  /* =========================
  LOADING
  ========================= */

  if (isLoading) {
    return (
      <div className="industrial-card min-h-[400px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading analysis...
        </p>
      </div>
    );
  }

  /* =========================
  NOT FOUND
  ========================= */

  if (!analysis) {
    return (
      <div className="space-y-6">

        <Button
          variant="outline"
          onClick={() =>
            navigate("/history")
          }
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>

        <div className="industrial-card min-h-[300px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Historical analysis could not be found.
          </p>
        </div>

      </div>
    );
  }

  const confidence =
    analysis.confidence * 100;

  const hasVoltage =
    chartData.some(
      (point) =>
        Number.isFinite(
          point.voltage
        )
    );

  const hasCurrent =
    chartData.some(
      (point) =>
        Number.isFinite(
          point.current
        )
    );

  const hasPower =
    chartData.some(
      (point) =>
        Number.isFinite(
          point.power
        )
    );

  /* =========================
  UI
  ========================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-lg font-semibold">
            Historical Analysis
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            {analysis.datasetName ||
              "Previous PV analysis"}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            navigate("/history")
          }
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>

      </div>

      {/* ANALYSIS SUMMARY */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="industrial-card">

          <p className="text-xs text-muted-foreground uppercase">
            Fault Type
          </p>

          <p className="text-lg font-semibold mt-2">
            {analysis.faultType}
          </p>

        </div>

        <div className="industrial-card">

          <p className="text-xs text-muted-foreground uppercase">
            Severity
          </p>

          <p className="text-lg font-semibold mt-2">
            {analysis.severity}
          </p>

        </div>

        <div className="industrial-card">

          <p className="text-xs text-muted-foreground uppercase">
            Confidence
          </p>

          <p className="text-lg font-semibold mt-2">
            {confidence.toFixed(1)}%
          </p>

        </div>

        <div className="industrial-card">

          <p className="text-xs text-muted-foreground uppercase">
            Status
          </p>

          <p className="text-lg font-semibold mt-2">
            {analysis.resolved
              ? "Solved"
              : "Active"}
          </p>

        </div>

      </div>

      {/* TIMESTAMP */}

      <div className="text-xs text-muted-foreground font-mono">
        Analysis time:{" "}
        {new Date(
          analysis.timestamp
        ).toLocaleString(
          "en-US"
        )}
      </div>

      {/* GRAPHS */}

      {chartData.length === 0 ? (
        <div className="industrial-card min-h-[300px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No graph data is available for this analysis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">

          {hasVoltage && (
            <TimeSeriesChart
              data={chartData}
              dataKey="voltage"
              title="DC Voltage"
              unit="V"
              color="hsl(210, 90%, 50%)"
              showFaultZone={true}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {hasCurrent && (
              <TimeSeriesChart
                data={chartData}
                dataKey="current"
                title="DC Current"
                unit="A"
                color="hsl(142, 60%, 45%)"
                showFaultZone={true}
              />
            )}

            {hasPower && (
              <TimeSeriesChart
                data={chartData}
                dataKey="power"
                title="Output Power"
                unit="W"
                color="hsl(38, 92%, 50%)"
                showFaultZone={true}
              />
            )}

          </div>

        </div>
      )}

    </div>
  );
}