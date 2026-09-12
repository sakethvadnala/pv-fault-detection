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
  dataset_id: string | null;
  features_used: string[] | null;
  user_id: string;
  resolved: boolean;
  resolved_at: string | null;
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
  active_alerts: number;
  last_updated: string;
}

/* =============================
Helpers
============================= */

function getSeverity(
  confidence: number,
  faultType: string
): 'Low' | 'Medium' | 'High' | 'Critical' {
  const normalizedFault = faultType.trim().toLowerCase();

  if (normalizedFault === 'normal') return 'Low';

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
  const datasetId = crypto.randomUUID();

  /* =============================
  Call FastAPI backend
  ============================= */

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/predict-batch`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows: data }),
    }
  );

  if (!res.ok) {
    throw new Error('Failed to run prediction');
  }

  const json = await res.json();

  console.log('Prediction response:', json);

  /* =============================
  Aggregate predictions
  ============================= */

  const aggregated: Record<
    string,
    { total: number; count: number }
  > = {};

  for (const r of json.results) {
    if (!aggregated[r.fault]) {
      aggregated[r.fault] = {
        total: 0,
        count: 0,
      };
    }

    aggregated[r.fault].total += r.confidence;
    aggregated[r.fault].count += 1;
  }

  const results: PredictionResult[] = Object.entries(
    aggregated
  ).map(([fault, value]) => ({
    faultType: fault,
    probability: value.total / value.count,
  }));

  results.sort(
    (a, b) => b.probability - a.probability
  );

  if (results.length === 0) {
    throw new Error('No prediction results returned');
  }

  const topPrediction = results[0];

  const severity = getSeverity(
    topPrediction.probability,
    topPrediction.faultType
  );

  /* =============================
  Get current user
  ============================= */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User is not authenticated');
  }

  const userId = user.id;

  /* =============================
  Save prediction
  ============================= */

  const { error: predError } = await supabase
    .from('predictions')
    .insert({
      timestamp: new Date().toISOString(),
      predicted_fault: topPrediction.faultType,
      probabilities: Object.fromEntries(
        results.map((r) => [
          r.faultType,
          r.probability,
        ])
      ),
      dataset_name: datasetName || null,
      features_used: features,
      user_id: userId,
    });

  if (predError) {
    console.error(
      'Failed to save prediction:',
      predError
    );
  }

  /* =============================
  Save fault history
  ============================= */

  const normalizedDatasetName =
    datasetName?.trim() || null;

  const {
    data: existingHistory,
    error: existingError,
  } = await (
    supabase as any
  )
    .from('fault_history')
    .select(
      'id, resolved, resolved_at, timestamp, severity, confidence, dataset_id'
    )
    .eq('user_id', userId)
    .eq(
      'fault_type',
      topPrediction.faultType
    )
    .eq(
      'dataset_name',
      normalizedDatasetName
    )
    .order('created_at', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error(
      'Failed to check existing fault history:',
      existingError
    );
  }

  /*
   * Only insert if this dataset/fault
   * combination has never been recorded.
   */
  if (!existingHistory) {
    const {
      error: histError,
    } = await (
      supabase as any
    )
      .from('fault_history')
      .insert({
        timestamp: new Date().toISOString(),
        fault_type:
          topPrediction.faultType,
        severity,
        confidence:
          topPrediction.probability,
        dataset_name:
          normalizedDatasetName,

        /*
         * Connect this History record
         * to its graph dataset.
         */
        dataset_id: datasetId,

        features_used: features,
        user_id: userId,
        resolved: false,
        resolved_at: null,
      });

    if (histError) {
      console.error(
        'Failed to save fault history:',
        histError
      );
    }
  } else {
    console.log(
      'Fault history already exists for this dataset/fault. No duplicate created.'
    );
  }

  /* =============================
  Save dashboard time-series
  ============================= */

  if (
    Array.isArray(json.normalized_data) &&
    json.normalized_data.length > 0
  ) {
    const dashboardRows =
      json.normalized_data.map(
        (row: any) => ({
          timestamp: row.timestamp,

          voltage:
            row.voltage !== undefined
              ? Number(row.voltage)
              : null,

          current:
            row.current !== undefined
              ? Number(row.current)
              : null,

          power:
            row.power !== undefined
              ? Number(row.power)
              : null,

          irradiance:
            row.irradiance !== undefined
              ? Number(row.irradiance)
              : null,

          temperature:
            row.temperature !== undefined
              ? Number(row.temperature)
              : null,

          is_fault:
            Boolean(row.is_fault),

          user_id: userId,

          dataset_id: datasetId,
        })
      );

    const {
      error: pvError,
    } = await (
      supabase as any
    )
      .from('pv_timeseries')
      .insert(dashboardRows);

    if (pvError) {
      console.error(
        'Failed to save PV time-series:',
        JSON.stringify(
          pvError,
          null,
          2
        )
      );
    } else {
      console.log(
        'Saved dashboard rows:',
        dashboardRows.length
      );
    }
  } else {
    console.warn(
      'No normalized_data returned from backend'
    );
  }

  /* =============================
  Set active dashboard dataset
  ============================= */

  sessionStorage.setItem(
    'pv_active_dataset_id',
    datasetId
  );

  /* =============================
  Update system status
  ============================= */

  const {
    error: statusError,
  } = await (
    supabase as any
  )
    .from('system_status')
    .upsert({
      id: userId,
      user_id: userId,

      status:
        topPrediction.faultType === 'Normal'
          ? 'Normal'
          : 'Fault',

      current_fault:
        topPrediction.faultType,

      confidence:
        topPrediction.probability,

      active_alerts: 0,

      last_updated:
        new Date().toISOString(),
    });

  if (statusError) {
    console.error(
      'Failed to update system status:',
      statusError
    );
  }

  return {
    predictions: results,
    topPrediction,
    severity,
    timestamp:
      new Date().toISOString(),
  };
}

/* =============================
Fault History
============================= */

export async function fetchHistoryDirect(
  limit: number = 50,
  offset: number = 0
): Promise<HistoryResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'User is not authenticated'
    );
  }

  const {
    data,
    count,
    error,
  } = await (
    supabase as any
  )
    .from('fault_history')
    .select('*', {
      count: 'exact',
    })
    .eq('user_id', user.id)
    .order('created_at', {
      ascending: false,
    })
    .range(
      offset,
      offset + limit - 1
    );

  if (error) {
    console.error(
      'Fault history fetch error:',
      error
    );

    throw new Error(error.message);
  }

  return {
    history: (data || []).map(
      (row: any) => ({
        id: row.id,

        timestamp:
          row.timestamp ||
          row.created_at,

        fault_type:
          row.fault_type,

        severity:
          row.severity,

        confidence:
          Number(
            row.confidence ?? 0
          ),

        duration:
          row.duration ?? null,

        dataset_name:
          row.dataset_name ?? null,

        dataset_id:
          row.dataset_id ?? null,

        features_used:
          row.features_used ?? null,

        user_id:
          row.user_id,

        resolved:
          Boolean(
            row.resolved
          ),

        resolved_at:
          row.resolved_at ??
          null,
      })
    ),

    total:
      count || 0,

    limit,

    offset,
  };
}

/* =============================
Mark Fault Solved / Unsolved
============================= */

export async function updateFaultResolution(
  faultId: string,
  resolved: boolean
): Promise<void> {
  console.log(
    '[FAULT UPDATE] Starting:',
    {
      faultId,
      resolved,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'User is not authenticated'
    );
  }

  const now = resolved
    ? new Date().toISOString()
    : null;

  const {
    data,
    error,
  } = await (
    supabase as any
  )
    .from('fault_history')
    .update({
      resolved,
      resolved_at: now,
    })
    .eq('id', faultId)
    .eq('user_id', user.id)
    .select(
      'id, user_id, resolved, resolved_at, dataset_id'
    )
    .maybeSingle();

  console.log(
    '[FAULT UPDATE] Supabase response:',
    {
      data,
      error,
    }
  );

  if (error) {
    console.error(
      '[FAULT UPDATE] ERROR:',
      error
    );

    throw new Error(
      error.message ||
        'Failed to update fault status'
    );
  }

  if (!data) {
    throw new Error(
      'No fault record was updated. Check Supabase RLS UPDATE policy.'
    );
  }

  if (
    Boolean(data.resolved) !==
    resolved
  ) {
    throw new Error(
      'Fault status was not saved correctly.'
    );
  }

  console.log(
    '[FAULT UPDATE] SUCCESS:',
    data
  );
}

/* =============================
Load Historical Analysis
============================= */

export async function fetchHistoricalPVTimeSeries(
  datasetId: string
): Promise<PVTimeSeriesRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'User is not authenticated'
    );
  }

  const {
    data,
    error,
  } = await (
    supabase as any
  )
    .from('pv_timeseries')
    .select('*')
    .eq('user_id', user.id)
    .eq('dataset_id', datasetId)
    .order('timestamp', {
      ascending: true,
    });

  if (error) {
    console.error(
      'Historical PV time-series fetch error:',
      error
    );

    throw new Error(error.message);
  }

  return (data ||
    []) as PVTimeSeriesRecord[];
}

/* =============================
Active Critical Alerts
============================= */

export async function fetchActiveCriticalAlerts(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const {
    count,
    error,
  } = await (
    supabase as any
  )
    .from('fault_history')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', user.id)
    .eq('resolved', false)
    .eq('severity', 'Critical');

  if (error) {
    console.error(
      'Active critical alerts fetch error:',
      error
    );

    return 0;
  }

  return count || 0;
}

/* =============================
Dashboard Status
============================= */

export async function getSystemStatus(): Promise<SystemStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      id: 'default',
      status: 'Normal',
      current_fault: 'Normal',
      confidence: 0,
      active_alerts: 0,
      last_updated:
        new Date().toISOString(),
    };
  }

  const {
    data,
    error,
  } = await (
    supabase as any
  )
    .from('system_status')
    .select('*')
    .eq('user_id', user.id)
    .order('last_updated', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      id: 'default',
      status: 'Normal',
      current_fault: 'Normal',
      confidence: 0,
      active_alerts: 0,
      last_updated:
        new Date().toISOString(),
    };
  }

  return {
    id: data.id,

    status:
      data.status as
        | 'Normal'
        | 'Fault'
        | 'Warning',

    current_fault:
      data.current_fault,

    confidence:
      Number(
        data.confidence
      ),

    active_alerts:
      Number(
        data.active_alerts ?? 0
      ),

    last_updated:
      data.last_updated,
  };
}

/* =============================
Update Dashboard Status
============================= */

export async function updateSystemStatus(
  status:
    | 'Normal'
    | 'Fault'
    | 'Warning',

  currentFault: string,

  confidence: number
): Promise<SystemStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'User is not authenticated'
    );
  }

  const {
    data,
    error,
  } = await (
    supabase as any
  )
    .from('system_status')
    .upsert({
      id: user.id,

      user_id: user.id,

      status,

      current_fault:
        currentFault,

      confidence,

      active_alerts: 0,

      last_updated:
        new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error(
      'Status update error:',
      error
    );

    throw new Error(
      error.message ||
        'Failed to update status'
    );
  }

  return {
    id: data.id,

    status:
      data.status as
        | 'Normal'
        | 'Fault'
        | 'Warning',

    current_fault:
      data.current_fault,

    confidence:
      Number(
        data.confidence
      ),

    active_alerts:
      Number(
        data.active_alerts ?? 0
      ),

    last_updated:
      data.last_updated,
  };
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
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/metrics`
  );

  if (!res.ok) {
    throw new Error(
      'Failed to fetch model metrics'
    );
  }

  return res.json();
}

/* =============================
PV Time Series
============================= */

export interface PVTimeSeriesRecord {
  id?: string;
  timestamp: string;
  voltage?: number | null;
  current?: number | null;
  power?: number | null;
  irradiance?: number | null;
  temperature?: number | null;
  is_fault?: boolean | null;
  user_id: string;
  dataset_id: string;
}

export async function fetchPVTimeSeries(): Promise<
  PVTimeSeriesRecord[]
> {
  const datasetId =
    sessionStorage.getItem(
      'pv_active_dataset_id'
    );

  if (!datasetId) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error,
  } = await (
    supabase as any
  )
    .from('pv_timeseries')
    .select('*')
    .eq('user_id', user.id)
    .eq('dataset_id', datasetId)
    .order('timestamp', {
      ascending: true,
    });

  if (error) {
    console.error(
      'PV time-series fetch error:',
      error
    );

    return [];
  }

  return (data ||
    []) as PVTimeSeriesRecord[];
}