from pydantic import BaseModel
from typing import Dict, Literal

class InputRule(BaseModel):
    sensor_name: str
    operator: Literal['<', '>', '<=', '>=', '=']
    threshold_value: float
    unit: str
    actuator_name: Literal['cooling_fan', 'entrance_humidifier', 'hall_ventilation', 'habitat_heater']
    action: Literal['ON', 'OFF']

class OutputRule(BaseModel):
    id:int
    timestamp: str

class Rule(InputRule):
    id: int
    timestamp: str

class OutputListRules(BaseModel):
    rules: list[Rule]