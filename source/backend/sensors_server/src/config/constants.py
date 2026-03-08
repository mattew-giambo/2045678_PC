SIMULATOR_BASE_URL = "http://simulator"
SIMULATOR_PORT= 8080
ACTIVEMQ_HOST = "activemq"
ACTIVEMQ_PORT = 61613
ACTIVEMQ_USER = "admin"
ACTIVEMQ_PASS = "admin"


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