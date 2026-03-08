import threading
import time

from src.config.constants import SENSORS_TO_POLL
from src.utility.broker import connect_to_activemq
from src.utility.poller import poll_single_sensor_forever


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
