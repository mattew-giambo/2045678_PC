import uvicorn
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from src.config.constants import HOST, PORT
from src.utility.message_broker.message_broker import connect_to_message_broker
from src.models.rule import InputRule, OutputRule
from src.utility.db.close_connection import close_connection
from src.utility.db.close_cursor import close_cursor
from src.utility.db.connect_to_database import connect_to_database
from src.utility.db.get_cursor import get_cursor
import mariadb

@asynccontextmanager
async def lifespan(app: FastAPI):
    broker_conn = connect_to_message_broker()

    yield
    
    if broker_conn:
        broker_conn.disconnect()


app = FastAPI(title="Mars Actuators Server", lifespan=lifespan)

@app.post("/create_rule", response_model=OutputRule)
def create_rule_endpoint(rule: InputRule):
    conn = connect_to_database()
    cursor = get_cursor(conn)

    query = """
        INSERT INTO automation_rules 
        (sensor_name, operator, threshold_value, unit, actuator_name, action)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, timestamp
    """
    
    try:
        cursor.execute(query, (
            rule.sensor_name, 
            rule.operator, 
            rule.threshold_value, 
            rule.unit, 
            rule.actuator_name, 
            rule.action
        ))
        (new_id, new_timestamp) = cursor.fetchone()
        conn.commit()

        return OutputRule(id=new_id, timestamp=new_timestamp)

    except mariadb.IntegrityError as e: 
        conn.rollback()
        raise HTTPException(
            status_code=409,
            detail="There is already a rule on the sensor, actuator and action. Please delete the other rule."
        )
    finally:
        if cursor:
            close_cursor(cursor)
        if conn:
            close_connection(conn)

@app.post("/delete_rule")

@app.get("/rules")


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)