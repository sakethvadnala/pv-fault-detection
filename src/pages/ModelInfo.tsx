import { useEffect, useState } from "react";
import { fetchModelMetrics, ModelMetrics } from "@/lib/api";
import { StatusCard } from "@/components/dashboard/StatusCard";

export default function ModelInfo() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

  useEffect(() => {
    fetchModelMetrics()
      .then(setMetrics)
      .catch((e) => console.error("Metrics load failed", e));
  }, []);

  const formatPercentage = (value?: number) =>
    value !== undefined ? (value * 100).toFixed(2) : "--";

  // Dynamic model info from backend
  const modelInfo = {
    name: "PV Fault LSTM Classifier",
    version: "v2.0",
    framework: "TensorFlow / Keras",
    lastTrained: new Date().toISOString(),
    architecture: "LSTM (5 features → N classes)",
    trainingDataset: "PV 12-month labeled dataset",
    inputFeatures: [
      "Voltage",
      "Current",
      "Power",
      "Irradiance",
      "Temperature"
    ],
    outputClasses: metrics?.labels || []
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Model Information</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Details about the trained fault classification model
        </p>
      </div>

      {/* Model Overview */}
      <div className="industrial-card">
        <h3 className="text-sm font-medium mb-4">Model Overview</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="data-label">Model Name</p>
            <p className="text-base font-medium mt-1">{modelInfo.name}</p>
          </div>
          <div>
            <p className="data-label">Version</p>
            <p className="text-base font-mono mt-1">{modelInfo.version}</p>
          </div>
          <div>
            <p className="data-label">Framework</p>
            <p className="text-base mt-1">{modelInfo.framework}</p>
          </div>
          <div>
            <p className="data-label">Last Trained</p>
            <p className="text-base mt-1">
              {new Date(modelInfo.lastTrained).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="data-label">Architecture</p>
          <p className="text-sm font-mono mt-1 text-muted-foreground">
            {modelInfo.architecture}
          </p>
        </div>

        <div className="mt-4">
          <p className="data-label">Training Dataset</p>
          <p className="text-sm mt-1 text-muted-foreground">
            {modelInfo.trainingDataset}
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-sm font-medium mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatusCard
            label="Accuracy"
            value={formatPercentage(metrics?.accuracy)}
            unit="%"
            status="normal"
          />
          <StatusCard
            label="Precision"
            value={formatPercentage(metrics?.precision)}
            unit="%"
            status="normal"
          />
          <StatusCard
            label="Recall"
            value={formatPercentage(metrics?.recall)}
            unit="%"
            status="normal"
          />
          <StatusCard
            label="F1 Score"
            value={formatPercentage(metrics?.f1)}
            unit="%"
            status="normal"
          />
        </div>
      </div>

      {/* Input Features */}
      <div className="industrial-card">
        <h3 className="text-sm font-medium mb-4">Input Features</h3>
        <div className="flex flex-wrap gap-2">
          {modelInfo.inputFeatures.map((feature) => (
            <span
              key={feature}
              className="px-3 py-1.5 bg-muted rounded-sm text-sm font-mono"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Output Classes */}
      <div className="industrial-card">
        <h3 className="text-sm font-medium mb-4">Output Classes</h3>

        {!metrics?.labels && (
          <p className="text-xs text-muted-foreground">Loading...</p>
        )}

        {metrics?.labels && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.labels.map((cls, idx) => (
              <div key={cls} className="p-3 bg-muted/50 rounded-sm">
                <p className="text-xs text-muted-foreground font-mono">
                  Class {idx}
                </p>
                <p className="text-sm font-medium mt-1">{cls}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confusion Matrix */}
      <div className="industrial-card">
        <h3 className="text-sm font-medium mb-4">Confusion Matrix</h3>

        {!metrics?.confusion_matrix && (
          <p className="text-xs text-muted-foreground">Loading...</p>
        )}

        {metrics?.confusion_matrix && metrics?.labels && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground">
                    Actual / Predicted
                  </th>
                  {metrics.labels.map((cls) => (
                    <th key={cls} className="p-2 text-center text-muted-foreground">
                      {cls.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.confusion_matrix.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="p-2 text-muted-foreground">
                      {metrics.labels[rowIdx]}
                    </td>
                    {row.map((value, colIdx) => (
                      <td
                        key={colIdx}
                        className={`p-2 text-center ${
                          rowIdx === colIdx
                            ? "bg-primary/20 text-primary font-medium"
                            : value > 0
                            ? "bg-muted"
                            : ""
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Values computed from training dataset
        </p>
      </div>
    </div>
  );
}