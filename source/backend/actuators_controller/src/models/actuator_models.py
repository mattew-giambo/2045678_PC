from pydantic import BaseModel
from typing import Dict

class ActuatorsListOutput(BaseModel):
   actuators: Dict[str, str]

class ActuatorsInput(BaseModel):
   state: str

class ActuatorsUpdate(BaseModel):
   id_rule: int
   actuator_name: str
   action: str
   timestamp: str