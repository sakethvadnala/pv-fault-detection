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
Run ML Prediction
============================= */

export async function runPrediction(
data: Record<string, unknown>[],
features: string[],
datasetName?: string
): Promise<PredictionResponse> {

const { data: response, error } = await supabase.functions.invoke(
'predict',
{
body: { data, features, datasetName }
}
);

if (error) {
console.error('Prediction error:', error);
throw new Error(error.message || 'Failed to run prediction');
}

return response as PredictionResponse;
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
Dashboard Status (FIXED)
============================= */

export async function getSystemStatus(): Promise<SystemStatus> {

const { data, error } = await supabase
.from('system_status')          // ✅ Correct table
.select('*')
.order('last_updated', { ascending: false })
.limit(1)
.single();

if (error || !data) {

```
console.error('Status fetch error:', error);

return {
  id: 'default',
  status: 'Normal',
  current_fault: 'Normal',
  confidence: 0,
  last_updated: new Date().toISOString()
};
```

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

const res = await fetch("http://127.0.0.1:8000/metrics");

if (!res.ok) {
throw new Error("Failed to fetch model metrics");
}

return res.json();
}
