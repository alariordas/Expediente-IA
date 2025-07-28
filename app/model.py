# app/model.py
from pydantic import BaseModel, Field
import datetime
from typing import List, Optional, Dict

class Game(BaseModel):
    data: dict

class Suspect(BaseModel):
    name: str
    personality: str
    descripcion: str
    coartada: str
    detalles_adicionales: str
    culpable: bool 

class AskSuspectRequest(BaseModel):
    question: str
    start_time: str                   # ISO 8601
    current_time: str                 # ISO 8601
    history: Optional[List[str]] = [] # Conversación previa
    suspect_index: int = 0
    suspects: List[Suspect]

class MurderGuess(BaseModel):
    arma: str
    lugar: str
    hora: str
    sospechoso: str

class NarratorRequest(BaseModel):
    question: str
    start_time: str                   # ISO 8601
    current_time: str                 # ISO 8601
    history: Optional[List[str]] = []
    attempts_remaining: int
    detectives_count: int = 1
    scenario: str
    suspects: List[Suspect]
    murder_details: Dict[str, str]    # dinámico, e.g. {"arma":"…","lugar":"…",…}
    humor_character: Optional[str] = None
    intro_narrator: Optional[str] = None

class NarratorResponse(BaseModel):
    answer: str
    type: str
    feedback: Optional[Dict[str, bool]] = None
    warning: Optional[str] = None

class PFPRequest(BaseModel):
    description: str

class PFPResponse(BaseModel):
    image: str  # data:image/png;base64,...
