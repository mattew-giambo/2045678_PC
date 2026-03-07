import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup (before the server starts): Launch a background async task for each telemetry topic
    print("Starting background tasks...")
    tasks = []
    for topic in TELEMETRY_TOPICS:
        task = asyncio.create_task(start_telemetry_listeners(topic)) # Start the telemetry listener for this topic in the background
        tasks.append(task) # Keep track of the task so we can cancel it on shutdown

    # Server is running
    yield # This line hands control back to FastAPI.
    
    # Shutdown (after the server stops): Cancel the tasks gracefully
    for task in tasks:
        task.cancel()

# Create the FastAPI App
app = FastAPI(title="Ingestion Microservice", lifespan=lifespan)


@app.get("/health")
def health_check():
    return {"status": "Ingestion service is running"}