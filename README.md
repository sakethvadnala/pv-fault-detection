# ⚡ PV Fault Detection System

An end-to-end AI-powered fault detection and classification platform for solar photovoltaic (PV) systems.

The system combines a React + TypeScript frontend, FastAPI backend, TensorFlow/Keras LSTM model, and Supabase database to provide authenticated PV fault analysis, dataset-based inference, current system monitoring, and persistent prediction history.

🌐 **Live Demo:** [pv-fault-detection.onrender.com](https://lnkd.in/gHinCFgw)  
📦 **GitHub:** [github.com/sakethvadnala/pv-fault-detection](https://github.com/sakethvadnala/pv-fault-detection)

---

## 🔍 What It Does

The system allows users to upload PV sensor datasets and run fault detection using a trained LSTM neural network.

Each analysis processes PV measurements and generates:

- Fault classification
- Model confidence score
- Fault severity
- Time-series visualization
- Persistent prediction history
- Historical analysis with its original dataset graphs

The current system is designed around **dataset-based PV analysis**, while keeping the architecture ready for future real-time sensor and hardware integration.

### Supported Fault Classes

| Fault Type | Description |
|---|---|
| ✅ Normal | Healthy system operation |
| ⚡ Ground Fault | Unintended electrical connection between a conductor and ground |
| 🔁 Line-Line Fault | Short circuit between two electrical conductors |
| 🌥️ Partial Shading | Reduced irradiance affecting part of the PV system |

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      User Login      │
                    │    Google OAuth      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │ React + TypeScript    │
                    │      + Vite          │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
        ┌─────────────────┐        ┌─────────────────┐
        │ Dataset Upload  │        │   Dashboard     │
        │    Analysis     │        │ Current Result  │
        └────────┬────────┘        └────────┬────────┘
                 │                          │
                 ▼                          │
        ┌────────────────────────────────────────┐
        │             FastAPI Backend             │
        │          ML Inference Pipeline          │
        └───────────────────┬────────────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ TensorFlow / Keras   │
                 │    LSTM Classifier   │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Prediction Results   │
                 │ Fault + Confidence   │
                 │ + Severity           │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │      Supabase        │
                 │ PostgreSQL + RLS     │
                 └──────────┬───────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       Current Analysis              Fault History
       / Dashboard                  / Historical Data
              │                           │
              │                           ▼
              │                    View Analysis
              │                           │
              │                           ▼
              │                    Historical Graphs
              │
              ▼
        System Monitoring
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, shadcn-ui, Vite |
| Backend | FastAPI, Python |
| Machine Learning | TensorFlow / Keras |
| Model | LSTM Neural Network |
| Data Processing | Pandas, scikit-learn, joblib |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth + Google OAuth |
| Security | Row Level Security (RLS) |
| Dataset Input | Excel / XLSX |
| Charts | Recharts |
| Deployment | Render |

---

# ✨ Key Features

## 🔐 Secure Authentication

Users authenticate through Google OAuth using Supabase Auth.

Each authenticated user has isolated data through PostgreSQL Row Level Security (RLS).

Users can only access their own:

- PV time-series data
- Fault history
- Analysis results
- System information

---

## 📁 Dataset Upload & Analysis

Users can upload PV datasets in Excel format and select the required input features before running inference.

The analysis pipeline:

```text
Excel Dataset
      ↓
Feature Selection
      ↓
Preprocessing
      ↓
LSTM Model
      ↓
Fault Prediction
      ↓
Confidence Score
      ↓
Severity Calculation
      ↓
Database Storage
```

The system supports batch inference, allowing large datasets to be processed through a single analysis request.

---

## 📊 Current Analysis Dashboard

The Dashboard represents the **currently analyzed dataset** rather than displaying unrelated historical results.

After a successful analysis, the Dashboard displays:

- System Status
- Detected Fault
- Model Confidence
- Active Critical Alerts
- Voltage graph
- Current graph
- Power graph
- Fault regions in the time series

If no dataset has been analyzed in the current session, the Dashboard displays an upload prompt instead of showing empty or misleading system information.

```text
No Analysis
     ↓
Upload Dataset
     ↓
Run Inference
     ↓
Current Analysis
     ↓
Dashboard
```

---

## 📈 Fault History

Every analysis is stored in the user's fault history.

The History page provides:

- Fault type
- Timestamp
- Severity
- Confidence
- Active/Solved status
- Dataset association
- Historical analysis access

The system maintains historical records even when an issue is marked as solved.

---

## 🔗 Dataset-Linked Historical Analysis

Each newly created analysis is associated with a unique `dataset_id`.

This allows a historical fault record to be connected to the exact PV time-series dataset that produced it.

Users can select:

```text
History
   ↓
View
   ↓
Historical Analysis
   ↓
Original Voltage / Current / Power Graphs
```

The historical analysis page displays:

- Fault type
- Severity
- Confidence
- Resolution status
- Original time-series data
- Voltage graph
- Current graph
- Power graph

This keeps historical analysis separate from the currently active Dashboard analysis.

---

## ✅ Fault Resolution

Detected faults can be marked as:

```text
Active
   ↓
Mark Solved
   ↓
Solved
```

A solved fault can also be reopened:

```text
Solved
   ↓
Mark Unsolved
   ↓
Active
```

When the currently displayed dataset is marked as solved, it is removed from the active Dashboard view while remaining available in Fault History.

### Normal State

`Normal` represents healthy system operation.

Therefore, normal records:

- Are not treated as active faults
- Do not display a "Mark Solved" action
- Are displayed with a Normal status

---

# 🧠 Machine Learning Model

The system uses a Long Short-Term Memory (LSTM) neural network for PV fault classification.

### Model Details

| Property | Details |
|---|---|
| Architecture | LSTM Neural Network |
| Framework | TensorFlow / Keras |
| Input | PV electrical/environmental features |
| Output | Fault class |
| Confidence | Model prediction probability |
| Preprocessing | Feature scaling / normalization |
| Serialization | Saved model + preprocessing artifacts |

### Input Features

The model uses:

```text
Voltage
Current
Power
Irradiance
Temperature
```

### Output

The model produces a predicted class along with a confidence score.

Example:

```text
Fault Type: Partial Shading
Confidence: 94.6%
Severity: Critical
```

---

# 🧪 Model Information

The application includes a dedicated Model Information page.

Model performance information is retrieved from the backend rather than manually entered into the frontend.

The page can display:

- Accuracy
- Precision
- Recall
- F1 Score
- Output classes
- Confusion matrix

### Performance

The current trained model is documented with an accuracy of approximately:

**97.3%**

> Performance metrics shown in the application are retrieved from the model metrics endpoint.

---

# 🗄️ Database Design

Supabase PostgreSQL is used for persistent storage.

The system stores user-specific analysis information and PV time-series data.

### Fault History

Important fields include:

```text
id
user_id
timestamp
fault_type
severity
confidence
duration
dataset_name
dataset_id
resolved
resolved_at
features_used
```

### PV Time Series

The stored time-series data is associated with:

```text
user_id
dataset_id
timestamp
voltage
current
power
irradiance
temperature
is_fault
```

The `dataset_id` relationship allows historical predictions to be connected to their original time-series data.

---

# 🔒 Security

The application uses Supabase Row Level Security (RLS) to provide per-user database isolation.

The security model follows:

```text
User A
   ↓
Only User A's data

User B
   ↓
Only User B's data
```

Database queries are filtered by the authenticated user's identity, while RLS provides database-level protection.

Authentication is handled using Supabase Auth with Google OAuth.

---

# 📱 Responsive Interface

The frontend is designed to work across:

- Desktop
- Laptop
- Tablet
- Mobile devices

The interface uses Tailwind CSS and shadcn-ui components for a consistent responsive design.

---

# 📊 Application Pages

## Dashboard

Displays the current analyzed dataset:

- System status
- Current fault
- Confidence
- Active alerts
- PV time-series graphs

## Analysis

Used to:

- Upload Excel datasets
- Select input features
- Run ML inference
- View prediction results
- Reset the current analysis

## History

Used to:

- Review previous analyses
- Check fault severity
- Check confidence
- Track Active/Solved issues
- Open historical analyses

## Historical Analysis

Used to inspect a specific previous analysis and its associated time-series data.

## Model Information

Provides information about:

- Model architecture
- Framework
- Input features
- Performance metrics
- Output classes
- Confusion matrix

---

# 📁 Project Structure

```text
pv-fault-detection/
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   └── ui/
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Analysis.tsx
│   │   ├── History.tsx
│   │   ├── HistoryAnalysis.tsx
│   │   ├── ModelInfo.tsx
│   │   └── Settings.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   └── ...
│   │
│   └── types/
│       └── pv-system.ts
│
├── ml-backend/
│   ├── main.py
│   ├── model/
│   │   ├── ...
│   │
│   └── utils.py
│
├── supabase/
│   └── migrations/
│
├── public/
│
├── render.yaml
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

- Node.js ≥ 18
- npm
- Python ≥ 3.9
- Supabase account
- Google OAuth credentials

## Frontend Setup

```bash
# Clone the repository
git clone https://github.com/sakethvadnala/pv-fault-detection.git

# Enter project directory
cd pv-fault-detection

# Install dependencies
npm install

# Start development server
npm run dev
```

## Backend Setup

```bash
cd ml-backend

# Create virtual environment
python -m venv venv
```

### Windows

```bash
venv\Scriptsctivate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install fastapi uvicorn tensorflow scikit-learn joblib pandas openpyxl supabase
```

Run the backend:

```bash
uvicorn main:app --reload
```

---

# 🔑 Environment Variables

Create a `.env` file containing:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_fastapi_backend_url
```

The backend should also be configured with the required Supabase and model environment variables.

---

# 🔄 Application Workflow

The complete workflow is:

```text
1. User signs in with Google
             ↓
2. User opens Analysis
             ↓
3. Uploads PV Excel dataset
             ↓
4. Selects required features
             ↓
5. Runs inference
             ↓
6. FastAPI processes dataset
             ↓
7. LSTM predicts fault classes
             ↓
8. Predictions are aggregated
             ↓
9. Results stored in Supabase
             ↓
10. Current dataset becomes active
             ↓
11. Dashboard displays current results
             ↓
12. History stores the analysis
             ↓
13. User can open View Analysis
             ↓
14. Historical graphs are loaded
```

---

# 🎯 Current System State

The core application is currently functional as a **dataset-driven PV fault detection platform**.

### Implemented

- [x] Google OAuth authentication
- [x] Per-user database isolation
- [x] Excel dataset upload
- [x] Batch ML inference
- [x] LSTM fault classification
- [x] Confidence scoring
- [x] Fault severity
- [x] Current analysis Dashboard
- [x] Voltage / Current / Power visualization
- [x] Persistent fault history
- [x] Active / Solved fault tracking
- [x] Historical analysis viewing
- [x] Dataset-linked historical graphs
- [x] Backend-driven model metrics
- [x] Confusion matrix
- [x] Responsive interface
- [x] Render deployment


# 🧠 What I Learned

Building this project provided practical experience in:

- End-to-end machine learning deployment
- LSTM-based classification
- TensorFlow / Keras model serving
- FastAPI REST API development
- React + TypeScript frontend development
- Excel data processing
- Supabase PostgreSQL
- Row Level Security
- OAuth authentication
- Persistent user-specific data
- Dataset-to-database relationships
- Historical data visualization
- Full-stack deployment using Render

===
