import pandas as pd

REQUIRED_COLUMNS = [
    "Voltage",
    "Current",
    "Power",
    "Irradiance",
    "Temperature",
    "Fault"
]


def preprocess_dataset(df: pd.DataFrame):
    # Validate columns
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    # Features
    X = df[["Voltage", "Current", "Power", "Irradiance", "Temperature"]]

    # Labels
    y = df["Fault"]

    return X, y
