from fastapi import FastAPI, Request, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from typing import Dict, Any, List
import uvicorn
import json
import asyncio
from fastapi.responses import StreamingResponse
from config.constants import HOST, PORT, SIMULATOR_URL, ACTUATORS_API_URL
from utility.message_broker import latest_data

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

active_websockets: List[WebSocket] = []

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

async def data_event_generator():
    """Generate events for Server-Sent Events (SSE) streaming."""
    while True:
        actual_data = list(latest_data.values())
       
        payload_json = json.dumps(actual_data)
       
        yield f"data: {payload_json}\n\n"
       
        await asyncio.sleep(1)

@app.get("/api/sensors/stream")
async def stream_data():
    """Endpoint which uses the JavaScript EventSource API to stream real-time sensor and telemetry data to the frontend."""
    return StreamingResponse(data_event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
