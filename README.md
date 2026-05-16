# ⚡ PV Fault Detection System

An end-to-end AI-powered fault detection and classification system for solar photovoltaic (PV) panels. Built with a production-grade full-stack architecture — React frontend, FastAPI backend, LSTM neural network (97.3% accuracy), and Supabase for secure per-user data storage.

🌐 **Live Demo:** [pv-fault-detection.onrender.com](https://lnkd.in/gHinCFgw)  
📦 **GitHub:** [github.com/sakethvadnala/pv-fault-detection](https://github.com/sakethvadnala/pv-fault-detection)

---

## 🔍 What It Does

The system takes real-time PV sensor readings and classifies faults using a deep learning model. It identifies:

| Fault Type | Description |
|---|---|
| ✅ Normal | Healthy operation |
| ⚡ Ground Fault | Unintended connection between a conductor and ground |
| 🔁 Line-Line Fault | Short circuit between two conductors |
| 🌥️ Partial Shading | Reduced irradiance on part of the panel array |

Each prediction comes with a **confidence score** and **severity level**.

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, shadcn-ui, Vite |
| Backend | FastAPI (Python) |
| ML Model | LSTM Neural Network — TensorFlow / Keras |
| Preprocessing | scikit-learn, joblib |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Google OAuth via Supabase Auth |
| Deployment | Render (frontend + backend) |

---

## ✨ Key Features

- 🔐 **Google Gmail Authentication** — secure OAuth login with per-user data isolation
- 📊 **Real-time Dashboard** — system status, model confidence, sensor charts (Voltage, Current, Power, Irradiance, Temperature)
- 📁 **Batch Excel Upload** — upload datasets and run fault inference across thousands of rows in a single API call
- 📈 **Prediction History** — per-user history with timestamps, severity levels, and confidence scores
- 🧠 **Model Info Page** — live performance metrics: accuracy, precision, recall, F1 score, and confusion matrix
- 🔒 **Row Level Security (RLS)** — each user can only access their own data
- 📱 **Fully Responsive UI** — mobile-friendly navigation and layout

---

## 🧠 ML Model Details

- **Architecture:** LSTM (Long Short-Term Memory) neural network
- **Framework:** TensorFlow / Keras
- **Accuracy:** 97.3%
- **Input Features:** Voltage, Current, Power, Irradiance, Temperature
- **Output:** Fault class + confidence score + severity level
- **Serialization:** joblib for model and scaler persistence
- **Preprocessing:** scikit-learn pipelines for feature scaling and normalization

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18 and npm
- Python ≥ 3.9
- Supabase account
- Google OAuth credentials

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/sakethvadnala/pv-fault-detection.git
cd pv-fault-detection

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup

```bash
cd ml-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn tensorflow scikit-learn joblib pandas openpyxl supabase

# Run the FastAPI server
uvicorn main:app --reload
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_fastapi_backend_url
```

---

## 📁 Project Structure

```
pv-fault-detection/
├── src/                    # React frontend source
│   ├── components/         # UI components (dashboard, charts, upload)
│   ├── pages/              # Route pages
│   └── lib/                # Supabase client, utilities
├── ml-backend/             # FastAPI + ML backend
│   ├── main.py             # FastAPI app entry point
│   ├── model/              # Saved LSTM model and scaler
│   └── utils.py            # Preprocessing and inference helpers
├── supabase/               # Supabase migrations and RLS policies
├── public/                 # Static assets
└── render.yaml             # Render deployment config
```

---

## 📌 Current State & Roadmap

The dashboard currently uses pre-defined/simulated time-series data for visualization. The core fault analysis engine (ML inference, batch upload, prediction history) is **fully functional and production-ready**.

### Planned Improvements

- [ ] Hardware integration — connect real PV sensor arrays for live data streaming
- [ ] WebSocket support for continuous real-time monitoring
- [ ] Alert/notification system for critical fault detection
- [ ] Export prediction reports as PDF
- [ ] Multi-panel farm monitoring dashboard

---

## 🎯 What I Learned

Building this project taught me:
- End-to-end ML model deployment (training → serialization → REST API → frontend)
- FastAPI for high-performance Python APIs
- Supabase RLS for database-level security
- Google OAuth integration
- Full-stack production deployment on Render

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built by [Saketh Vadnala](https://github.com/sakethvadnala) | [LinkedIn](https://linkedin.com/in/sakethvadnala)
