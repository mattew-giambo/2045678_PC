# MarsOps: LoFi Mockups & Non-Functional Requirements Booklet

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
* **NFR - Reliability:** The connection must be maintained via WebSocket. The frontend client must implement an auto-reconnect logic in case of a temporary disconnection from the backend, without requiring a manual page refresh.

**User Story 3:** As an operator, I want the dashboard displays when the system is healthy.
* **LoFi Mockup:** ![](/booklets/images/healthyy.png)
* **NFR - Availability:** The frontend must regularly verify the operational status of the infrastructure by querying the system's diagnostic (health check) endpoints. If the services become unreachable or report a malfunction, the user interface must update to notify the operator of an "Offline" or "Error" state.

---

### 2. Sensors & Telemetry (Data Monitoring)

**User Story 4:** As an operator, I want to see the list of available sensors so that I know which environmental parameters are monitored.
* **LoFi Mockup:** ![](/booklets/images/sensors_recap.png)
![](/booklets/images/sensors.png)

**User Story 5:** As an operator, I want to see the measurement unit of each sensor so that I can correctly interpret the values.
* **LoFi Mockup:** ![](/booklets/images/latest_value.png)

**User Story 6:** As an operator, I want to see the latest value of each sensor so that I can monitor the habitat conditions.
* **LoFi Mockup:** ![](/booklets/images/units.png)
* **NFR - Reliability:** The connection must be maintained via WebSocket. The frontend client must implement an auto-reconnect logic in case of a temporary disconnection from the backend, without requiring a manual page refresh.

**User Story 7:** As an operator, I want real-time charts that update automatically as measurement data of sensors arrives so that trends and anomalies can be visualized.
* **LoFi Mockup:** ![](/booklets/images/chart.png)
* **NFR - Performance (Rendering):** The chart must keep in memory the measurement data and render them to allow the visualization of trends.

**User Story 8:** As an operator, I want to see the minimum and maximum value recorded for each sensor during the current session, so that I can evaluate the range of environmental conditions.
* **LoFi Mockup:** ![](/booklets/images/min_max.png)
* **NFR - Efficiency:** The min/max calculation must be done in-memory on the client side for the current session.

**User Story 9:** As an operator, I want the dashboard displays the telemetry measurements.
* **LoFi Mockup:** ![](/booklets/images/telemetry_measurements.png)
* **NFR - Performance (Latency):** The frontend must smoothly process multiple high-frequency streams (published every 500ms) sent by the `message broker` without freezing the main thread.

**User Story 10:** As an operator, I want real-time charts that update automatically as telemetry measurement data arrives so that trends can be visualized.
* **LoFi Mockup:** ![](/booklets/images/telemetry_charts.png)
* **NFR - Usability:** The expanded chart view must open smoothly and without latency when the user clicks on a specific telemetry topic.

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

---

### 4. Automation Engine (Rule Management)

**User Story 14:** As an operator, I want to define automation rules using a simple interface, so that environmental conditions can be controlled automatically.
* **LoFi Mockup:** ![](/booklets/images/create_rule.png)
* **NFR - Usability:** The form must force the use of drop-down menus for sensor identifiers, logical operators, and actions, eliminating the risk of manual typing errors.
* **NFR - Auditability:** The database must assign a secure, server-side timestamp upon the insertion of any new rule. This guarantees an immutable and reliable audit trail of when the automation was configured, independent of the client's local time.
* **NFR - Security:** The system shall ensure that only valid automation rules can be stored in the database according to the relative `INSERT`.

**User Story 15:** As an operator, I want to be able to define only valid automation rules.
* **LoFi Mockup:** ![](/booklets/images/rules_confirmation.png)
* **NFR - Data Integrity:** The MariaDB database must enforce a `UNIQUE(sensor_name, actuator_name, action)` constraint. The `actuators_controller` backend must catch the SQL error and return an HTTP 409 (Conflict) status code if a duplicate is found.

**User Story 16:** As an operator, I want rules to persist after system restarts so that automation continues to work reliably.
* **LoFi Mockup:** ![](/booklets/images/rules_real_time.png)
* **NFR - Reliability:** The rules must be saved in MariaDB. When the `actuators_controller` container restarts, the automation engine must reload the rules into memory in less than 2 seconds.

**User Story 17:** As an operator, I want rules to be evaluated immediately whenever a new event arrives so that the system can react without delay.
* **LoFi Mockup:** ![](/booklets/images/event.png)
![](/booklets/images/reaction.png)
* **NFR - Performance:** The evaluation engine must scan the rules and calculate the boolean condition in real time for each event fetched from the ActiveMQ broker (processing time under 100ms).

**User Story 18:** As an operator, I want to see the minimum and maximum values recorded for each telemetry during the current session, so that I can evaluate the range of environmental conditions.
* **LoFi Mockup:** ![](/booklets/images/min_max_tel.png)
* **NFR - Efficiency:** The min/max calculation must be done in-memory on the client side for the current session.


**User Story 19:** An an operator, I want the dashboard to displays the date when an automation rule has been defined.
* **LoFi Mockup:** ![](/booklets/images/19.jpg)
* **NFR - Standardization:** The timestamps extracted from the database must be serialized and sent to the frontend in the standard ISO 8601 format.

**User Story 20:** As an operator, I want to delete automation rules so that obsolete or incorrect automations are removed and does not influence system behavior anymore.
* **LoFi Mockup:** ![](/booklets/images/20.jpg)
* **NFR - Security:** Since the rules are immutable, the `DELETE` operation is destructive.

---

### 5. Alerts & Audit Trail (Anomalies & History)

**User Story 21:** As an operator, I want the dashboard to highlight the sensors that are in the warning state.
* **LoFi Mockup:** ![](/booklets/images/warning.png)
* **NFR - Usability:** The system must translate the `"status": "warning"` payload into a clear visual signal (e.g., changing the color of the box or text) for a quick visual triage.

**User Story 22:** As an operator, I want the dashboard to display the date and time of the first successful connection to the system, so that I know since when the system has been online.
* **LoFi Mockup:** ![](/booklets/images/conn.png)
* **NFR - Traceability**: The frontend must record and display the timestamp of the first successful backend connection in the current session, enabling operators to easily see how long the system has been online.


**User Story 23:** As an operator, I want the dashboard to display a history of all system actions triggered by environmental changes, so that I can monitor how the system is responding in real-time.
* **LoFi Mockup:** ![](/booklets/images/history.png)
* **NFR - Performance:** To avoid overloading the browser's DOM over time, the widget must show only the last N actions on the screen (e.g., 5-10 recent logs), freeing memory for older ones.

**User Story 24:** As an operator, I want the dashboard to immediately show when a rule updates an actuator's state so I can verify the system reacted properly.
* **LoFi Mockup:** ![](/booklets/images/history_rule_reaction.png)
* **NFR - Traceability:** For each event fetched from the ActiveMQ broker (processing time under 100ms) the rules must be scanned and calculated the boolean condition in real time and then added to the history.

**User Story 25:** An an operator, I want the dashboard to displays the time at which an actuator has been toggled.
* **LoFi Mockup:** ![](/booklets/images/history_rule_reaction.png)
* **NFR - Localization:** The frontend must take the UTC timestamp provided by the backend event and format it automatically into the local time zone of the operator's browser.





**User Story 18:** As an operator, I want to view a list of all active automation rules in a management interface so that the current automation logic is visible and understandable.
* **LoFi Mockup:** ![](/booklets/images/status.png)
* **NFR - Usability:** The structured data saved in the database must be parsed by the frontend and displayed in a pseudo-natural, readable format (e.g., `IF entrance_humidity > 100 THEN entrance_humidifier OFF`).


**User Story 22:** As an operator, I want the dashboard to visually highlight sensors that report measurements violating defined rules, so that I can quickly identify and address anomalies.
* **LoFi Mockup:** `[Insert crop: Sensor card with an active visual highlight effect]`
* **NFR - Usability:** The frontend must react by temporarily applying a CSS class (a "flash" animation) to the component when it receives a notification from the broker that a rule for that sensor has just been triggered.