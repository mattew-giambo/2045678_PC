# SYSTEM DESCRIPTION:

<system of the system>

# USER STORIES:

1. As an operator, I want the dashboard interface organized into distinct visual sections for sensors, telemetry streams, and actuators so that I can navigate the controls quickly.
2. As an operator, I want the dashboard updates in real-time so I can monitor telemetry and manage rules without refreshing the page.
3. As an operator, I want the dashboard displays when the system is healthy.

4. As an operator, I want to see the list of available sensors so that I know which environmental parameters are monitored.
5. As an operator, I want to see the measurement unit of each sensor so that I can correctly interpret the values.
6. As an operator, I want to see the latest value of each sensor so that I can monitor the habitat conditions.
7. As an operator, I want real-time charts that update automatically as measurement data of sensors arrives so that trends and anomalies can be visualized.
8. As an operator, I want to see the minimum and maximum value recorded for each sensor during the current session, so that I can evaluate the range of environmental conditions.
9. As an operator, I want the dashboard displays the telemetry measurements.
10. As an operator, I want real-time charts that update automatically as telemetry measurement data arrives so that trends can be visualized.

11. As an operator, I want the dashboard displays the list of all actuators.
12. As an operator, I want the dashboard to display the specific environmental parameter each actuator controls, so that I can rapidly understand the purpose of every device.
13. As an operator, I want the dashboard displays the active actuators at any time.

14. As an operator, I want to define automation rules using a simple interface, so that environmental conditions can be controlled automatically.
15. As an operator, I want to be able to define only valid automation rules.
16. As an operator, I want rules to persist after system restarts so that automation continues to work reliably.
17. As an operator, I want rules to be evaluated immediately whenever a new event arrives so that the system can react without delay.
18. As an operator, I want to view a list of all active automation rules in a management interface so that the current automation logic is visible and understandable.
19. An an operator, I want the dashboard to displays the date when an automation rule has been defined.
20. As an operator, I want to delete automation rules so that obsolete or incorrect automations are removed and does not influence system behavior anymore.

21. As an operator, I want the dashboard to highlight the sensors that are in the warning state.
22. As an operator, I want the dashboard to visually highlight sensors that report measurements violating defined rules, so that I can quickly identify and address anomalies.
23. As an operator, I want the dashboard to display a history of all system actions triggered by environmental changes, so that I can monitor how the system is responding in real-time.
24. As an operator, I want the dashboard to immediately show when a rule updates an actuator's state so I can verify the system reacted properly.
25. An an operator, I want the dashboard to displays the time at which an actuator has been toggled.


# CONTAINERS:

## CONTAINER_NAME: sensors_ingestor

### DESCRIPTION: 
Ingestion service responsible for polling the REST sensors of the IoT simulator at regular intervals. It normalizes the heterogeneous raw JSON payloads into the standard Unified Event Schema and publishes them to the ActiveMQ message broker.

### USER STORIES:
1, 2, 3

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
- DESCRIPTION: Python worker that continuously polls REST endpoints using independent threads.
- PORTS: None
- TECHNOLOGICAL SPECIFICATION:
Python 3.11, `requests` for HTTP polling, `stomp.py` for ActiveMQ communication.
- SERVICE ARCHITECTURE: 
Multi-threaded architecture. A main script spawns a daemon Thread for each configured sensor. Each thread independently executes an infinite loop (fetching data, normalizing it, and publishing to the broker) ensuring that a network delay on one sensor does not block the others.

## CONTAINER_NAME: telemetry_ingestor

### DESCRIPTION: 
Ingestion service that subscribes to the IoT simulator's telemetry WebSocket streams, normalizes the continuous asynchronous data flow, and pushes standardized events to the ActiveMQ message broker.

### USER STORIES:
13

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
7, 8, 9, 10, 11, 12, 15, 19, 21

### PORTS: 
8000

### PERSISTENCE EVALUATION
Reads and writes automation rules to the MariaDB database to ensure they survive system restarts. Evaluates events statelessly on arrival.

### EXTERNAL SERVICES CONNECTIONS
- ActiveMQ (STOMP protocol for consuming events)
- MariaDB (TCP for database operations)
- Mars IoT Simulator (HTTP POST to trigger actuators)
- Frontend Server (HTTP POST to notify rule activations)

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
    | ----------- | --- | ----------- | ------------ |
    | POST | /create_rule | Inserts a new immutable automation rule. Prevents conflicting rules via DB constraints. | 7, 12, 19 |
    | POST | /delete_rule/{id} | Deletes a specific active rule by ID. | 11 |
    | GET | /rules | Retrieves the list of all currently active automation rules. | 10 |

- DB STRUCTURE: 

    **_automation_rules_** : | **_id_** (INT, PK) | sensor_name (VARCHAR) | operator (ENUM) | threshold_value (FLOAT) | unit (VARCHAR) | actuator_name (ENUM) | action (ENUM) | created_at (TIMESTAMP)
    *(Note: The table enforces a UNIQUE constraint on the combination of `sensor_name`, `actuator_name`, and `action` to prevent contradictory rules).*

## CONTAINER_NAME: frontend

### DESCRIPTION: 

### USER STORIES:

### PORTS: 

### PERSISTENCE EVALUATION

### EXTERNAL SERVICES CONNECTIONS

### MICROSERVICES:

#### MICROSERVICE: frontend_server
- TYPE: 
- DESCRIPTION: 
- PORTS:
- TECHNOLOGICAL SPECIFICATION:
- SERVICE ARCHITECTURE: 

- PAGES: 

    | Name | Description | Related Microservice | User Stories |
    | ---- | ----------- | -------------------- | ------------ |
    


## CONTAINER_NAME: mariadb

### DESCRIPTION: 
Relational database serving as the persistent storage layer exclusively for the automation rules.

### USER STORIES:
8

### PORTS: 
3306

### PERSISTENCE EVALUATION
Volume-backed persistent storage using Docker named volumes (`./database/data:/var/lib/mysql`) ensuring data survives container recreation.

### EXTERNAL SERVICES CONNECTIONS
None.


## CONTAINER_NAME: activemq

### DESCRIPTION: 
The central message broker acting as the backbone of the event-driven architecture. Decouples the ingestion layer from the processing and presentation layers.

### USER STORIES:
4, 9 (Enables real-time event distribution)

### PORTS: 
61613 (STOMP), 8161 (Web Console)

### PERSISTENCE EVALUATION
Ephemeral message queues (in-memory routing of standard events).

### EXTERNAL SERVICES CONNECTIONS
None.