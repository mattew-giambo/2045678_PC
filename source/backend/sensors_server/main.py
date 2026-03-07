import requests
import threading
import time
import json
import stomp
import sys
import os

# CONFIGURATION & ENVIRONMENT VARIABLES 
# Fetching environment variables with fallback default values.
SIMULATOR_BASE_URL = os.getenv("SIMULATOR_URL", "http://simulator:8080")
ACTIVEMQ_HOST = os.getenv("BROKER_HOST", "activemq")
ACTIVEMQ_PORT = int(os.getenv("BROKER_PORT", "61613")) # STOMP protocol port

# List of REST endpoints (sensors) to poll based on the project contracts
SENSORS_TO_POLL = [
    "greenhouse_temperature", 
    "entrance_humidity", 
    "co2_hall", 
    "corridor_pressure",
    "hydroponic_ph",
    "air_quality_voc"
]

def normalize_rest_data(raw_data):
    """
    Transforms the raw JSON payload from the simulator into our Standard Event format
    strictly matching the defined JSON Schema.
    Handles both 'rest.scalar.v1' (single value) and 'rest.chemistry.v1' (array of measurements).
    """
    # Base structure matching the exact keys required by the Schema
    normalized_event = {
        "device_id": raw_data.get("sensor_id", "unknown_device"),
        "time": raw_data.get("captured_at", ""),  
        "status": raw_data.get("status", "ok"),   
        "metrics": [],                            
        "metadata": {}
    }

    # Handle 'rest.scalar.v1' schema (e.g., temperature, humidity)
    if "metric" in raw_data and "value" in raw_data:
        # Create the metric object as requested by the schema
        metric_obj = {
            "metric_name": raw_data["metric"],
            "value": raw_data["value"]
        }
        # Add the 'unit' field only if it exists in the raw data
        if "unit" in raw_data:
            metric_obj["unit"] = raw_data["unit"]
            
        normalized_event["metrics"].append(metric_obj)

    # Handle 'rest.chemistry.v1' schema (e.g., air quality with multiple measurements)
    elif "measurements" in raw_data:
        for item in raw_data["measurements"]:
            metric_name = item.get("metric")
            if metric_name and "value" in item:
                # Create the metric object for each measurement in the array
                metric_obj = {
                    "metric_name": metric_name,
                    "value": item["value"]
                }
                # Add the 'unit' field only if it exists in this specific measurement
                if "unit" in item:
                    metric_obj["unit"] = item["unit"]
                    
                normalized_event["metrics"].append(metric_obj)

    return normalized_event

def connect_to_activemq():
    """
    Establishes a connection to ActiveMQ using the STOMP protocol.
    Implements a retry loop to wait for the broker to fully start up.
    """
    print("Connecting to ActiveMQ...")
    
    # Configure the connection to the broker container
    conn = stomp.Connection([(ACTIVEMQ_HOST, ACTIVEMQ_PORT)])
    
    while True:
        try:
            # Default ActiveMQ credentials (admin/admin)
            conn.connect('admin', 'admin', wait=True)
            print("Successfully connected to ActiveMQ!")
            return conn
        except Exception as e:
            print(f"ActiveMQ is not ready yet. Retrying in 3 seconds... (Error: {e})")
            time.sleep(3)

def poll_single_sensor_forever(sensor_id, conn):
    """
    This function represents the 'lifecycle' of a single Thread. 
    It runs in an infinite loop.
    """
    url = f"{SIMULATOR_BASE_URL}/api/sensors/{sensor_id}"
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

def start_all_threads():
    """Establishes the connection and spawns a Thread for each sensor."""
    conn = connect_to_activemq()
    print(" Starting Multi-Threaded Poller...")
    
    # 1. Create and start the worker Threads
    for sensor in SENSORS_TO_POLL:
        # Assign the target function and pass the sensor ID and connection as arguments
        t = threading.Thread(target=poll_single_sensor_forever, args=(sensor, conn))
        
        # daemon=True means: if the main program/container stops, kill this thread immediately
        t.daemon = True 
        t.start()
        
    # 2. The main Thread (this one) has nothing left to do.
    # It just needs to stay alive in an empty loop to prevent the program from exiting.
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
        conn.disconnect()

if __name__ == "__main__":
    start_all_threads()
