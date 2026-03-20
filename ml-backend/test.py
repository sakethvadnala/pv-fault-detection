from tensorflow.keras.models import load_model

model = load_model("saved/lstm_model.h5", compile=False)

print("✅ Model loads successfully")