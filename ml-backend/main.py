from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
import joblib
import pandas as pd
from preprocessing import map_pv_features
from tensorflow.keras.models import load_model
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)
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

    probs = model.predict(values, verbose=0)[0]
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
        return {
            "results": [],
            "normalized_data": [],
            "active_alert_count": 0
        }

    # Convert uploaded rows into DataFrame
    df = pd.DataFrame(data.rows)

    # Automatically map uploaded columns to model features
    X, mapping, ignored_columns, missing_features = map_pv_features(df)

    # =============================
    # HANDLE MISSING FEATURES
    # =============================
    warnings = []

    # Derive Power if it is missing
    if "Power" in missing_features:

        if "Voltage" in X.columns and "Current" in X.columns:

            X["Power"] = X["Voltage"] * X["Current"]

            missing_features.remove("Power")

            mapping["Power"] = "Derived from Voltage × Current"

            warnings.append(
                "Power was not found in the uploaded data. "
                "Power was calculated as Voltage × Current."
            )

    # =============================
    # FEATURE ORDER
    # =============================
    X = X[[
        "Voltage",
        "Current",
        "Power",
        "Irradiance",
        "Temperature"
    ]]

    # Convert everything to numeric
    X = X.apply(pd.to_numeric, errors="coerce")

    # =============================
    # HANDLE REMAINING MISSING VALUES
    # =============================
    train_df = pd.read_csv("data/train.csv")

    for feature in X.columns:

        if X[feature].isna().any():

            X[feature] = X[feature].fillna(
                train_df[feature].median()
            )

            warnings.append(
                f"{feature} contained missing or invalid values. "
                f"Training-data median value was used."
            )

    # =============================
    # SCALE DATA
    # =============================
    values = scaler.transform(X.values)

    # =============================
    # LSTM INPUT SHAPE
    # =============================
    values = values.reshape(
        (values.shape[0], 1, 5)
    )

    # =============================
    # PREDICTION
    # =============================
    probs = model.predict(
        values,
        verbose=0
    )

    indices = np.argmax(
        probs,
        axis=1
    )

    faults = encoder.inverse_transform(indices)

    confidences = probs[
        np.arange(len(indices)),
        indices
    ]

    # =============================
    # FIND TIMESTAMP COLUMN
    # =============================
    timestamp_column = None

    for column in df.columns:

        normalized_name = (
            str(column)
            .strip()
            .lower()
            .replace("_", " ")
        )

        if normalized_name in [
            "timestamp",
            "datetime",
            "date time",
            "measured on",
            "time",
            "date"
        ]:
            timestamp_column = column
            break

    # =============================
    # NORMALIZED DATA
    # =============================
    normalized_data = []

    for i in range(len(X)):

        if timestamp_column is not None:

            timestamp_value = str(
                df.iloc[i][timestamp_column]
            )

        else:

            timestamp_value = (
                pd.Timestamp.now()
                + pd.Timedelta(seconds=i)
            ).isoformat()

        normalized_data.append({
            "timestamp": timestamp_value,

            "voltage": float(
                X.iloc[i]["Voltage"]
            ),

            "current": float(
                X.iloc[i]["Current"]
            ),

            "power": float(
                X.iloc[i]["Power"]
            ),

            "irradiance": float(
                X.iloc[i]["Irradiance"]
            ),

            "temperature": float(
                X.iloc[i]["Temperature"]
            ),

            "is_fault": (
                str(faults[i])
                .strip()
                .lower()
                != "normal"
            )
        })

    # =============================
    # ACTIVE ALERT COUNT
    # =============================
    active_alert_count = sum(
        1
        for fault in faults
        if str(fault).strip().lower() != "normal"
    )

    # =============================
    # RETURN
    # =============================
    return {

        "results": [
            {
                "fault": str(faults[i]),
                "confidence": float(
                    confidences[i]
                )
            }
            for i in range(len(faults))
        ],

        "normalized_data": normalized_data,

        "active_alert_count": active_alert_count,

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

    X = df[
        [
            "Voltage",
            "Current",
            "Power",
            "Irradiance",
            "Temperature"
        ]
    ].values

    y_true = encoder.transform(
        df["Fault_Label"].values
    )

    X = scaler.transform(X)

    X = X.reshape(
        (X.shape[0], 1, X.shape[1])
    )

    probs = model.predict(
        X,
        verbose=0
    )

    y_pred = np.argmax(
        probs,
        axis=1
    )

    acc = accuracy_score(
        y_true,
        y_pred
    )

    prec = precision_score(
        y_true,
        y_pred,
        average="macro"
    )

    rec = recall_score(
        y_true,
        y_pred,
        average="macro"
    )

    f1 = f1_score(
        y_true,
        y_pred,
        average="macro"
    )

    cm = confusion_matrix(
        y_true,
        y_pred
    ).tolist()

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

    values = values.reshape(
        (1, 1, 5)
    )

    probs = model.predict(
        values,
        verbose=0
    )[0]

    idx = int(
        np.argmax(probs)
    )

    fault = encoder.inverse_transform(
        [idx]
    )[0]

    confidence = float(
        probs[idx]
    )

    return {
        "fault": fault,
        "confidence": confidence,
        "voltage": data.Voltage,
        "current": data.Current,
        "power": data.Power,
        "irradiance": data.Irradiance,
        "temperature": data.Temperature
    }