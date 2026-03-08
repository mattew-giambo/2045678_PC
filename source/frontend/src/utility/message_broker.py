import stomp
from config.constants import ACTIVEMQ_HOST, ACTIVEMQ_PORT, ACTIVEMQ_USER, ACTIVEMQ_PASS, SENSORS_TOPIC, TELEMETRY_TOPIC
import json
from typing import Dict, Any

data_queue = []

class EventListener(stomp.ConnectionListener):
    def __init__(self, conn):
        self.conn = conn

    def on_error(self, frame):
        print(f'Error: {frame.body}')

    def on_message(self, frame):
        event = json.loads(frame.body)
        device_id = event.get("device_id")

        if device_id:
            msg_topic = frame.headers.get('destination', '')
            topic_type = msg_topic.split("/")[2].split(".")[0]
            
            latest_data = event['metrics'][0].copy() 
            latest_data['status'] = event['status']
            latest_data['device_id'] = device_id

            if topic_type == 'sensor':
                latest_data['type'] = "sensor"
            else:
                latest_data['type'] = "telemetry"

            data_queue.append(latest_data)


    def on_connected(self, frame):
        print("Connected to ActiveMQ! Subscribing to the topics...")

        self.conn.subscribe(destination=f'/topic/{SENSORS_TOPIC}', id="sensors_queue", ack='auto')
        self.conn.subscribe(destination=f'/topic/{TELEMETRY_TOPIC}', id="telemetry_queue", ack='auto')

def connect_to_message_broker():
    conn = stomp.Connection([(ACTIVEMQ_HOST, ACTIVEMQ_PORT)], reconnect_attempts_max=10, reconnect_sleep_initial=1)
    
    conn.set_listener('sensors_listener', EventListener(conn))

    conn.connect(ACTIVEMQ_USER, ACTIVEMQ_PASS, wait=True)

    return conn