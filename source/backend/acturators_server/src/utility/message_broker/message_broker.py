import stomp
from src.config.constants import ACTIVEMQ_HOST, ACTIVEMQ_PORT, ACTIVEMQ_USER, ACTIVEMQ_PASS, SENSORS_QUEUE
from src.utility.message_broker.automations import check_and_trigger_actuators

class EventListener(stomp.ConnectionListener):
    def __init__(self, conn):
        self.conn = conn

    def on_error(self, frame):
        print(f'Error: {frame.body}')

    def on_message(self, frame):
        check_and_trigger_actuators(frame.body)

    def on_connected(self):
        print("Connected to ActiveMQ! Subscribing to the queues...")

        self.conn.subscribe(destination=f'/queue/{SENSORS_QUEUE}', id="sensors_queue", ack='auto')


def connect_to_message_broker():
    conn = stomp.Connection([(ACTIVEMQ_HOST, ACTIVEMQ_PORT)], reconnect_attempts_max=10, reconnect_sleep_initial=1)
    
    conn.set_listener('sensors_listener', EventListener(conn))

    conn.connect(ACTIVEMQ_USER, ACTIVEMQ_PASS, wait=True)

    return conn