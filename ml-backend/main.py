from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import joblib
import pandas as pd
from tensorflow.keras.models import load_model
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# =============================
# LOAD TRAINED ARTIFACTS
# =============================
model = load_model("saved/lstm_model.h5")
scaler = joblib.load("saved/scaler.pkl")ko
encoder = joblib.load("saved/encoder.pkl")


# =============================
# INPUT SCHEMA
# =============================
class PVInput(BaseModel):
    Voltage: float
    Current: float
    Power: float
    Irradiance: float
    Temperature: float


# =============================
# PREDICTION ENDPOINT
# =============================
@app.post("/predict")
def predict(data: PVInput):
    values = np.array([[
        data.Voltage,
        data.Current,
        data.Power,
        data.Irradiance,
        data.Temperature
    ]])

    values = scaler.transform(values)
    values = values.reshape((1, 1, 5))

    probs = model.predict(values)[0]
    idx = int(np.argmax(probs))

    fault = encoder.inverse_transform([idx])[0]
    confidence = float(probs[idx])

    return {
        "fault": fault,
        "confidence": confidence
    }


# =============================
# METRICS ENDPOINT  ⭐ NEW
# =============================
@app.get("/metrics")
def get_metrics():
    df = pd.read_csv("data/train.csv")

    X = df[["Voltage", "Current", "Power", "Irradiance", "Temperature"]].values
    y_true = encoder.transform(df["Fault_Label"].values)

    X = scaler.transform(X)
    X = X.reshape((X.shape[0], 1, X.shape[1]))

    probs = model.predict(X)
    y_pred = np.argmax(probs, axis=1)

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, average="macro")
    rec = recall_score(y_true, y_pred, average="macro")
    f1 = f1_score(y_true, y_pred, average="macro")
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "confusion_matrix": cm,
        "labels": encoder.classes_.tolist()   # ⭐ ADD THIS
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:8080"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/predict-live")
def predict_live(data: PVInput):

    values = np.array([[
        data.Voltage,
        data.Current,
        data.Power,
        data.Irradiance,
        data.Temperature
    ]])

    values = scaler.transform(values)
    values = values.reshape((1, 1, 5))

    probs = model.predict(values)[0]
    idx = int(np.argmax(probs))

    fault = encoder.inverse_transform([idx])[0]
    confidence = float(probs[idx])

    return {
        "fault": fault,
        "confidence": confidence,
        "voltage": data.Voltage,
        "current": data.Current,
        "power": data.Power,
        "irradiance": data.Irradiance,
        "temperature": data.Temperature
    }