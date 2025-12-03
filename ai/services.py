from agents import auto_assign_task, review_code, risk_analysis
from models import AssignRequest, ReviewRequest, FileEvent

# In-memory storage for suggestions and metadata
AI_STATE = {
    "suggestions": []
}

def handle_assign_task(request: AssignRequest) -> str:
    member = auto_assign_task(request)
    return member

def handle_review_code(request: ReviewRequest):
    suggestions = review_code(request.filePath, request.content, request.type)
    AI_STATE["suggestions"].extend(suggestions)
    return suggestions

def notify_file_saved(event: FileEvent):
    # Could trigger auto-suggestions or analysis
    pass

def get_suggestions():
    return AI_STATE["suggestions"]

def clear_suggestions():
    AI_STATE["suggestions"] = []

def get_risk_report(project: dict):
    return risk_analysis(project)
