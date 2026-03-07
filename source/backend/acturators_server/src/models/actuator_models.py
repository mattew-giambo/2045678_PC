from pydantic import BaseModel
from typing import Dict

class ActuatorsListOutput(BaseModel):
   actuators: Dict[str, str]