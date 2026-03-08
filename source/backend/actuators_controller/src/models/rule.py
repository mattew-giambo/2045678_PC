from pydantic import BaseModel
from typing import Dict, Literal
from datetime import datetime

class InputRule(BaseModel):
    sensor_name: str
    operator: Literal['<', '>', '<=', '>=', '=']
    threshold_value: float
    unit: str
    actuator_name: Literal['cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater']
    action: Literal['ON', 'OFF']

class OutputRule(BaseModel):
    id:int
    created_at: datetime

class Rule(InputRule):
    id: int
    created_at: datetime

class OutputListRules(BaseModel):
    rules: list[Rule]