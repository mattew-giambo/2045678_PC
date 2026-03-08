# Telemetry Server — Overview & Logic Flow

## Folder Structure

```
telemetry_server/
├── main.py             # Async entrypoint — spawns background listeners
├── telemetry_client.py # WebSocket consumer & pipeline trigger
├── normalizer.py       # Raw-to-unified data transformer
├── broker_client.py    # ActiveMQ publisher via STOMP
└── Dockerfile          # Container definition
```

---

## High-Level Flow

```
main.py
  └── asyncio.run(main()) → spawns 7 background tasks (one per topic)
        └── telemetry_client.py  →  connects to simulator WebSocket
              └── receives raw JSON message
                    └── normalizer.py  →  converts to unified event schema
                          └── broker_client.py  →  publishes to ActiveMQ
```

---

## File-by-File Breakdown

---

### 1. `main.py` — Async Entrypoint

**Role:** Bootstraps the service and manages the lifecycle of all background listeners.

**Step-by-step logic:**
1. Defines the list of 7 telemetry topics to ingest (solar_array, radiation, life_support, thermal_loop, power_bus, power_consumption, airlock).
2. `main()` creates one `asyncio` background task per topic by calling `start_telemetry_listeners(topic)`.
3. `asyncio.gather(*tasks)` runs all 7 tasks concurrently on the same event loop.
4. On shutdown (SIGINT / container stop), all tasks are cancelled gracefully.

**Key concept:** No web framework is used — this is a pure background worker service. `asyncio.run(main())` is the idiomatic entrypoint for I/O-bound pipeline workers that don't need to expose HTTP endpoints.

---

### 2. `telemetry_client.py` — WebSocket Consumer & Pipeline Trigger

**Role:** The "data ingestion worker". Maintains a persistent WebSocket connection to the simulator for one topic and drives the full processing pipeline per message.

**Step-by-step logic:**
1. Receives a `topic` string (e.g., `"mars/telemetry/solar_array"`).
2. Builds the full WebSocket URL: `ws://localhost:8080/api/telemetry/ws?topic=<topic>`.
3. Outer `while True` — **reconnection loop**: retries every 5 seconds on connection loss.
4. Inner `while True` — **message loop**: awaits each incoming message without blocking other tasks.
5. For each message:
   - Parses JSON into a Python dict.
   - Calls `normalize_telemetry(topic, raw_data)` → unified event.
   - Calls `publish_to_activemq(unified_event, "telemetry")` → sends to broker.
6. Handles `ConnectionClosed` and generic exceptions gracefully with a 5-second retry.

**Key concept:** `async with websockets.connect(...)` and `await websocket.recv()` allow all 7 listeners to run cooperatively on a single thread.

---

### 3. `normalizer.py` — Raw-to-Unified Data Transformer

**Role:** Translates every raw simulator payload into a single standardized internal event shape.

**Step-by-step logic:**

1. **Initialises a base unified event** with fields common to all topics:
   - `device_id` — last segment of the topic string (e.g., `"solar_array"` not the full path).
   - `time` — extracted from `event_time` in the raw payload.
   - `status` — extracted from `status` if present, defaults to `"ok"`.
   - `metrics` — empty **array**, populated per schema type.
   - `metadata` — empty dict, populated per schema type.

2. **Branches by schema type:**

   | Schema Type | Topics Covered | Metrics format | Metadata |
   |---|---|---|---|
   | **Power** | `solar_array`, `power_bus`, `power_consumption` | `{metric_name, value, unit}` objects with explicit units (kW, V, A, kWh) | `subsystem` |
   | **Environment** | `radiation`, `life_support` | `{metric_name, value, unit?}` from raw `measurements` array | nested `source: {system, segment}` |
   | **Thermal Loop** | `thermal_loop` | `{metric_name, value, unit}` — temperature in C, flow in L/min | `loop` |
   | **Airlock** | `airlock` | `{metric_name: "cycles", value, unit: "per_hour"}` | `airlock_id`, `last_state` |

3. **Prints the normalized event** to stdout for debugging.
4. **Returns the unified event** dict.

**Key concept:** `metrics` is an array of typed objects `{metric_name, value, unit}` — units are explicit fields, not baked into key names. `device_id` is the short endpoint name, not the full topic path.

---

### 4. `broker_client.py` — ActiveMQ Publisher

**Role:** Connects to ActiveMQ via STOMP and routes each unified event to a dynamically named topic.

**Step-by-step logic:**
1. `BrokerClient.connect()` — creates or reuses a STOMP connection to `localhost:61613` with admin credentials.
2. `BrokerClient.publish(unified_event, category)`:
   - Extracts `device_id` from the event (e.g., `"solar_array"`).
   - Builds the destination topic: `/topic/<category>.<device_id>` → e.g., `/topic/telemetry.solar_array`.
   - Serialises the event to JSON and sends it.
   - Resets the connection on failure so the next call reconnects automatically.
3. A module-level singleton `activemq_client` is shared across all 7 listener tasks.
4. `publish_to_activemq(unified_event, category)` is the public function imported by `telemetry_client.py`.

**Published topic names:**
```
/topic/telemetry.solar_array
/topic/telemetry.power_bus
/topic/telemetry.power_consumption
/topic/telemetry.radiation
/topic/telemetry.life_support
/topic/telemetry.thermal_loop
/topic/telemetry.airlock
```

**Note:** The simulator also publishes its own raw data directly to ActiveMQ under `mars.data.telemetry.*` topics. Those are independent of this server and contain unnormalized payloads.

---

### 5. `Dockerfile` — Container Definition

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir websockets==16.0 stomp.py==8.2.0
CMD ["python", "main.py"]
```

Only two third-party dependencies are needed: `websockets` (simulator connection) and `stomp.py` (ActiveMQ connection). No web framework is required.

---

## Data Shape Summary

### Raw input (example — solar array topic)
```json
{
  "event_time": "2026-03-06T10:00:00Z",
  "subsystem": "solar_array",
  "power_kw": 12.5,
  "voltage_v": 28.4,
  "current_a": 44.0,
  "cumulative_kwh": 3021.7
}
```

### Unified event output (all topics)
```json
{
  "device_id": "solar_array",
  "time": "2026-03-06T10:00:00Z",
  "status": "ok",
  "metrics": [
    { "metric_name": "power",            "value": 12.5,   "unit": "kW"  },
    { "metric_name": "voltage",          "value": 28.4,   "unit": "V"   },
    { "metric_name": "current",          "value": 44.0,   "unit": "A"   },
    { "metric_name": "cumulative_energy","value": 3021.7, "unit": "kWh" }
  ],
  "metadata": {
    "subsystem": "solar_array"
  }
}
```

---

## Concurrency Model

All 7 topic listeners run **concurrently** using Python's `asyncio` event loop. They are cooperative (not parallel threads), meaning each task voluntarily yields control at every `await` point (`websocket.recv()`, `asyncio.sleep()`). This is efficient for I/O-bound workloads like network streaming.
