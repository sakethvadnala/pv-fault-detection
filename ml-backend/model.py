import numpy as np
import pandas as pd
import os
import joblib

from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

FEATURES = ["Voltage", "Current", "Power", "Irradiance", "Temperature"]
TARGET = "Fault_Label"


def load_data(path):
    df = pd.read_csv(path)
    X = df[FEATURES].values
    y = df[TARGET].values
    return X, y


def preprocess(X, y):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    # reshape for LSTM → (samples, timesteps, features)
    X_scaled = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))

    return X_scaled, y_encoded, scaler, encoder


def build_model(input_shape, num_classes):
    model = Sequential()
    model.add(LSTM(64, input_shape=input_shape))
    model.add(Dense(32, activation="relu"))
    model.add(Dense(num_classes, activation="softmax"))

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def train(dataset_path="data/train.csv"):
    # Load dataset
    X, y = load_data(dataset_path)

    # Preprocess
    X, y, scaler, encoder = preprocess(X, y)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Build model
    model = build_model(
        input_shape=(X.shape[1], X.shape[2]),
        num_classes=len(np.unique(y))
    )

    # Train
    model.fit(
        X_train,
        y_train,
        epochs=20,
        batch_size=32,
        validation_data=(X_test, y_test)
    )

    # Evaluate
    loss, acc = model.evaluate(X_test, y_test)

    # Save artifacts
    os.makedirs("saved", exist_ok=True)
    model.save("saved/lstm_model.h5")
    joblib.dump(scaler, "saved/scaler.pkl")
    joblib.dump(encoder, "saved/encoder.pkl")

    return float(acc)
import numpy as np
import pandas as pd
import os
import joblib

from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

FEATURES = ["Voltage", "Current", "Power", "Irradiance", "Temperature"]
TARGET = "Fault_Label"


def load_data(path):
    df = pd.read_csv(path)
    X = df[FEATURES].values
    y = df[TARGET].values
    return X, y


def preprocess(X, y):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    # reshape for LSTM → (samples, timesteps, features)
    X_scaled = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))

    return X_scaled, y_encoded, scaler, encoder


def build_model(input_shape, num_classes):
    model = Sequential()
    model.add(LSTM(64, input_shape=input_shape))
    model.add(Dense(32, activation="relu"))
    model.add(Dense(num_classes, activation="softmax"))

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def train(dataset_path="data/train.csv"):
    # Load dataset
    X, y = load_data(dataset_path)

    # Preprocess
    X, y, scaler, encoder = preprocess(X, y)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Build model
    model = build_model(
        input_shape=(X.shape[1], X.shape[2]),
        num_classes=len(np.unique(y))
    )

    # Train
    model.fit(
        X_train,
        y_train,
        epochs=20,
        batch_size=32,
        validation_data=(X_test, y_test)
    )

    # Evaluate
    loss, acc = model.evaluate(X_test, y_test)

    # Save artifacts
    os.makedirs("saved", exist_ok=True)
    model.save("saved/lstm_model.h5")
    joblib.dump(scaler, "saved/scaler.pkl")
    joblib.dump(encoder, "saved/encoder.pkl")

    return float(acc)
import numpy as np
import pandas as pd
import os
import joblib

from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

FEATURES = ["Voltage", "Current", "Power", "Irradiance", "Temperature"]
TARGET = "Fault_Label"


def load_data(path):
    df = pd.read_csv(path)
    X = df[FEATURES].values
    y = df[TARGET].values
    return X, y


def preprocess(X, y):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    # reshape for LSTM → (samples, timesteps, features)
    X_scaled = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))

    return X_scaled, y_encoded, scaler, encoder


def build_model(input_shape, num_classes):
    model = Sequential()
    model.add(LSTM(64, input_shape=input_shape))
    model.add(Dense(32, activation="relu"))
    model.add(Dense(num_classes, activation="softmax"))

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def train(dataset_path="data/train.csv"):
    # Load dataset
    X, y = load_data(dataset_path)

    # Preprocess
    X, y, scaler, encoder = preprocess(X, y)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Build model
    model = build_model(
        input_shape=(X.shape[1], X.shape[2]),
        num_classes=len(np.unique(y))
    )

    # Train
    model.fit(
        X_train,
        y_train,
        epochs=20,
        batch_size=32,
        validation_data=(X_test, y_test)
    )

    # Evaluate
    loss, acc = model.evaluate(X_test, y_test)

    # Save artifacts
    os.makedirs("saved", exist_ok=True)
    model.save("saved/lstm_model.h5")
    joblib.dump(scaler, "saved/scaler.pkl")
    joblib.dump(encoder, "saved/encoder.pkl")

    return float(acc)