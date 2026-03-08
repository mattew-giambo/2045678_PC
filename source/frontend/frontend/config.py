import os

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8005"))

SENSORS_QUEUE = "sensors.rest.>"
TELEMETRY_QUEUE = "telemetry.>"

# ActiveMQ Configuration (Message Broker)
ACTIVEMQ_HOST = os.getenv("BROKER_HOST", "localhost")
ACTIVEMQ_PORT = int(os.getenv("BROKER_PORT", "61613"))
ACTIVEMQ_USER = os.getenv("BROKER_USER", "admin")
ACTIVEMQ_PASS = os.getenv("BROKER_PASS", "admin")

# IoT Simulator (per richiesta iniziale)
SIMULATOR_URL = os.getenv("SIMULATOR_URL", "http://localhost:8080")

# Actuators API
ACTUATORS_API_URL = os.getenv("ACTUATORS_API_URL", "http://localhost:8000")

# Topics e Queue da ascoltare
SENSORS_TOPICS = [
    "/topic/sensors.greenhouse_temperature",
    "/topic/sensors.entrance_humidity",
    "/topic/sensors.co2_hall",
    "/topic/sensors.hydroponic_ph",
    "/topic/sensors.water_tank_level",
    "/topic/sensors.corridor_pressure",
    "/topic/sensors.air_quality_pm25",
    "/topic/sensors.air_quality_voc",
]

TELEMETRY_TOPICS = [
    "/topic/telemetry.solar_array",
    "/topic/telemetry.power_bus",
    "/topic/telemetry.power_consumption",
    "/topic/telemetry.radiation",
    "/topic/telemetry.life_support",
    "/topic/telemetry.thermal_loop",
    "/topic/telemetry.airlock",
]
