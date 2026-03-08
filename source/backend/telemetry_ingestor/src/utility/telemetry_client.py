import asyncio
import json
import websockets
from utility.normalizer import normalize_telemetry
from utility.broker_client import publish_to_activemq 

# The WebSocket URL for the simulator's telemetry stream
SIMULATOR_WS_URL = "ws://mars_simulator:8080/api/telemetry/ws?topic="


async def start_telemetry_listeners(topic: str) -> None:
    """
    Connects to the simulator's WebSocket for a given telemetry topic,
    receives raw telemetry data, normalizes it, and publishes the unified event
    to the ActiveMQ broker.

    Args
        topic (str): The telemetry topic to listen to
                     (e.g., "mars/telemetry/solar_array").

    Returns
        None
    """

    url = f"{SIMULATOR_WS_URL}{topic}"

    # This loop will keep trying to connect to the simulator and process telemetry data
    while True:
        try:
            # Connect to the simulator's WebSocket for the given topic
            async with websockets.connect(url) as websocket:
                #print(f"Connected to stream: {topic}")

                # Keep listening for incoming telemetry messages indefinitely
                while True:

                    # 1. Fetch raw data from the simulator
                    raw_message = await websocket.recv()
                    raw_data = json.loads(raw_message)

                    #print(f"Received raw data from {topic}: {raw_data}")  # Debug print

                    # 2. Process into your unified event schema
                    unified_event = normalize_telemetry(topic, raw_data)

                    # 3. Publish the normalized event to ActiveMQ
                    publish_to_activemq(unified_event, "telemetry")

                    #print(f"Event published to broker from {topic}")

        # Handle connection loss and attempt to reconnect
        except websockets.exceptions.ConnectionClosed:
            print(f"Connection lost for {topic}. Reconnecting in 5s...")
            await asyncio.sleep(5)

        # Catch-all for unexpected errors
        except Exception as e:
            print(f"Error on {topic}: {e}")
            await asyncio.sleep(5)