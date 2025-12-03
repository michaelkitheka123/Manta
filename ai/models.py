from pydantic import BaseModel
from typing import List, Optional

class Task(BaseModel):
    id: str
    name: str
    assignee: Optional[str] = None
    status: str  # 'pending', 'active', 'complete', 'blocked'

class AssignRequest(BaseModel):
    taskName: str
    members: List[str]

class ReviewRequest(BaseModel):
    filePath: str
    content: str
    type: str  # 'logic' | 'style'

class Suggestion(BaseModel):
    line: int
    message: str
    fix: Optional[str]

class FileEvent(BaseModel):
    filePath: str
    content: str
