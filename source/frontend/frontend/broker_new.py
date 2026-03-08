import stomp
from config import ACTIVEMQ_HOST, ACTIVEMQ_PORT, ACTIVEMQ_USER, ACTIVEMQ_PASS, SENSORS_QUEUE, TELEMETRY_QUEUE
import json

from state import latest_data

class EventListener(stomp.ConnectionListener):
    def __init__(self, conn):
        self.conn = conn

    def on_error(self, frame):
        print(f'Error: {frame.body}')

    def on_message(self, frame):
        try:
            event = json.loads(frame.body)
            device_id = event.get("device_id")
           
            if device_id:
                latest_data[device_id] = event
                print(f"Cache aggiornata per: {device_id}")
               
        except Exception as e:
            print(f"Errore nella lettura del messaggio: {e}")

    def on_connected(self):
        print("Connected to ActiveMQ! Subscribing to the queues...")

        self.conn.subscribe(destination=f'/queue/{SENSORS_QUEUE}', id="sensors_queue", ack='auto')
        self.conn.subscribe(destination=f'/queue/{TELEMETRY_QUEUE}', id="telemetry_queue", ack='auto')

def connect_to_message_broker():
    conn = stomp.Connection([(ACTIVEMQ_HOST, ACTIVEMQ_PORT)], reconnect_attempts_max=10, reconnect_sleep_initial=1)
    
    conn.set_listener('sensors_listener', EventListener(conn))

    conn.connect(ACTIVEMQ_USER, ACTIVEMQ_PASS, wait=True)

    return conn