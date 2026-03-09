# SYSTEM DESCRIPTION:
Mars Operations is a **real-time IoT monitoring and automation platform** designed for a simulated Mars habitat environment. It connects to a Mars IoT simulator that produces environmental sensor readings and telemetry streams, giving operators full visibility and control over the habitat's conditions. The system provides an intuitive dashboard interface to create custom automation rules according to operator preferences, ensuring the habitat reacts autonomously to environmental changes.

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

# EVENT SCHEMA:
```json
{
  "type": "object",
  "required": ["device_id", "time", "metrics"],
  "properties": {
    "device_id": {"type": "string"},
    "time": {"type": "string", "format": "date-time"},
    "status": {"type": "string", "enum": ["ok", "warning"]},
    "metrics": {
        "type": "array",
        "items": {
        "type": "object",
        "required": ["metric_name", "value"],
        "properties": {
          "metric_name": {"type": "string"},
          "value": {"type": "number"},
          "unit": {"type": "string"}
        }
      }
    },
    "metadata": {
        "type": "object",
        "properties": {}
    }
  }
}
```