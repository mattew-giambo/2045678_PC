# SYSTEM DESCRIPTION:

<system of the system>

# USER STORIES:

1) As an operator, I want the dashboard interface organized into distinct visual sections for sensors, telemetry streams, and actuators so that I can navigate the controls quickly.

2) As an operator, I want the dashboard updates in real-time so I can monitor telemetry and manage rules without refreshing the page.

3) As an operator, I want to see the list of available sensors so that I know which environmental parameters are monitored.

4) As an operator, I want to see the measurement unit of each sensor so that I can correctly interpret the values.

5) As an operator, I want to see the latest value of each sensor so that I can monitor the habitat conditions.

6) As an operator, I want real-time charts that update automatically as measurement data of sensors arrives so that trends and anomalies can be visualized.

7) As an operator, I want to see the minimum and maximum value recorded for each sensor during the current session, so that I can evaluate the range of environmental conditions.

8) As an operator, I want the dashboard displays the telemetry measurements.

9) As an operator, I want real-time charts that update automatically as telemetry measurement data arrives so that trends can be visualized.

10) As an operator, I want to see the minimum and maximum values recorded for each telemetry during the current session, so that I can evaluate the range of environmental conditions.

11) As an operator, I want the dashboard displays the list of all actuators.

12) As an operator, I want the dashboard to display the specific environmental parameter each actuator controls, so that I can rapidly understand the purpose of every device.

13) As an operator, I want the dashboard displays the active actuators at any time.

14) As an operator, I want to manually activate actuators from the dashboard, so that I can directly control the devices when needed.

15) As an operator, I want to define automation rules using a simple interface, so that environmental conditions can be controlled automatically.

16) As an operator, I want to be able to define only valid automation rules.

17) As an operator, I want rules to persist after system restarts so that automation continues to work reliably.

18) As an operator, I want rules to be evaluated immediately whenever a new event arrives so that the system can react without delay.


19) An an operator, I want the dashboard to displays the date when an automation rule has been defined.

20) As an operator, I want to delete automation rules so that obsolete or incorrect automations are removed and does not influence system behavior anymore.

21) As an operator, I want the dashboard to highlight the sensors that are in the warning state.

22) As an operator, I want the dashboard to display a history of all system actions triggered by environmental changes, so that I can monitor how the system is responding in real-time.


23) As a developer, I want to containerize all services of the system using docker compose, so that the team can start the entire stack with a single command.

24) As a developer, I want the telemetry and sensors event exchanged between the ingestion layer and the processing layer to follow a standardized JSON event schema, so that the two layers can communicate reliably.

25) As a developer, I want Docker containers to be isolated from each other, so that applications can run independently without interfering with other services.


# CONTAINERS:

## CONTAINER_NAME: sensors_ingestor

### DESCRIPTION: 
Ingestion service responsible for polling the REST sensors of the IoT simulator at regular intervals. It normalizes the heterogeneous raw JSON payloads into the standard Unified Event Schema and publishes them to the ActiveMQ message broker.

### USER STORIES:
2, 3, 4, 5, 6

### PORTS: 
None exposed externally.

### PERSISTENCE EVALUATION
Stateless. No data is persisted on disk.

### EXTERNAL SERVICES CONNECTIONS
- Mars IoT Simulator (HTTP GET for polling)
- ActiveMQ (STOMP protocol for publishing events)

### MICROSERVICES:

#### MICROSERVICE: sensors_ingestor_service
- TYPE: backend
- DESCRIPTION: Python worker that continuously polls REST endpoints using independent threads and normalize the event according to Unified Event Schema.
- PORTS: None
- TECHNOLOGICAL SPECIFICATION:
Python 3.11, `requests` for HTTP polling, `stomp.py` for ActiveMQ communication.
- SERVICE ARCHITECTURE: 
Multi-threaded architecture. A main script spawns a daemon Thread for each configured sensor. Each thread independently executes an infinite loop (fetching data, normalizing it, and publishing to the broker) ensuring that a network delay on one sensor does not block the others.

## CONTAINER_NAME: telemetry_ingestor

### DESCRIPTION: 
Ingestion service that subscribes to the IoT simulator's telemetry WebSocket streams, normalizes the continuous asynchronous data flow, and pushes standardized events to the ActiveMQ message broker.

### USER STORIES:
2, 8, 9, 10

### PORTS: 
None exposed externally.

### PERSISTENCE EVALUATION
Stateless. No data is persisted on disk.

### EXTERNAL SERVICES CONNECTIONS
- Mars IoT Simulator (WebSocket)
- ActiveMQ (STOMP protocol for publishing events)

### MICROSERVICES:

#### MICROSERVICE: telemetry_ingestor_service
- TYPE: backend
- DESCRIPTION: Python worker maintaining persistent connections to telemetry streams.
- PORTS: None
- TECHNOLOGICAL SPECIFICATION:
Python 3.11, `websockets`, `stomp.py`, `asyncio`.
- SERVICE ARCHITECTURE: 
Asynchronous cooperative architecture. It uses `asyncio` to spawn multiple concurrent tasks (one for each telemetry topic) on a single thread. Each task maintains a long-lived WebSocket connection, normalizing and publishing events as soon as they arrive.

## CONTAINER_NAME: actuators_controller

### DESCRIPTION: 
Acts as the Automation Engine and API Gateway. It consumes events from the broker, evaluates conditions against the persisted rules, and sends commands to the IoT actuators. It also exposes REST APIs for rule management.

### USER STORIES:
11, 12, 13, 14, 15, 17, 18, 19, 20

### PORTS: 
8000

### PERSISTENCE EVALUATION
Reads and writes automation rules to the MariaDB database to ensure they survive system restarts. Evaluates events statelessly on arrival.

### EXTERNAL SERVICES CONNECTIONS
- ActiveMQ (STOMP protocol for consuming events)
- MariaDB (TCP for database operations)
- Mars IoT Simulator (REST API to trigger actuators)
- Frontend Server (REST API to notify rule activations)

### MICROSERVICES:

#### MICROSERVICE: actuators_api
- TYPE: backend
- DESCRIPTION: Core logic engine and REST API provider for automation rule management.
- PORTS: 8000
- TECHNOLOGICAL SPECIFICATION:
Python 3.11, FastAPI, `mariadb` native connector, `stomp.py`, Pydantic for data validation.
- SERVICE ARCHITECTURE: 
FastAPI web server handling REST requests for rules. During the application lifespan startup, it initializes a background STOMP listener that independently processes incoming broker messages and triggers actuators based on DB rules.

- ENDPOINTS:

| HTTP METHOD | URL | Description | User Stories |
| ------------| --- | ----------- | ------------ |
| **POST** | `/create_rule` | Inserts a new automation rule into the MariaDB database, specifying sensor thresholds and actuator actions. |  2,15,16,17,18|
| **POST** | `/delete_rule/{id}` | Deletes a specific automation rule from the database using its unique ID. | 2,15,17|
| **GET** | `/rules` | Retrieves a list of all active automation rules currently stored in the system. | 2,17,18 |
| **POST** | `/toggle_actuator/{actuator_name}` | Sends a command to the external simulator to manually change the state of a specific actuator. | 14 |

## CONTAINER_NAME: frontend

### DESCRIPTION: 
The Frontend Server acts as the bridge between the operator’s web browser and the backend system. It serves the dashboard pages using Jinja2 templates and delivers the required HTML, CSS, and JavaScript. It also handles real-time updates by subscribing to sensor and telemetry streams from ActiveMQ and pushing the data to the browser via WebSockets. In addition, it forwards operator actions from the dashboard to the backend Actuation Controller.

### USER STORIES:
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22
### PORTS: 

8005

### PERSISTENCE EVALUATION
Stateless. No data is persisted on disk.

### EXTERNAL SERVICES CONNECTIONS
- ActiveMQ (STOMP protocol for consuming events)
- Actuators Controller (REST API)
### MICROSERVICES:

#### MICROSERVICE: frontend_server
- TYPE: frontend
DESCRIPTION: Web server providing the interactive operator dashboard and real-time data streams.
- PORTS: 8005
- TECHNOLOGICAL SPECIFICATION: Python 3.11, FastAPI, Jinja2, websockets, stomp.py.
- SERVICE ARCHITECTURE: Hybrid web and real-time streaming architecture. It uses FastAPI to serve static HTML templates and proxy REST API requests to the backend. Concurrently, it maintains asynchronous background tasks that subscribe to ActiveMQ topics, queuing incoming events and pushing them live to the browser via dedicated WebSocket connections.

- ENDPOINTS:

| HTTP METHOD | URL | Description | User Stories |
| ----------- | --- | ----------- | ------------ |
| **WS** | `/ws/data_stream` | Streams real-time sensor and telemetry data to the connected clients via WebSockets | 2, 5, 6, 8, 9, 21 |
| **WS** | `/ws/update_actuators` | Streams real-time updates about actuator state changes to the connected clients via WebSockets | 2, 13, 22 |
| **POST** | `/activate_actuator` | Receives an update about an activated actuator and appends it to the internal queues for broadcasting | 13, 22 |
| **GET** | `/actions_queue` | Retrieves the queue/history of recently triggered actuator actions | 22 |
| **GET** | `/rules` | Fetches the list of active automation rules by forwarding the request to the Actuators Controller | 19 |
| **POST** | `/create_rule` | Forwards the payload to the Actuators Controller to create a new automation rule | 15, 16 |
| **POST** | `/delete_rule/{id}` | Forwards the request to the Actuators Controller to delete a specific automation rule | 20 |
| **POST** | `/toggle_actuator/{actuator_name}` | Forwards a manual toggle command for a specific actuator to the Actuators Controller | 14 |

- PAGES:

| Name | Description | Related Microservice | User Stories |
| ---- | ----------- | -------------------- | ------------ |
| `/` | Serves the main Home view of the dashboard (`home.html`). Displays general system statistics, connection health, a summary of active rules, and the Action History log. | actuators_controller | 1, 2, 22 |
| `/dashboard/sensors_telemetry`| Serves the Sensors and Telemetry view (`sensors.html`). Displays a detailed list of telemetry streams and sensors, complete with real-time charts, min/max peaks, measurement units, and warning state highlights. | telemetry_ingestor, sensors_ingestor | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21 |
| `/dashboard/rules` | Serves the Rules and Actuators view (`rules.html`). Provides the interface to view all actuators, their target parameters, manually toggle them, and a form/table to create, view (with dates), and delete automation rules. | actuators_controller | 1, 2, 11, 12, 13, 14, 15, 16, 19, 20 |


## CONTAINER_NAME: mariadb

### DESCRIPTION: 
Relational database serving as the persistent storage layer exclusively for the automation rules.

### USER STORIES:
17

### PORTS: 
3306

### DB STRUCTURE:

#### Table: automation_rules
| Column          | Type                                                                             | Attributes / Constraints    | Description                                                                                    |
| --------------- | -------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| id              | INT                                                                              | PRIMARY KEY, AUTO_INCREMENT | Unique ID of the rule. It is created automatically.                                            |
| sensor_name     | VARCHAR(100)                                                                     | NOT NULL                    | Name of the sensor (for example: temperature sensor, humidity sensor).                         |
| operator        | ENUM('<', '<=', '=', '>', '>=')                                                  | NOT NULL                    | Comparison operator used in the condition (less than, equal, greater than, etc.).              |
| threshold_value | FLOAT                                                                            | NOT NULL                    | Threshold value for the sensor. When the sensor value passes this limit, the rule can trigger. |
| unit            | VARCHAR(20)                                                                      | DEFAULT NULL                | Unit of measurement (for example: °C, %, lux). This field can be empty.                        |
| actuator_name   | ENUM('cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater') | NOT NULL                    | Name of the device that the rule controls.                                                     |
| action          | ENUM('ON', 'OFF')                                                                | NOT NULL                    | Action to perform on the actuator: turn it ON or OFF.                                          |
| created_at      | TIMESTAMP                                                                        | DEFAULT CURRENT_TIMESTAMP   | Date and time when the rule was created.                                                       |

### PERSISTENCE EVALUATION
Volume-backed persistent storage using Docker named volumes (`./database/data:/var/lib/mysql`) ensuring data survives container recreation.

### EXTERNAL SERVICES CONNECTIONS
- Actuators Controller


## CONTAINER_NAME: activemq

### DESCRIPTION: 
The central message broker acting as the backbone of the event-driven architecture. Decouples the ingestion layer from the processing and presentation layers.

### USER STORIES:
2, 4, 5, 6, 8, 21, 22,

### PORTS: 
61613 (STOMP), 8161 (Web Console)

### PERSISTENCE EVALUATION
Ephemeral message queues (in-memory routing of standard events).

### EXTERNAL SERVICES CONNECTIONS
- Sensors Ingestor
- Telemetry Ingestor
- Actuators Controller
- Frontend Server