import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.config.constants import HOST, PORT
from src.message_broker.message_broker import connect_to_message_broker

@asynccontextmanager
async def lifespan(app: FastAPI):
    broker_conn = connect_to_message_broker()

    yield
    
    if broker_conn:
        broker_conn.disconnect()


app = FastAPI(title="Mars Actuators Server", lifespan=lifespan)


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)