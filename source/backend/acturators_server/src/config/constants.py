HOST = "0.0.0.0"
PORT = 8000

HOST_DB = "127.0.0.1"  # "mariadb" when using docker-compose
PORT_DB = 3306
USER_DB = "mars_user"
USER_PASSWORD_DB = "mars_password"
DATABASE_NAME_DB = "mars_db"

ACTIVEMQ_HOST = "localhost"
ACTIVEMQ_PORT = 61613
ACTIVEMQ_USER = "admin"
ACTIVEMQ_PASS = "admin"
SENSORS_QUEUE = "sensors.rest.>"

SIMULATOR_URL= "localhost" # "simulator" when using docker-compose
SIMULATOR_PORT = 8080
ACTUATORS_BASE_URL = "/api/actuators/"

FRONTEND_BASE_URL = "localhost" # "frontend" when using docker-compose
FRONTEND_PORT = 9000
