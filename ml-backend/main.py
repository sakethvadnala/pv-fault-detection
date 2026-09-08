from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
import joblib
import pandas as pd
from preprocessing import map_pv_features
from tensorflow.keras.models import load_model
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# =============================
# CORS
# =============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pv-fault-detection-frontend.onrender.com",
        "http://localhost:5173",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# LOAD TRAINED ARTIFACTS
# =============================
model = load_model("saved/lstm_model.h5", compile=False)
scaler = joblib.load("saved/scaler.pkl")
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

class PVBatch(BaseModel):
    rows: List[dict]


# =============================
# SINGLE PREDICTION ENDPOINT
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
# BATCH PREDICTION ENDPOINT
# =============================
@app.post("/predict-batch")
def predict_batch(data: PVBatch):
    if not data.rows:
        return {"results": []}

    # Convert uploaded rows into DataFrame
    df = pd.DataFrame(data.rows)

    # Automatically map uploaded columns to model features
    X, mapping, ignored_columns, missing_features = map_pv_features(df)

    # Handle missing features
    warnings = []

    if "Power" in missing_features:
        if "Voltage" in X.columns and "Current" in X.columns:
            X["Power"] = X["Voltage"] * X["Current"]

            missing_features.remove("Power")
            mapping["Power"] = "Derived from Voltage × Current"

            warnings.append(
                "Power was not found in the uploaded data. "
                "Power was calculated as Voltage × Current."
            )

    # Make sure correct feature order is used
    X = X[[
        "Voltage",
        "Current",
        "Power",
        "Irradiance",
        "Temperature"
    ]]

    # Convert everything to numbers
    X = X.apply(pd.to_numeric, errors="coerce")

    # Handle invalid/missing values inside existing columns
    train_df = pd.read_csv("data/train.csv")

    for feature in X.columns:
        X[feature] = X[feature].fillna(train_df[feature].median())



    # Scale
    values = scaler.transform(X.values)


    # LSTM input shape
    values = values.reshape((values.shape[0], 1, 5))

    # Prediction
    probs = model.predict(values, verbose=0)
    print("\n=== PREDICTION PROBABILITIES ===")
    print(probs[:10])

    print("\n=== PREDICTED CLASSES ===")
    print(encoder.inverse_transform(np.argmax(probs, axis=1)))
    indices = np.argmax(probs, axis=1)
    faults = encoder.inverse_transform(indices)
    confidences = probs[np.arange(len(indices)), indices]

    return {
        "results": [
            {
                "fault": str(faults[i]),
                "confidence": float(confidences[i])
            }
            for i in range(len(faults))
        ],
        "mapping": mapping,
        "ignored_columns": ignored_columns,
        "missing_features": missing_features,
        "warnings": warnings
    }


# =============================
# METRICS ENDPOINT
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
        "labels": encoder.classes_.tolist()
    }


# =============================
# LIVE PREDICTION ENDPOINT
# =============================
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
