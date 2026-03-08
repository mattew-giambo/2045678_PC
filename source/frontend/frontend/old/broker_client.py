import stomp
import json
from typing import Callable, Optional
from config import (
    ACTIVEMQ_HOST, 
    ACTIVEMQ_PORT, 
    ACTIVEMQ_USER, 
    ACTIVEMQ_PASS,
    SENSORS_TOPICS,
    TELEMETRY_TOPICS
)


class FrontendListener(stomp.ConnectionListener):
    """
    Listener per ricevere messaggi da ActiveMQ.
    Quando arriva un messaggio, chiama la callback per inviarlo ai client WebSocket.
    """
    
    def __init__(self, on_message_callback: Optional[Callable] = None):
        self.on_message_callback = on_message_callback
    
    def on_error(self, frame):
        print(f"[BROKER ERROR] {frame.body}")
    
    def on_message(self, frame):
        try:
            # Parse del messaggio JSON
            data = json.loads(frame.body)
            destination = frame.headers.get('destination', 'unknown')
            
            print(f"[BROKER] Messaggio ricevuto da {destination}")
            
            # Chiama la callback per inviare ai WebSocket
            if self.on_message_callback:
                self.on_message_callback(destination, data)
                
        except json.JSONDecodeError as e:
            print(f"[BROKER] Errore parsing JSON: {e}")
        except Exception as e:
            print(f"[BROKER] Errore: {e}")
    
    def on_connected(self, frame):
        print("[BROKER] Connesso ad ActiveMQ!")
    
    def on_disconnected(self):
        print("[BROKER] Disconnesso da ActiveMQ")


class BrokerClient:
    """
    Client per connettersi ad ActiveMQ e sottoscriversi ai topic.
    """
    
    def __init__(self):
        self.conn: Optional[stomp.Connection] = None
        self.listener: Optional[FrontendListener] = None
    
    def connect(self, on_message_callback: Optional[Callable] = None):
        """Connette al broker e sottoscrive a tutti i topic."""
        try:
            self.conn = stomp.Connection(
                [(ACTIVEMQ_HOST, ACTIVEMQ_PORT)],
                reconnect_attempts_max=1,
                reconnect_sleep_initial=0.5
            )
            
            self.listener = FrontendListener(on_message_callback)
            self.conn.set_listener('frontend_listener', self.listener)
            
            self.conn.connect(ACTIVEMQ_USER, ACTIVEMQ_PASS, wait=True)
            
            # Sottoscrivi a tutti i topic dei sensori
            for i, topic in enumerate(SENSORS_TOPICS):
                self.conn.subscribe(destination=topic, id=f"sensor_{i}", ack='auto')
                print(f"[BROKER] Sottoscritto a {topic}")
            
            # Sottoscrivi a tutti i topic della telemetria
            for i, topic in enumerate(TELEMETRY_TOPICS):
                self.conn.subscribe(destination=topic, id=f"telemetry_{i}", ack='auto')
                print(f"[BROKER] Sottoscritto a {topic}")
            
            return True
            
        except Exception as e:
            print(f"[BROKER] Broker non disponibile (normale senza Docker): {e}")
            self.conn = None
            return False
    
    def disconnect(self):
        """Disconnette dal broker."""
        if self.conn and self.conn.is_connected():
            self.conn.disconnect()
            print("[BROKER] Disconnesso")
    
    def is_connected(self) -> bool:
        """Verifica se connesso."""
        return self.conn is not None and self.conn.is_connected()


# Istanza globale del client
broker_client = BrokerClient()
