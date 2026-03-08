from utility.db.connect_to_database import connect_to_database
from utility.db.get_cursor import get_cursor
from utility.db.close_connection import close_connection
from utility.db.close_cursor import close_cursor
from utility.db.close_connection import close_connection
from config.constants import SIMULATOR_URL, ACTUATORS_BASE_URL, FRONTEND_BASE_URL
from urllib.parse import urljoin
from models.actuator_models import ActuatorsInput, ActuatorsUpdate
import json
import operator
import requests


logic_operators = {
    '>': operator.gt,
    '<': operator.lt,
    '>=': operator.ge,
    '<=': operator.le,
    '=': operator.eq
}

def check_and_trigger_actuators(event: str):
    try:
        event_dict = json.loads(event)
        device_id = event_dict["device_id"]
        value = float(event_dict["metrics"][0]["value"]) 
        unit_e = event_dict["metrics"][0].get("unit", None)

        conn = connect_to_database()
        cursor = get_cursor(conn)

        query = """
            SELECT id, operator, threshold_value, unit, actuator_name, action
            FROM automation_rules
            WHERE sensor_name = %s
        """
        cursor.execute(query, (device_id,))
        rules = cursor.fetchall()

        for rule in rules:
            rule_id, op_str, threshold_str, unit, actuator_name, action = rule
            
            threshold = float(threshold_str)
            op_func = logic_operators.get(op_str)

            if op_func(value, threshold) and (unit_e != None) and (unit_e == unit):
                # Communicate with the simulator in order to activate the actuator
                actuator_path = f"{ACTUATORS_BASE_URL}/{actuator_name}"
                url = urljoin(SIMULATOR_URL, actuator_path)
                
                response = requests.post(url, json=ActuatorsInput(state= action).model_dump())
                response.raise_for_status()

                response_data = response.json()
                timestamp = response_data.get("updated_at")

                # Communicate with the frontend
                url = urljoin(FRONTEND_BASE_URL, "/activate_actuator")
                
                response = requests.post(url, json=ActuatorsUpdate(
                    id_rule= rule_id,
                    actuator_name= actuator_name,
                    action= action,
                    timestamp= timestamp
                ).model_dump())
                response.raise_for_status()
    except Exception as e:
        print(f"Error during message elaboration: {e}")
    finally:
        if cursor:
            close_cursor(cursor)
        if conn:
            close_connection(conn)

        


    
