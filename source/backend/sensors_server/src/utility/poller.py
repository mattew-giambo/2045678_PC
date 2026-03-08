import requests
import time
import json

from src.config.constants import SIMULATOR_BASE_URL, SIMULATOR_PORT
from src.utility.normalizer import normalize_rest_data

def poll_single_sensor_forever(sensor_id, conn):
    """
    This function represents the 'lifecycle' of a single Thread. 
    It runs in an infinite loop.
    """
    url = f"{SIMULATOR_BASE_URL}:{SIMULATOR_PORT}/api/sensors/{sensor_id}"
    destination = f"/topic/sensor.rest.{sensor_id}"
    
    print(f" Thread started for sensor: {sensor_id}")
    
    while True:
        try:
            # timeout=3 prevents the thread from hanging indefinitely if the network goes down
            response = requests.get(url, timeout=3) 
            
            if response.status_code == 200:
                raw_data = response.json()
                print(f"{raw_data}")
                standard_event = normalize_rest_data(raw_data)
                print(f"Normalizzato: {standard_event}")
                
                conn.send(body=json.dumps(standard_event), destination=destination)
                print(f" [{sensor_id}] Published to {destination}")
            else:
                print(f" [{sensor_id}] Server error: {response.status_code}")
                
        except Exception as e:
            print(f" [{sensor_id}] Network error: {e}")
            
        # The thread sleeps for 5 seconds, completely independent of the other threads
        time.sleep(5)
