import { useEffect, useMemo, useState } from "react";
import {
  fetchHistoryDirect,
  updateFaultResolution,
} from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type HistoryRow = {
  id: string;
  timestamp: string;
  fault_type: string;
  severity:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";
  confidence: number;
  resolved: boolean;
  resolved_at: string | null;
  dataset_name: string | null;
  dataset_id: string | null;
};

const ITEMS_PER_PAGE = 10;

export default function History() {
  const navigate = useNavigate();

  const [records, setRecords] =
    useState<HistoryRow[]>([]);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  /* =========================
  LOAD HISTORY
  ========================= */

  const loadHistory = async () => {
    try {
      const res =
        await fetchHistoryDirect(
          100,
          0
        );

      setRecords(
        res.history as HistoryRow[]
      );
    } catch (error) {
      console.error(
        "History load failed:",
        error
      );
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  /* =========================
  PAGINATION
  ========================= */

  const totalPages = Math.ceil(
    records.length /
      ITEMS_PER_PAGE
  );

  const paginatedRecords =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return records.slice(
        start,
        start + ITEMS_PER_PAGE
      );
    }, [
      records,
      currentPage,
    ]);

  /* =========================
  SEVERITY
  ========================= */

  const getSeverity = (
    faultType: string,
    confidence: number
  ) => {
    const normalized =
      faultType
        ?.trim()
        .toLowerCase() || "";

    if (
      normalized === "normal" ||
      normalized.includes("normal")
    ) {
      return "Low";
    }

    if (confidence > 0.9)
      return "Critical";

    if (confidence > 0.75)
      return "High";

    if (confidence > 0.5)
      return "Medium";

    return "Low";
  };

  const getSeverityClass = (
    severity: string
  ) => {
    switch (severity) {
      case "Critical":
        return "badge-fault";

      case "High":
        return "badge-fault";

      case "Medium":
        return "badge-warning";

      case "Low":
        return "badge-normal";

      default:
        return "badge-normal";
    }
  };

  /* =========================
  TIMESTAMP
  ========================= */

  const formatTimestamp = (
    timestamp: string
  ) => {
    return new Date(
      timestamp
    ).toLocaleString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  /* =========================
  VIEW ANALYSIS
  ========================= */

  const handleViewAnalysis = (
    record: HistoryRow
  ) => {
    if (!record.dataset_id) {
      return;
    }

    navigate(
      `/history/${record.id}`
    );
  };

  /* =========================
  SOLVED / UNSOLVED
  ========================= */

  const handleResolution =
    async (
      id: string,
      resolved: boolean
    ) => {
      try {
        setUpdatingId(id);

        await updateFaultResolution(
          id,
          resolved
        );

        setRecords((prev) =>
          prev.map(
            (record) =>
              record.id === id
                ? {
                    ...record,
                    resolved,
                    resolved_at:
                      resolved
                        ? new Date().toISOString()
                        : null,
                  }
                : record
          )
        );

        /*
         * If the currently displayed
         * dashboard analysis was solved,
         * remove it from the current
         * dashboard.
         */
        if (resolved) {
          const record =
            records.find(
              (item) =>
                item.id === id
            );

          const activeDatasetId =
            sessionStorage.getItem(
              "pv_active_dataset_id"
            );

          if (
            record?.dataset_id &&
            record.dataset_id ===
              activeDatasetId
          ) {
            sessionStorage.removeItem(
              "pv_active_dataset_id"
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to update issue:",
          error
        );
      } finally {
        setUpdatingId(null);
      }
    };

  /* =========================
  UI
  ========================= */

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-lg font-semibold">
          Fault History
        </h2>

        <p className="text-sm text-muted-foreground mt-1">
          Historical record of detected faults
          and system events
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
                <th>Status</th>
                <th>Action</th>
                <th>Analysis</th>
              </tr>
            </thead>

            <tbody>

              {paginatedRecords.map(
                (record) => {

                  const faultType =
                    record.fault_type ||
                    "Normal";

                  const confidence =
                    Number(
                      record.confidence ??
                        0
                    );

                  const severity =
                    record.severity ||
                    getSeverity(
                      faultType,
                      confidence
                    );

                  /*
                   * Normal means there is
                   * no fault, so it should
                   * never be marked solved.
                   */
                  const isNormal =
                    faultType
                      .trim()
                      .toLowerCase()
                      .includes("normal");

                  return (
                    <tr
                      key={record.id}
                    >

                      <td className="text-muted-foreground">
                        {record.id.slice(
                          0,
                          8
                        )}
                      </td>

                      <td>
                        {formatTimestamp(
                          record.timestamp
                        )}
                      </td>

                      <td className="font-medium">
                        {faultType}
                      </td>

                      <td>
                        <span
                          className={getSeverityClass(
                            severity
                          )}
                        >
                          {severity}
                        </span>
                      </td>

                      <td className="font-mono">
                        {(
                          confidence *
                          100
                        ).toFixed(1)}
                        %
                      </td>

                      <td>
                        <span
                          className={
                            isNormal
                              ? "badge-normal"
                              : record.resolved
                              ? "badge-normal"
                              : "badge-fault"
                          }
                        >
                          {isNormal
                            ? "Normal"
                            : record.resolved
                            ? "Solved"
                            : "Active"}
                        </span>
                      </td>

                      <td>
                        {!isNormal && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              updatingId ===
                              record.id
                            }
                            onClick={() =>
                              handleResolution(
                                record.id,
                                !record.resolved
                              )
                            }
                          >
                            {updatingId ===
                            record.id
                              ? "Updating..."
                              : record.resolved
                              ? "Mark Unsolved"
                              : "Mark Solved"}
                          </Button>
                        )}
                      </td>

                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !record.dataset_id
                          }
                          onClick={() =>
                            handleViewAnalysis(
                              record
                            )
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </td>

                    </tr>
                  );
                }
              )}

              {paginatedRecords.length ===
                0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No fault history available.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

        {/* PAGINATION */}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">

          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {records.length === 0
              ? 0
              : (currentPage - 1) *
                  ITEMS_PER_PAGE +
                1}{" "}
            to{" "}
            {Math.min(
              currentPage *
                ITEMS_PER_PAGE,
              records.length
            )}{" "}
            of{" "}
            {records.length}{" "}
            records
          </p>

          <div className="flex items-center gap-2">

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
              disabled={
                currentPage === 1
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm px-2">
              {currentPage} /{" "}
              {totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
              disabled={
                currentPage ===
                  totalPages ||
                totalPages === 0
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

          </div>

        </div>

      </div>
    </div>
  );
}