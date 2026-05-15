import { useEffect, useState, useMemo } from "react";
import { fetchHistoryDirect } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HistoryRow = {
  id: string;
  timestamp: string;
  predicted_fault: string;
  probabilities: Record<string, number>;
};

const ITEMS_PER_PAGE = 10;

export default function History() {
  const [records, setRecords] = useState<HistoryRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // =========================
  // LOAD REAL SUPABASE DATA
  // =========================
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchHistoryDirect(100, 0);
        setRecords(res.history as any);
      } catch (e) {
        console.error("History load failed", e);
      }
    };
    load();
  }, []);

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return records.slice(start, start + ITEMS_PER_PAGE);
  }, [records, currentPage]);

  // =========================
// SEVERITY LOGIC (Fixed)
// =========================
const getSeverity = (faultType: string, confidence: number) => {
  const normalized = faultType?.trim().toLowerCase() || '';

  // Normal should ALWAYS be Low
  if (normalized === 'normal' || normalized.includes('normal')) {
    return 'Low';
  }

  // For actual faults
  if (confidence > 0.9) return 'Critical';
  if (confidence > 0.75) return 'High';
  if (confidence > 0.5) return 'Medium';
  return 'Low';
};

const getSeverityClass = (severity: string) => {
  switch (severity) {
    case "Critical":
      return "badge-fault";        // red
    case "High":
      return "badge-fault";        // or make it orange if you prefer
    case "Medium":
      return "badge-warning";
    case "Low":
      return "badge-normal";
    default:
      return "badge-normal";
  }
};

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fault History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Historical record of detected faults and system events
        </p>
      </div>

      <div className="industrial-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Fault Type</th>
                <th>Severity</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((r) => {
  const faultType = r.predicted_fault || 'Normal';
  const conf = r.probabilities?.[faultType] ?? r.probabilities?.[Object.keys(r.probabilities || {})[0]] ?? 0;
  
  const severity = getSeverity(faultType, conf);

  return (
    <tr key={r.id}>
      <td className="text-muted-foreground">
        {r.id.slice(0, 8)}
      </td>
      <td>{formatTimestamp(r.timestamp)}</td>
      <td className="font-medium">
        {faultType}
      </td>
      <td>
        <span className={getSeverityClass(severity)}>
          {severity}
        </span>
      </td>
      <td className="font-mono">
        {(conf * 100).toFixed(1)}%
      </td>
    </tr>
  );
})}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, records.length)} of{" "}
            {records.length} records
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.max(1, p - 1))
              }
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm px-2">
              {currentPage} / {totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
