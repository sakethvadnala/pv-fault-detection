import { useState } from 'react';
import { FileUpload } from '@/components/analysis/FileUpload';
import { DataPreview } from '@/components/analysis/DataPreview';
import { PredictionResults } from '@/components/analysis/PredictionResults';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, RotateCcw } from 'lucide-react';
import { FaultType } from '@/types/pv-system';
import { runPrediction, PredictionResponse } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const availableFeatures = ['Voltage', 'Current', 'Power', 'Irradiance', 'Temperature'];

export default function Analysis() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dataset, setDataset] = useState<Record<string, unknown>[] | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['Voltage', 'Current', 'Power']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictionResults, setPredictionResults] = useState<{ faultType: FaultType; probability: number }[] | null>(null);
  const [predictionTimestamp, setPredictionTimestamp] = useState<string>('');

  // =============================
  // FILE PARSING (REAL DATASET)
  // =============================
  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setPredictionResults(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setDataset(jsonData as Record<string, unknown>[]);

      toast.success('Dataset loaded successfully');
    };

    reader.readAsBinaryString(file);
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  // =============================
  // RUN INFERENCE (REAL BACKEND)
  // =============================
  const handleRunInference = async () => {
    if (!dataset) return;

    setIsAnalyzing(true);

    try {
      const response: PredictionResponse = await runPrediction(
        dataset,
        selectedFeatures,
        uploadedFile?.name
      );

      const results = response.predictions.map(p => ({
        faultType: p.faultType as FaultType,
        probability: p.probability
      }));

      setPredictionResults(results);
      setPredictionTimestamp(response.timestamp);

      toast.success(
        `Analysis complete: ${response.topPrediction.faultType} detected`,
        {
          description: `Confidence: ${(response.topPrediction.probability * 100).toFixed(1)}%`
        }
      );

    } catch (error) {
      console.error('Inference error:', error);

      toast.error('Inference failed', {
        description: error instanceof Error ? error.message : 'Backend error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setDataset(null);
    setPredictionResults(null);
    setSelectedFeatures(['Voltage', 'Current', 'Power']);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Data Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PV system data for fault detection and classification
          </p>
        </div>
        {(uploadedFile || dataset) && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {/* FILE UPLOAD */}
      <div className="industrial-card">
        <h3 className="text-sm font-medium mb-4">Dataset Upload</h3>
        <FileUpload onFileSelect={handleFileSelect} isLoading={false} />

        {uploadedFile && (
          <div className="mt-3 p-3 bg-muted/50 rounded-sm flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-sm">
              <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* DATA PREVIEW */}
      {dataset && (
        <DataPreview
          data={dataset}
          columns={Object.keys(dataset[0])}
          fileName={uploadedFile?.name || 'dataset.xlsx'}
          rowCount={dataset.length}
        />
      )}

      {/* FEATURE SELECTION */}
      {dataset && (
        <div className="industrial-card">
          <h3 className="text-sm font-medium mb-4">Feature Selection</h3>
          <div className="flex flex-wrap gap-4">
            {availableFeatures.map((feature) => (
              <label key={feature} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedFeatures.includes(feature)}
                  onCheckedChange={() => handleFeatureToggle(feature)}
                />
                <span className="text-sm">{feature}</span>
              </label>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button
              onClick={handleRunInference}
              disabled={selectedFeatures.length < 2 || isAnalyzing}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Model Inference
                </>
              )}
            </Button>

            {selectedFeatures.length < 2 && (
              <p className="text-xs text-muted-foreground mt-2">
                Select at least 2 features to run inference
              </p>
            )}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {predictionResults && (
        <PredictionResults
          results={predictionResults}
          timestamp={predictionTimestamp || new Date().toISOString()}
        />
      )}
    </div>
  );
}
