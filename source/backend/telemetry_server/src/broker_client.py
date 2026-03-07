import stomp
import json

ACTIVEMQ_HOST = "localhost" 
ACTIVEMQ_PORT = 61613

class BrokerClient:
    def __init__(self):
        self.conn = None

    def connect(self):
        if not self.conn or not self.conn.is_connected():
            try:
                self.conn = stomp.Connection([(ACTIVEMQ_HOST, ACTIVEMQ_PORT)])
                self.conn.connect('admin', 'admin', wait=True)
                print("Successfully connected to ActiveMQ!")
            except Exception as e:
                print(f"ActiveMQ Connection Error: {e}")

    def publish(self, unified_event: dict, category: str):
        self.connect() 
        
        if self.conn and self.conn.is_connected():
            try:
                # 1. Get the raw device_id (e.g., "mars/telemetry/solar_array" or "greenhouse_temperature")
                raw_id = unified_event.get("device_id", "unknown")
                
                # 2. Extract just the final endpoint name by splitting at the slash
                # "mars/telemetry/solar_array" -> "solar_array"
                # "greenhouse_temperature" -> "greenhouse_temperature"
                endpoint_name = raw_id.split("/")[-1]
                
                # 3. Dynamically build the highly-specific topic name! 
                topic_name = f"/topic/{category}.{endpoint_name}"
                
                json_payload = json.dumps(unified_event)
                self.conn.send(body=json_payload, destination=topic_name)
                
                # Optional: Print to verify it's routing correctly
                # print(f"Routed to: {topic_name}")
                
            except Exception as e:
                print(f"Failed to publish message: {e}")
                self.conn = None

activemq_client = BrokerClient()

def publish_to_activemq(unified_event: dict, category: str):
    activemq_client.publish(unified_event, category)