# Mars Operations: LoFi Mockups & Non-Functional Requirements Booklet

This document maps each User Story of the system to its corresponding User Interface component (LoFi Mockup) and defines its architectural and usability Non-Functional Requirements (NFRs).

---

### 1. System Health

**User Story 1:** As an operator, I want the dashboard interface organized into distinct visual sections for sensors, telemetry streams, and actuators so that I can navigate the controls quickly.
* **LoFi Mockup:** ![](/booklets/images/navigation.png)
* **NFR - Usability / Maintainability:** The layout must use CSS Grid/Flexbox to ensure a consistent display and quick visual access to the three main domains, making the interface easily extendable.

**User Story 2:** As an operator, I want the dashboard updates in real-time so I can monitor telemetry and manage rules without refreshing the page.
* **LoFi Mockup:** ![](/booklets/images/active_rules.png)
![](/booklets/images/rules_real_time.png)
![](/booklets/images/telemetry_real_time.png)
* **NFR - Reliability:** The connection must be maintained via WebSocket, in order to guarantee a real-time connection between the client browser and the frontend server.

---

### 2. Sensors & Telemetry (Data Monitoring)

**User Story 3:** As an operator, I want to see the list of available sensors so that I know which environmental parameters are monitored.
* **LoFi Mockup:** ![](/booklets/images/sensors_recap.png)
![](/booklets/images/sensors.png)

**User Story 4:** As an operator, I want to see the measurement unit of each sensor so that I can correctly interpret the values.
* **LoFi Mockup:** ![](/booklets/images/latest_value.png)

**User Story 5:** As an operator, I want to see the latest value of each sensor so that I can monitor the habitat conditions.
* **LoFi Mockup:** ![](/booklets/images/units.png)

**User Story 6:** As an operator, I want real-time charts that update automatically as measurement data of sensors arrives so that trends and anomalies can be visualized.
* **LoFi Mockup:** ![](/booklets/images/chart.png)
* **NFR - Performance (Rendering):** The chart must keep in memory the measurement data and render them to allow the visualization of trends.

**User Story 7:** As an operator, I want to see the minimum and maximum value recorded for each sensor during the current session, so that I can evaluate the range of environmental conditions.
* **LoFi Mockup:** ![](/booklets/images/min_max.png)
* **NFR - Efficiency:** The min/max calculation must be done in-memory on the client side for the current session.

**User Story 8:** As an operator, I want the dashboard displays the telemetry measurements.
* **LoFi Mockup:** ![](/booklets/images/telemetry_measurements.png)
* **NFR - Performance (Latency):** The frontend server must smoothly process multiple streams sent by the `message broker`.

**User Story 9:** As an operator, I want real-time charts that update automatically as telemetry measurement data arrives so that trends can be visualized.
* **LoFi Mockup:** ![](/booklets/images/telemetry_charts.png)
* **NFR - Usability:** The expanded chart view must open smoothly and without latency when the user clicks on a specific telemetry topic.

**User Story 10:** As an operator, I want to see the minimum and maximum values recorded for each telemetry during the current session, so that I can evaluate the range of environmental conditions.
* **LoFi Mockup:** ![](/booklets/images/min_max_tel.png)
* **NFR - Efficiency:** The min/max calculation must be done in-memory on the client side for the current session.

---

### 3. Actuators (Device Control)

**User Story 11:** As an operator, I want the dashboard displays the list of all actuators.
* **LoFi Mockup:** ![](/booklets/images/actuators.png)

**User Story 12:** As an operator, I want the dashboard to display the specific environmental parameter each actuator controls, so that I can rapidly understand the purpose of every device.
* **LoFi Mockup:** ![](/booklets/images/environmental_parameter.png)
* **NFR - Usability:** The logical mapping between the sensor and the actuator must be easy to read but visually secondary compared to the main ON/OFF toggle switch.

**User Story 13:** As an operator, I want the dashboard displays the active actuators at any time.
* **LoFi Mockup:** 
![](/booklets/images/active_actuator.png)
* **NFR - Data Consistency:** The visual state shown by the frontend must strictly depend on the confirmation messages sent by the backend. This ensures there are no graphic false positives if the REST command fails.

**User Story 14:** As an operator, I want to manually activate actuators from the dashboard, so that I can directly control the devices when needed.
* **LoFi Mockup:** 
![](/booklets/images/active_actuator.png)
* **NFR - Usability:** The system must provide immediate visual feedback for each actuator ON/OFF toggle on the dashboard, ensuring the displayed state matches the backend and physical device state.

### 4. Automation Engine (Rule Management)

**User Story 15:** As an operator, I want to define automation rules using a simple interface, so that environmental conditions can be controlled automatically.
* **LoFi Mockup:** ![](/booklets/images/create_rule.png)
* **NFR - Usability:** The form must force the use of drop-down menus for sensor identifiers, logical operators, and actions, eliminating the risk of manual typing errors.
* **NFR - Security:** The system shall ensure that only valid automation rules can be stored in the database according to the relative `INSERT`.

**User Story 16:** As an operator, I want to be able to define only valid automation rules.
* **LoFi Mockup:** ![](/booklets/images/rules_confirmation.png)
* **NFR - Data Integrity:** The MariaDB database must enforce a `UNIQUE(sensor_name, actuator_name, action)` constraint. The `actuators_controller` backend must catch the SQL error and return an HTTP 409 (Conflict) status code if a duplicate is found.

**User Story 17:** As an operator, I want rules to persist after system restarts so that automation continues to work reliably.
* **LoFi Mockup:** ![](/booklets/images/rules_real_time.png)
* **NFR - Reliability:** The rules must be saved in MariaDB. When the `actuators_controller` container restarts, the automation engine must reload the rules into memory in less than 2 seconds.

**User Story 18:** As an operator, I want rules to be evaluated immediately whenever a new event arrives so that the system can react without delay.
* **LoFi Mockup:** ![](/booklets/images/event.png)
![](/booklets/images/reaction.png)
* **NFR - Performance:** The evaluation engine must scan the rules and calculate the boolean condition in real time for each event fetched from the ActiveMQ broker.


**User Story 19:** An an operator, I want the dashboard to displays the date when an automation rule has been defined.
* **LoFi Mockup:** ![](/booklets/images/19.jpg)

**User Story 20:** As an operator, I want to delete automation rules so that obsolete or incorrect automations are removed and does not influence system behavior anymore.
* **LoFi Mockup:** ![](/booklets/images/20.jpg)
* **NFR - Security:** Since the rules are immutable, the `DELETE` operation is destructive.

---

### 5. Alerts & Audit Trail (Anomalies & History)

**User Story 21:** As an operator, I want the dashboard to highlight the sensors that are in the warning state.
* **LoFi Mockup:** ![](/booklets/images/warning.png)
* **NFR - Usability:** The system must translate the `"status": "warning"` payload into a clear visual signal (e.g., changing the color of the box or text) for a quick visual triage.


**User Story 22:** As an operator, I want the dashboard to display a history of all system actions triggered by environmental changes, so that I can monitor how the system is responding in real-time.
* **LoFi Mockup:** ![](/booklets/images/history.png)
* **NFR - Performance:** To avoid overloading the browser's DOM over time, the widget must show only the last N actions on the screen (e.g., 5-10 recent logs), freeing memory for older ones.
* **NFR - Traceability:** For each event the rules must be scanned and calculated the boolean condition in real time and then added to the history.

---

### 6. System Developers

**User Story 23:** As a developer, I want to containerize all services of the system using docker compose, so that the team can start the entire stack with a single command.

**User Story 24:** As a developer, I want the telemetry and sensors event exchanged between the ingestion layer and the processing layer to follow a standardized JSON event schema, so that the two layers can communicate reliably.

**User Story 25:** As a developer, I want Docker containers to be isolated from each other, so that applications can run independently without interfering with other services.
