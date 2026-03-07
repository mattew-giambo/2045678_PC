import os

# CONFIGURATION & ENVIRONMENT VARIABLES 

SIMULATOR_BASE_URL = os.getenv("SIMULATOR_URL", "http://simulator:8080")
ACTIVEMQ_HOST = os.getenv("BROKER_HOST", "activemq")
ACTIVEMQ_PORT = int(os.getenv("BROKER_PORT", "61613")) # STOMP protocol port

# List of REST endpoints (sensors) to poll based on the project contracts
SENSORS_TO_POLL = [
    "greenhouse_temperature", 
    "entrance_humidity", 
    "co2_hall",
    "hydroponic_ph",
    "water_tank_level", 
    "corridor_pressure",
    "air_quality_pm25",
    "air_quality_voc"

]