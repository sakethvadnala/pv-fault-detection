from tensorflow.keras.models import load_model

model = load_model("lstm_model.h5")

model.save("lstm_model.keras")