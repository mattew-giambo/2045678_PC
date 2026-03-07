# Telemetry Server — Overview & Logic Flow

## Folder Structure

```
telemetry_server/
├── main.py             # FastAPI app entry point & lifecycle manager
├── telemetry_client.py # WebSocket consumer & pipeline trigger
├── normalizer.py       # Raw-to-unified data transformer
└── broker.py           # ActiveMQ publisher (defined, not yet wired)
```

---

## High-Level Flow

```
main.py
  └── on startup: spawns 7 background tasks (one per topic)
        └── telemetry_client.py  →  connects to simulator WebSocket
              └── receives raw JSON message
                    └── normalizer.py  →  converts to unified event schema
                          └── prints unified event to terminal
                                (broker.py is ready to forward to ActiveMQ)
```

---

## File-by-File Breakdown

---

### 1. `main.py` — Entry Point & Lifecycle Manager

**Role:** Bootstraps the entire service and manages the lifecycle of background listeners.

**Step-by-step logic:**
1. Defines the list of 7 MQTT-style telemetry topics that the service must ingest (solar array, radiation, life support, thermal loop, power bus, power consumption, airlock).
2. On **startup** (before FastAPI begins serving requests), it loops over every topic and creates an independent async background task for each one by calling `start_telemetry_listeners(topic)`.
3. It yields control back to FastAPI — the server is now running and the background tasks are all alive in parallel.
4. On **shutdown** (after FastAPI stops), it cancels every background task gracefully so no connections hang.
5. Exposes a single `GET /health` endpoint that returns a status confirmation — useful for Docker health checks or load balancers.

**Key concept:** Uses FastAPI's `lifespan` context manager (instead of deprecated `startup`/`shutdown` events) to tie the background task lifecycle directly to the app lifecycle.

---

### 2. `telemetry_client.py` — WebSocket Consumer & Pipeline Trigger

**Role:** The "data ingestion worker". Maintains a persistent WebSocket connection to the simulator for one topic and drives the processing pipeline for each incoming message.

**Step-by-step logic:**
1. Receives a `topic` string from `main.py` (e.g., `"mars/telemetry/solar_array"`).
2. Builds the full WebSocket URL by appending the topic as a query parameter to the simulator's base URL.
3. Enters an outer `while True` loop — this is the **reconnection loop**. If the connection ever drops, the worker will automatically retry after 5 seconds.
4. Inside the connection, enters an inner `while True` loop — this is the **message loop**. It continuously awaits the next message from the simulator without blocking other tasks.
5. For each raw message received:
   - Parses the JSON string into a Python dictionary.
   - Calls `normalize_telemetry(topic, raw_data)` from `normalizer.py` to convert it into the unified event schema.
   - Prints the unified event to the terminal (debug/development mode).
6. Handles `ConnectionClosed` specifically (expected disconnect) and any other `Exception` as a catch-all, both triggering a 5-second sleep before reconnecting.

**Key concept:** `async with websockets.connect(...)` and `await websocket.recv()` allow 7 simultaneous connections to run cooperatively on a single thread without blocking each other.

---

### 3. `normalizer.py` — Raw-to-Unified Data Transformer

**Role:** The "data translator". Knows the schema of every raw telemetry format and maps each one to a single standardized internal event object.

**Step-by-step logic:**

1. **Initialises a base unified event** object with four common fields present for every topic:
   - `device_id` — set to the topic string (acts as the unique sensor identifier).
   - `timestamp` — extracted from `event_time` in the raw payload.
   - `status` — extracted from `status` if present, otherwise defaults to `"ok"`.
   - `metrics` — empty dict, will be populated per schema type.
   - `metadata` — empty dict, will be populated per schema type.

2. **Branches by schema type** using topic membership checks:

   | Schema Type | Topics Covered | What Gets Extracted |
   |---|---|---|
   | **Power** (`topic.power.v1`) | `solar_array`, `power_bus`, `power_consumption` | `subsystem` → metadata; `power_kw`, `voltage_v`, `current_a`, `cumulative_kwh` → metrics |
   | **Environment** (`topic.environment.v1`) | `radiation`, `life_support` | `source.system` + `source.segment` → metadata; flattens the `measurements` array into key/value metrics |
   | **Thermal Loop** (`topic.thermal_loop.v1`) | `thermal_loop` | `loop` → metadata; `temperature_c`, `flow_l_min` → metrics |
   | **Airlock** (`topic.airlock.v1`) | `airlock` | `airlock_id` + `last_state` → metadata; `cycles_per_hour` → metrics |

3. **Returns the unified event** dict — the same shape regardless of which topic it came from.

**Key concept:** Separating `metrics` (numerical health measurements) from `metadata` (contextual/descriptive info) makes downstream consumers (dashboards, alerting rules) schema-agnostic.

---

### 4. `broker.py` — ActiveMQ Publisher

**Role:** The "message dispatcher". Knows how to connect to ActiveMQ and publish a unified event to the shared enterprise topic.

**Step-by-step logic:**
1. Defines the connection parameters: ActiveMQ host (`localhost`, intended to be `activemq` in Docker Compose), STOMP port `61613`, and the destination topic `/topic/mars.habitat.events`.
2. `get_connection()` — creates a STOMP client connection with admin credentials and returns it.
3. `publish_to_activemq(unified_event)`:
   - Opens a new connection via `get_connection()`.
   - Serialises the unified event dict to a JSON string.
   - Sends it to the ActiveMQ topic.
   - Immediately disconnects (fire-and-forget pattern).
   - Catches and logs any exception without crashing the caller.

**Current status:** This module is fully implemented but **not yet wired** into `telemetry_client.py`. The client currently prints unified events to the terminal instead of calling `publish_to_activemq()`. The next integration step would be to import and call `publish_to_activemq(unified_event)` in `telemetry_client.py` after normalization.

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
  "device_id": "mars/telemetry/solar_array",
  "timestamp": "2026-03-06T10:00:00Z",
  "status": "ok",
  "metrics": {
    "power_kw": 12.5,
    "voltage_v": 28.4,
    "current_a": 44.0,
    "cumulative_kwh": 3021.7
  },
  "metadata": {
    "subsystem": "solar_array"
  }
}
```

---

## Concurrency Model

All 7 topic listeners run **concurrently** using Python's `asyncio` event loop. They are cooperative (not parallel threads), meaning each task voluntarily yields control at every `await` point (`websocket.recv()`, `asyncio.sleep()`). This is efficient for I/O-bound workloads like network streaming.
