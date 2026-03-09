from fastapi import FastAPI, Request, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from utility.message_broker import connect_to_message_broker
import uvicorn
from config.constants import HOST, PORT, ACTUATORS_CONTROLLER_HOST
from utility.message_broker import data_queue
import os
import asyncio
from models.actuators import ActuatorsUpdate, ActuatorsInput
import requests
from urllib.parse import urljoin
from models.rule import OutputRule, InputRule, OutputListRules
 
BASE_DIR = os.path.dirname(__file__)

templates = Jinja2Templates(directory= os.path.join(BASE_DIR, "templates"))

actuators_queue_ws = []
actuators_queue = []
@asynccontextmanager
async def lifespan(app: FastAPI):
    broker_conn = connect_to_message_broker()

    yield
    
    if broker_conn:
        broker_conn.disconnect()

app = FastAPI(title="Frontend server", lifespan=lifespan)

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/dashboard/sensors_telemetry", response_class=HTMLResponse)
async def get_sensors(request: Request):
    return templates.TemplateResponse("sensors.html", {"request": request})

@app.get("/dashboard/rules", response_class=HTMLResponse)
async def get_rules(request: Request):
    return templates.TemplateResponse("rules.html", {"request": request})

@app.websocket("/ws/data_stream")
async def data_stream_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            while data_queue:
                data = data_queue.pop(0)
                await websocket.send_json(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print(f"Client Disconnected")

@app.websocket("/ws/update_actuators")
async def update_actuators_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            while actuators_queue_ws:
                data = actuators_queue_ws.pop(0)
                await websocket.send_json(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print(f"Client Disconnected")

@app.post("/activate_actuator", response_model_by_alias=ActuatorsUpdate)
def activate_actuator_endpoint(payload: ActuatorsUpdate):
    actuators_queue.append(payload.model_dump())
    actuators_queue_ws.append(payload.model_dump())
    return {"status": "ok"}

@app.get("/actions_queue")
def get_actions_queue_endpoint():
    return {"actions_queue": actuators_queue}

@app.get("/rules", response_model=OutputListRules)
def get_rules_endpoint():
    try:
        url = urljoin(ACTUATORS_CONTROLLER_HOST, "/rules")
        response = requests.get(url)
        response.raise_for_status()

        response_data = response.json()
        return OutputListRules.model_validate(response_data)
    except Exception as e:
        raise HTTPException(
            status_code= 500,
            detail="Internal Server Error"
            )

@app.post("/create_rule")
def create_rule_endpoint(rule: InputRule):
    try:
        url = urljoin(ACTUATORS_CONTROLLER_HOST, f"/create_rule")
        response = requests.post(url, json=rule.model_dump())
        response.raise_for_status()

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(
            status_code= 500,
            detail="Internal Server Error"
            )

@app.post("/delete_rule/{id}")
def delete_rule_endpoint(id: int):
    try:
        url = urljoin(ACTUATORS_CONTROLLER_HOST, f"/delete_rule/{id}")
        response = requests.post(url)
        response.raise_for_status()

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(
            status_code= 500,
            detail=str(e)
            )

@app.post("/toggle_actuator/{actuator_name}")
def toggle_actuator_endpoint(actuator_name:str, payload: ActuatorsInput):
    action= payload.state
    actuator_path = f"/toggle_actuator/{actuator_name}"
    url = urljoin(ACTUATORS_CONTROLLER_HOST, actuator_path)
    response = requests.post(url, json=ActuatorsInput(state= action).model_dump())
    response.raise_for_status()

    response_data = response.json()

    actuators_queue.append(response_data)
    return ActuatorsUpdate.model_validate(response_data)

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
