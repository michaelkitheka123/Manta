from fastapi import APIRouter
from models import AssignRequest, ReviewRequest, FileEvent
from services import handle_assign_task, handle_review_code, notify_file_saved, get_suggestions, clear_suggestions, get_risk_report

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/assign/task")
def assign_task(request: AssignRequest):
    member = handle_assign_task(request)
    return {"assignedMember": member}

@router.post("/review/code")
def review_code(request: ReviewRequest):
    suggestions = handle_review_code(request)
    return {"suggestions": [s.dict() for s in suggestions]}

@router.post("/file/saved")
def file_saved(event: FileEvent):
    notify_file_saved(event)
    return {"status": "ok"}

@router.get("/suggestions")
def suggestions():
    data = get_suggestions()
    clear_suggestions()
    return {"suggestions": [s.dict() for s in data]}

@router.get("/risk/report")
def risk_report():
    project = {"tasks": []}
    return get_risk_report(project)
