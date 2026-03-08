import uvicorn
import httpx
import asyncio
import json
import os
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from typing import List, Dict, Any

from config import HOST, PORT, SIMULATOR_URL, ACTUATORS_API_URL
from source.frontend.frontend.old.broker_client import broker_client

BASE_DIR = Path(__file__).resolve().parent

active_websockets: List[WebSocket] = []
latest_data: Dict[str, Any] = {}

# ✅ Costanti globali — endpoint sensori e telemetria
SENSOR_ENDPOINTS = [
    "greenhouse_temperature",
    "entrance_humidity",
    "co2_hall",
    "hydroponic_ph",
    "water_tank_level",
    "corridor_pressure",
    "air_quality_pm25",
    "air_quality_voc"
]

TELEMETRY_ENDPOINTS = [
    "mars/telemetry/solar_array",
    "mars/telemetry/radiation",
    "mars/telemetry/life_support",
    "mars/telemetry/thermal_loop",
    "mars/telemetry/power_bus",
    "mars/telemetry/power_consumption",
    "mars/telemetry/airlock"
]

# Task globali
polling_task = None
telemetry_task = None


# ============== BROKER CALLBACK ==============

def on_broker_message(destination: str, data: dict):
    """Callback chiamata quando arriva un messaggio dal broker (sensori)."""
    latest_data[destination] = data
    message = {
        "type": "update",
        "source": destination,
        "data": data
    }
    try:
        loop = asyncio.get_event_loop()
        loop.call_soon_threadsafe(asyncio.ensure_future, broadcast_message(message))
    except RuntimeError as e:
        print(f"[BROKER] Errore event loop: {e}")


# ============== WEBSOCKET BROADCAST ==============

async def broadcast_message(message: dict):
    """Invia un messaggio a tutti i WebSocket connessi."""
    disconnected = []
    for websocket in active_websockets:
        try:
            await websocket.send_json(message)
        except Exception:
            disconnected.append(websocket)
    for ws in disconnected:
        if ws in active_websockets:
            active_websockets.remove(ws)


# ============== DATI INIZIALI ==============

async def get_initial_data() -> Dict[str, Any]:
    """Richiede i dati iniziali dei sensori REST al simulatore."""
    initial_data = {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        for endpoint in SENSOR_ENDPOINTS:
            try:
                response = await client.get(f"{SIMULATOR_URL}/api/sensors/{endpoint}")
                if response.status_code == 200:
                    initial_data[endpoint] = response.json()
                    print(f"[INIT] Ottenuto sensore {endpoint}")
            except Exception as e:
                print(f"[INIT] Errore sensore {endpoint}: {e}")

        # Stato iniziale attuatori
        try:
            response = await client.get(f"{SIMULATOR_URL}/api/actuators")
            if response.status_code == 200:
                data = response.json()
                if "actuators" in data:
                    for name, state in data["actuators"].items():
                        initial_data[name] = {"state": state == "ON", "action": state}
                        print(f"[INIT] Attuatore {name}: {state}")
        except Exception as e:
            print(f"[INIT] Errore attuatori: {e}")

    return initial_data


# ============== POLLING SENSORI (REST) ==============

async def poll_sensors():
    """Polling periodico REST per i sensori."""
    while True:
        await asyncio.sleep(5)
        async with httpx.AsyncClient(timeout=5.0) as client:
            for endpoint in SENSOR_ENDPOINTS:
                try:
                    response = await client.get(f"{SIMULATOR_URL}/api/sensors/{endpoint}")
                    if response.status_code == 200:
                        data = response.json()
                        latest_data[endpoint] = data
                        await broadcast_message({
                            "type": "update",
                            "source": f"/topic/sensors.{endpoint}",
                            "data": data
                        })
                except Exception as e:
                    print(f"[POLL] Errore sensore {endpoint}: {e}")


# ============== STREAM SSE TELEMETRIA ==============

async def stream_single_telemetry(topic: str):
    """
    Consuma lo stream SSE di un singolo topic di telemetria.
    Si riconnette automaticamente in caso di errore.
    """
    url = f"{SIMULATOR_URL}/api/telemetry/stream/{topic}"
    while True:
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", url) as response:
                    print(f"[SSE] Connesso a {topic}")
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            raw = line[5:].strip()
                            try:
                                data = json.loads(raw)
                                cache_key = topic  # es. "mars/telemetry/solar_array"
                                latest_data[cache_key] = data
                                await broadcast_message({
                                    "type": "update",
                                    "source": cache_key,
                                    "data": data
                                })
                            except json.JSONDecodeError:
                                pass
        except asyncio.CancelledError:
            print(f"[SSE] Stream {topic} cancellato")
            break
        except Exception as e:
            print(f"[SSE] Errore {topic}, riprovo in 5s: {e}")
            await asyncio.sleep(5)


async def start_telemetry_streams():
    """Avvia tutti gli stream SSE di telemetria in parallelo."""
    await asyncio.gather(*[
        stream_single_telemetry(t) for t in TELEMETRY_ENDPOINTS
    ])


# ============== LIFESPAN ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    global polling_task, telemetry_task

    print("=" * 50)
    print("🚀 Avvio Frontend Server...")
    print("=" * 50)

    # 1. Dati iniziali sensori
    print("\n[INIT] Richiedo dati iniziali al simulatore...")
    initial = await get_initial_data()
    latest_data.update(initial)
    print(f"[INIT] Ottenuti {len(initial)} valori iniziali")

    # 2. Connessione broker (per sensori via ActiveMQ)
    print("\n[BROKER] Connessione ad ActiveMQ...")
    broker_client.connect(on_message_callback=on_broker_message)

    # 3. Polling REST sensori
    print("\n[POLLING] Avvio polling sensori ogni 5 secondi...")
    polling_task = asyncio.create_task(poll_sensors())

    # 4. Stream SSE telemetria
    print("\n[SSE] Avvio stream telemetria...")
    telemetry_task = asyncio.create_task(start_telemetry_streams())

    print("\n✅ Frontend Server pronto!")
    print(f"📡 Dashboard: http://{HOST}:{PORT}")

    yield

    # SHUTDOWN
    print("\n[SHUTDOWN] Chiusura...")
    if polling_task:
        polling_task.cancel()
    if telemetry_task:
        telemetry_task.cancel()
    broker_client.disconnect()
    for ws in active_websockets:
        try:
            await ws.close()
        except:
            pass
    print("[SHUTDOWN] Frontend Server chiuso")


# ============== APP ==============

app = FastAPI(
    title="Mars Base Frontend",
    description="Dashboard per monitoraggio base marziana",
    lifespan=lifespan
)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# ============== ROUTES ==============

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    sensors_data = {
        "greenhouse_temperature": latest_data.get("greenhouse_temperature", {"value": "N/A", "unit": "°C"}),
        "entrance_humidity":      latest_data.get("entrance_humidity",      {"value": "N/A", "unit": "%"}),
        "co2_hall":               latest_data.get("co2_hall",               {"value": "N/A", "unit": "ppm"}),
        "hydroponic_ph":          latest_data.get("hydroponic_ph",          {"value": "N/A", "unit": "pH"}),
        "water_tank_level":       latest_data.get("water_tank_level",       {"value": "N/A", "unit": "%"}),
        "corridor_pressure":      latest_data.get("corridor_pressure",      {"value": "N/A", "unit": "kPa"}),
        "air_quality_pm25":       latest_data.get("air_quality_pm25",       {"value": "N/A", "unit": "μg/m³"}),
        "air_quality_voc":        latest_data.get("air_quality_voc",        {"value": "N/A", "unit": "ppb"})
    }

    telemetry_data = {
        "solar_array":       latest_data.get("mars/telemetry/solar_array",       {"value": "N/A", "unit": "kW"}),
        "radiation":         latest_data.get("mars/telemetry/radiation",         {"value": "N/A", "unit": "uSv/h"}),
        "life_support":      latest_data.get("mars/telemetry/life_support",      {"value": "N/A", "unit": "%"}),
        "thermal_loop":      latest_data.get("mars/telemetry/thermal_loop",      {"value": "N/A", "unit": "°C"}),
        "power_bus":         latest_data.get("mars/telemetry/power_bus",         {"value": "N/A", "unit": "kW"}),
        "power_consumption": latest_data.get("mars/telemetry/power_consumption", {"value": "N/A", "unit": "kW"}),
        "airlock":           latest_data.get("mars/telemetry/airlock",           {"value": "N/A", "unit": "cyc/h"})
    }

    actuators_data = {
        "cooling_fan":         latest_data.get("cooling_fan",         {"state": False}),
        "entrance_humidifier": latest_data.get("entrance_humidifier", {"state": False}),
        "hall_ventilation":    latest_data.get("hall_ventilation",    {"state": False}),
        "habitat_heater":      latest_data.get("habitat_heater",      {"state": False})
    }

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "title": "Mars Base Monitor",
        "sensors": sensors_data,
        "telemetry": telemetry_data,
        "actuators": actuators_data,
        "broker_connected": broker_client.is_connected()
    })


@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "broker_connected": broker_client.is_connected(),
        "data": latest_data
    }


# ============== WEBSOCKET ==============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    print(f"[WS] Nuova connessione. Totale: {len(active_websockets)}")

    await websocket.send_json({
        "type": "initial",
        "data": latest_data
    })

    try:
        while True:
            data = await websocket.receive_text()
            if data.startswith("actuator:"):
                parts = data.split(":")
                if len(parts) == 3:
                    await handle_actuator_command(parts[1], parts[2], websocket)
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
        print(f"[WS] Disconnessione. Totale: {len(active_websockets)}")


async def handle_actuator_command(actuator: str, action: str, websocket: WebSocket):
    """Invia un comando all'Actuators API."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{ACTUATORS_API_URL}/actuators/{actuator}/{action}"
            )
            success = response.status_code == 200

            if success:
                latest_data[actuator] = {
                    "state": action == "ON",
                    "action": action
                }

            await websocket.send_json({
                "type": "actuator_response",
                "actuator": actuator,
                "action": action,
                "success": success,
                "message": response.json() if success else "Errore"
            })
    except Exception as e:
        await websocket.send_json({
            "type": "actuator_response",
            "actuator": actuator,
            "action": action,
            "success": False,
            "message": str(e)
        })


# ============== RULES API ==============

@app.get("/api/rules")
async def get_rules():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ACTUATORS_API_URL}/rules")
            if response.status_code == 200:
                return response.json()
            return {"rules": [], "error": "Errore dal server"}
    except Exception as e:
        return {"rules": [], "error": str(e)}


@app.post("/api/rules")
async def create_rule(request: Request):
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{ACTUATORS_API_URL}/create_rule",
                json=body
            )
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            elif response.status_code == 409:
                return {"success": False, "error": "Regola duplicata"}
            else:
                return {"success": False, "error": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.delete("/api/rules/{rule_id}")
async def delete_rule(rule_id: int):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(f"{ACTUATORS_API_URL}/delete_rule/{rule_id}")
            if response.status_code == 200:
                return {"success": True}
            else:
                return {"success": False, "error": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============== ACTIVATE RULE (da Actuators Server) ==============

@app.post("/activate_rule")
async def activate_rule(request: Request):
    try:
        body = await request.json()
        actuator_name = body.get("actuator_name")
        action = body.get("action")
        rule_id = body.get("id_rule")
        timestamp = body.get("timestamp")

        print(f"[RULE ACTIVATED] Regola {rule_id}: {actuator_name} -> {action}")

        latest_data[actuator_name] = {
            "state": action == "ON",
            "action": action,
            "rule_id": rule_id,
            "timestamp": timestamp
        }

        await broadcast_message({
            "type": "actuator_update",
            "actuator": actuator_name,
            "state": action == "ON",
            "action": action,
            "rule_id": rule_id,
            "timestamp": timestamp
        })

        return {"success": True}

    except Exception as e:
        print(f"[RULE ACTIVATED] Errore: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/actuators")
async def get_actuators():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{SIMULATOR_URL}/api/actuators")
            if response.status_code == 200:
                data = response.json()
                if "actuators" in data:
                    for name, state in data["actuators"].items():
                        latest_data[name] = {"state": state == "ON", "action": state}
                return data
            return {"actuators": {}}
    except Exception as e:
        print(f"[ACTUATORS] Errore: {e}")
        return {"actuators": {}}


# ============== MAIN ==============

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
