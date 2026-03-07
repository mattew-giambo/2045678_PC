import uvicorn
from fastapi import FastAPI
from src.config.constants import HOST, PORT

app = FastAPI(title="Mars Actuators Server")

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)