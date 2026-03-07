# SYSTEM DESCRIPTION:

# USER STORIES:
1) As an operator, I want to see the list of available sensors so that I know which environmental parameters are monitored.

2) As an operator, I want to see the latest value of each sensor so that I can monitor the habitat conditions.

3) As an operator, I want to see the measurement unit of each sensor so that I can correctly interpret the values.

4) As an operator, I want the dashboard updates in real-time so I can monitor telemetry and manage rules without refreshing the page.

5) As an operator, I want the dashboard to visually highlight sensors that report measurements violating defined rules, so that I can quickly identify and address anomalies.

6) As an operator, I want real-time charts that update automatically as measurement data of sensors arrives so that trends and anomalies can be visualized.

7) As an operator, I want to define automation rules using a simple interface, so that environmental conditions can be controlled automatically.

8) As an operator, I want rules to persist after system restarts so that automation continues to work reliably.

9) As an operator, I want rules to be evaluated immediately whenever a new event arrives so that the system can react without delay.

10) As an operator, I want to view a list of all active automation rules in a management interface so that the current automation logic is visible and understandable.

11) As an operator, I want to delete automation rules so that obsolete or incorrect automations are removed and does not influence system behavior anymore.

12) As an operator, I want to be able to define only valid automation rules.

13) As an operator, I want the dashboard displays the telemetry measurements. 

14) As an operator, I want real-time charts that update automatically as telemetry measurement data arrives so that trends can be visualized.

15) As an operator, I want the dashboard displays the list of all actuators.

16) As an operator, I want the dashboard displays the active actuators at any time.

17) As an operator, I want the dashboard to highlight the sensors that are in the warning state.

18) An an operator, I want the dashboard to displays the time at which an actuator has been toggled.

19) An an operator, I want the dashboard to displays the date when an automation rule has been defined.

20) As an operator, I want to see the minimum and maximum value recorded for each sensor during the current session, so that I can evaluate the range of environmental conditions.

21) As an operator, I want the dashboard to immediately show when a rule updates an actuator's state so I can verify the system reacted properly.

22) As an operator, I want the dashboard to display a history of all system actions triggered by environmental changes, so that I can monitor how the system is responding in real-time.

23) As an operator, I want the dashboard interface organized into distinct visual sections for sensors, telemetry streams, and actuators so that I can navigate the controls quickly.

24) As an operator, I want the dashboard displays when the system is healthy.

25) As an operator, I want the dashboard to display the specific environmental parameter each actuator controls, so that I can rapidly understand the purpose of every device.

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