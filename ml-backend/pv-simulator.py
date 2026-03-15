import requests
import random
import time

URL = "http://127.0.0.1:8000/predict-live"

while True:

    voltage = random.uniform(35, 50)
    current = random.uniform(4, 8)
    power = voltage * current
    irradiance = random.uniform(600, 1000)
    temperature = random.uniform(25, 40)

    payload = {
        "Voltage": voltage,
        "Current": current,
        "Power": power,
        "Irradiance": irradiance,
        "Temperature": temperature
    }

    response = requests.post(URL, json=payload)

    print(response.json())

    time.sleep(5)