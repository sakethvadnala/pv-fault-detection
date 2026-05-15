import { supabase } from '@/integrations/supabase/client';

/* =============================
Prediction Types
============================= */

export interface PredictionResult {
  faultType: string;
  probability: number;
}

export interface PredictionResponse {
  predictions: PredictionResult[];
  topPrediction: PredictionResult;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: string;
}

/* =============================
History Types
============================= */

export interface HistoryRecord {
  id: string;
  timestamp: string;
  fault_type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  duration: string | null;
  dataset_name: string | null;
  features_used: string[] | null;
}

export interface HistoryResponse {
  history: HistoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

/* =============================
Dashboard Status
============================= */

export interface SystemStatus {
  id: string;
  status: 'Normal' | 'Fault' | 'Warning';
  current_fault: string;
  confidence: number;
  last_updated: string;
}

/* =============================
Helpers
============================= */

function getSeverity(confidence: number, faultType: string): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (faultType === 'Normal') return 'Low';
  if (confidence > 0.9) return 'Critical';
  if (confidence > 0.75) return 'High';
  if (confidence > 0.5) return 'Medium';
  return 'Low';
}

/* =============================
Run ML Prediction — BATCH
============================= */

export async function runPrediction(
  data: Record<string, unknown>[],
  features: string[],
  datasetName?: string
): Promise<PredictionResponse> {

  const rows = data.map(row => ({
    Voltage: row['Voltage'] ?? row['voltage'] ?? 0,
    Current: row['Current'] ?? row['current'] ?? 0,
    Power: row['Power'] ?? row['power'] ?? 0,
    Irradiance: row['Irradiance'] ?? row['irradiance'] ?? 0,
    Temperature: row['Temperature'] ?? row['temperature'] ?? 0,
  }));

  const res = await fetch(`${import.meta.env.VITE_API_URL}/predict-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows })
  });

  if (!res.ok) throw new Error('Failed to run prediction');

  const json = await res.json();

  const aggregated: Record<string, { total: number; count: number }> = {};
  for (const r of json.results) {
    if (!aggregated[r.fault]) aggregated[r.fault] = { total: 0, count: 0 };
    aggregated[r.fault].total += r.confidence;
    aggregated[r.fault].count += 1;
  }

  const results: PredictionResult[] = Object.entries(aggregated).map(([fault, val]) => ({
    faultType: fault,
    probability: val.total / val.count
  }));

  results.sort((a, b) => b.probability - a.probability);
  const topPrediction = results[0];
  const severity = getSeverity(topPrediction.probability, topPrediction.faultType);

  // ✅ Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // ✅ Save to predictions table
  const { error: predError } = await supabase.from('predictions').insert({
    timestamp: new Date().toISOString(),
    predicted_fault: topPrediction.faultType,
    probabilities: Object.fromEntries(results.map(r => [r.faultType, r.probability])),
    dataset_name: datasetName || null,
    features_used: features,
    user_id: userId,
  });
  if (predError) console.error('Failed to save prediction:', predError);

  // ✅ Save to fault_history table
  const { error: histError } = await supabase.from('fault_history').insert({
    timestamp: new Date().toISOString(),
    fault_type: topPrediction.faultType,
    severity,
    confidence: topPrediction.probability,
    dataset_name: datasetName || null,
    features_used: features,
    user_id: userId,
  });
  if (histError) console.error('Failed to save fault history:', histError);

  // ✅ Update system_status — per user, use user id as row id
  const { error: statusError } = await supabase
    .from('system_status')
    .upsert({
      id: userId ?? '00000000-0000-0000-0000-000000000001',
      status: topPrediction.faultType === 'Normal' ? 'Normal' : 'Fault',
      current_fault: topPrediction.faultType,
      confidence: topPrediction.probability,
      last_updated: new Date().toISOString(),
      user_id: userId,
    });
  if (statusError) console.error('Failed to update system status:', statusError);

  return {
    predictions: results,
    topPrediction,
    severity,
    timestamp: new Date().toISOString()
  };
}

/* =============================
Fetch Prediction History
============================= */

export async function fetchHistoryDirect(
  limit: number = 50,
  offset: number = 0
) {
  const { data, count, error } = await supabase
    .from('predictions')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('History fetch error:', error);
    throw new Error(error.message);
  }

  return {
    history: data || [],
    total: count || 0,
    limit,
    offset
  };
}

/* =============================
Dashboard Status
============================= */

export async function getSystemStatus(): Promise<SystemStatus> {
  const { data, error } = await supabase
    .from('system_status')
    .select('*')
    .order('last_updated', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error('Status fetch error:', error);
    return {
      id: 'default',
      status: 'Normal',
      current_fault: 'Normal',
      confidence: 0,
      last_updated: new Date().toISOString()
    };
  }

  return {
    id: data.id,
    status: data.status,
    current_fault: data.current_fault,
    confidence: Number(data.confidence),
    last_updated: data.last_updated
  };
}

/* =============================
Update Dashboard Status
============================= */

export async function updateSystemStatus(
  status: 'Normal' | 'Fault' | 'Warning',
  currentFault: string,
  confidence: number
): Promise<SystemStatus> {
  const { data, error } = await supabase
    .from('system_status')
    .update({
      status,
      current_fault: currentFault,
      confidence,
      last_updated: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Status update error:', error);
    throw new Error(error.message || 'Failed to update status');
  }

  return data;
}

/* =============================
Dashboard Shortcut
============================= */

export async function fetchDashboard() {
  return getSystemStatus();
}

/* =============================
ML Model Metrics
============================= */

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: number[][];
  labels: string[];
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}