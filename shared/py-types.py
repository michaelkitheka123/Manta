from typing import List, Optional
from pydantic import BaseModel

class Task(BaseModel):
    id: str
    name: str
    assignee: Optional[str] = None
    status: str  # 'pending', 'active', 'complete', 'blocked'

class Member(BaseModel):
    name: str
    role: str  # 'Navigator' or 'Implementer'

class Project(BaseModel):
    name: str
    token: str
    tasks: List[Task] = []
    members: List[Member] = []
