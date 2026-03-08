HOST = "0.0.0.0"
PORT = 8005

SENSORS_TOPIC = "sensor.rest.>"
TELEMETRY_TOPIC = "telemetry.>"

ACTIVEMQ_HOST = "activemq"
ACTIVEMQ_PORT = 61613
ACTIVEMQ_USER = "admin"
ACTIVEMQ_PASS = "admin"

ACTUATORS_CONTROLLER_HOST = "http://actuators_controller:8000"

SENSORS_TOPICS = [
    "greenhouse_temperature",
    "entrance_humidity",
    "co2_hall",
    "hydroponic_ph",
    "water_tank_level",
    "corridor_pressure",
    "air_quality_pm25",
    "air_quality_voc"
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
