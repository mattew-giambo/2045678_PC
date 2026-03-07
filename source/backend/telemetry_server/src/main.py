import asyncio
from telemetry_client import start_telemetry_listeners

# List of topics from the mission briefing
TELEMETRY_TOPICS = [
    "mars/telemetry/solar_array",
    "mars/telemetry/radiation",
    "mars/telemetry/life_support",
    "mars/telemetry/thermal_loop",
    "mars/telemetry/power_bus",
    "mars/telemetry/power_consumption",
    "mars/telemetry/airlock"
]

async def main():
    print("Starting background tasks for telemetry topics...")
    
    # 1. Create a concurrent task for each topic
    tasks = []
    for topic in TELEMETRY_TOPICS:
        # Start the telemetry listener for this topic in the background
        task = asyncio.create_task(start_telemetry_listeners(topic))
        tasks.append(task)
        
    print(f"Successfully launched {len(tasks)} telemetry listeners.")

    try:
        # 2. Keep the main thread alive and let all the tasks run forever
        await asyncio.gather(*tasks)
        
    except asyncio.CancelledError:
        print("\nReceived shutdown signal. Canceling tasks...")
        for task in tasks:
            task.cancel()

if __name__ == "__main__":
    try:
        # 3. Start the asyncio event loop
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nIngestion Microservice stopped manually by user (Ctrl+C).")