import time
import stomp

from src.config.constants import ACTIVEMQ_HOST, ACTIVEMQ_PORT, ACTIVEMQ_USER, ACTIVEMQ_PASS

def connect_to_activemq():
    """
    Establishes a connection to ActiveMQ using the STOMP protocol.
    Implements a retry loop to wait for the broker to fully start up.
    """
    print("Connecting to ActiveMQ...")
    
    conn = stomp.Connection([(ACTIVEMQ_HOST, ACTIVEMQ_PORT)])
    
    while True:
        try:
            conn.connect(ACTIVEMQ_USER, ACTIVEMQ_PASS, wait=True)
            print("Successfully connected to ActiveMQ!")
            return conn
        except Exception as e:
            print(f"ActiveMQ is not ready yet. Retrying in 3 seconds... (Error: {e})")
            time.sleep(3)
