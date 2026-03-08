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
from models.actuators import ActuatorsUpdate
import requests
from urllib.parse import urljoin
from models.rule import OutputRule, InputRule, OutputListRules
 
BASE_DIR = os.path.dirname(__file__)

templates = Jinja2Templates(directory= os.path.join(BASE_DIR, "templates"))

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
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard_1.html", {"request": request})

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
            while actuators_queue:
                data = actuators_queue.pop(0)
                await websocket.send_json(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print(f"Client Disconnected")

@app.post("/activate_actuator", response_model_by_alias=ActuatorsUpdate)
def activate_actuator_endpoint(payload: ActuatorsUpdate):
    actuators_queue.append(payload.model_dump())
    return {"status": "ok"}

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
        response = requests.post(url, json=rule.model_dump)
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
            detail="Internal Server Error"
            )

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
