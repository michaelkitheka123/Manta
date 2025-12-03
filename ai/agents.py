from models import Task, AssignRequest, Suggestion
import random

def auto_assign_task(request: AssignRequest) -> str:
    """
    Simple AI agent: chooses a random member for the task.
    In production, you can integrate ML or skill-based assignment.
    """
    if not request.members:
        return "unassigned"
    return random.choice(request.members)

def review_code(file_path: str, content: str, review_type: str) -> list[Suggestion]:
    """
    Dummy code review agent.
    For logic review, flag lines containing 'eval'.
    For style review, flag lines longer than 80 characters.
    """
    suggestions = []
    lines = content.split("\n")
    for idx, line in enumerate(lines, start=1):
        if review_type == "logic" and "eval" in line:
            suggestions.append(Suggestion(line=idx, message="Avoid eval() for security reasons", fix=None))
        elif review_type == "style" and len(line) > 80:
            suggestions.append(Suggestion(line=idx, message="Line exceeds 80 characters", fix=None))
    return suggestions

def risk_analysis(project: dict) -> dict:
    """
    Dummy risk: based on tasks with status 'blocked'
    """
    blocked = sum(1 for t in project.get("tasks", []) if t.get("status") == "blocked")
    return {"risk": blocked * 10}
