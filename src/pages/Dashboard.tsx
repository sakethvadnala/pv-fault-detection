import { useEffect, useState } from "react";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import {
  fetchPVTimeSeries,
  getSystemStatus,
  fetchActiveCriticalAlerts,
} from "@/lib/api";
import { PVDataPoint } from "@/types/pv-system";

export default function Dashboard() {
  const [timeSeriesData, setTimeSeriesData] =
    useState<PVDataPoint[]>([]);

  const [currentFault, setCurrentFault] =
    useState("Normal");

  const [confidence, setConfidence] =
    useState(0);

  const [activeAlerts, setActiveAlerts] =
    useState(0);

  const [lastUpdated, setLastUpdated] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  /*
   * Check whether a dataset has actually
   * been analyzed in this browser session.
   */
  const activeDatasetId =
    sessionStorage.getItem(
      "pv_active_dataset_id"
    );

  /* =========================
  LOAD DASHBOARD
  ========================= */

  const loadDashboard = async () => {
    try {
      const datasetId =
        sessionStorage.getItem(
          "pv_active_dataset_id"
        );

      /*
       * No analyzed dataset.
       * Nothing needs to be loaded.
       */
      if (!datasetId) {
        setTimeSeriesData([]);
        return;
      }

      const [
        status,
        criticalAlerts,
        pvData,
      ] = await Promise.all([
        getSystemStatus(),
        fetchActiveCriticalAlerts(),
        fetchPVTimeSeries(),
      ]);

      setCurrentFault(
        status.current_fault
      );

      setConfidence(
        Number(status.confidence)
      );

      setActiveAlerts(
        criticalAlerts
      );

      setLastUpdated(
        status.last_updated
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

      setTimeSeriesData(
        formattedData
      );

    } catch (error) {
      console.error(
        "Dashboard load error:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================
  AUTO REFRESH
  ========================= */

  useEffect(() => {
    loadDashboard();

    const interval =
      setInterval(
        loadDashboard,
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  /* =========================
  HIDE DASHBOARD BEFORE UPLOAD
  ========================= */

  /*
   * If there is no analyzed dataset,
   * completely hide the System Overview.
   */
  if (!activeDatasetId) {
    return null;
  }

  /* =========================
  DISPLAY VALUES
  ========================= */

  const formattedDate =
    lastUpdated
      ? new Date(
          lastUpdated
        ).toLocaleString(
          "en-US"
        )
      : "--";

  const confidencePercent =
    confidence * 100;

  const hasVoltage =
    timeSeriesData.some(
      (point) =>
        Number.isFinite(
          point.voltage
        )
    );

  const hasCurrent =
    timeSeriesData.some(
      (point) =>
        Number.isFinite(
          point.current
        )
    );

  const hasPower =
    timeSeriesData.some(
      (point) =>
        Number.isFinite(
          point.power
        )
    );

  /* =========================
  DASHBOARD
  ========================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <h2 className="text-lg font-semibold">
          System Overview
        </h2>

        <span className="text-xs text-muted-foreground font-mono">
          {isLoading
            ? "Loading..."
            : `Last updated: ${formattedDate}`}
        </span>

      </div>

      {/* STATUS CARDS */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <StatusCard
          label="System Status"
          value={
            currentFault ===
            "Normal"
              ? "Normal"
              : "Fault"
          }
          status={
            currentFault ===
            "Normal"
              ? "normal"
              : "fault"
          }
        />

        <StatusCard
          label="Detected Fault"
          value={currentFault}
          status={
            currentFault ===
            "Normal"
              ? "normal"
              : "fault"
          }
        />

        <StatusCard
          label="Model Confidence"
          value={confidencePercent.toFixed(
            1
          )}
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
          value={activeAlerts}
          status={
            activeAlerts === 0
              ? "normal"
              : "fault"
          }
        />

      </div>

      {/* GRAPHS */}

      {timeSeriesData.length > 0 && (
        <div className="grid grid-cols-1 gap-4">

          {/* VOLTAGE */}

          {hasVoltage && (
            <TimeSeriesChart
              data={timeSeriesData}
              dataKey="voltage"
              title="DC Voltage"
              unit="V"
              color="hsl(210, 90%, 50%)"
              showFaultZone={true}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* CURRENT */}

            {hasCurrent && (
              <TimeSeriesChart
                data={timeSeriesData}
                dataKey="current"
                title="DC Current"
                unit="A"
                color="hsl(142, 60%, 45%)"
                showFaultZone={true}
              />
            )}

            {/* POWER */}

            {hasPower && (
              <TimeSeriesChart
                data={timeSeriesData}
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