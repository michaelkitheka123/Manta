from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import AssignRequest, ReviewRequest, FileEvent
from services import handle_assign_task, handle_review_code, notify_file_saved, get_suggestions, clear_suggestions, get_risk_report
from api import router as api_router
import os

app = FastAPI(
    title="Manta AI Service",
    description="AI-powered code review and task assignment for Manta collaboration",
    version="1.0.0"
)

# CORS configuration for cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension/server domains
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include API router
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    env = os.getenv("NODE_ENV", "development")
    return {
        "service": "Manta AI",
        "status": "running",
        "environment": env,
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/assign/task")
def assign_task(request: AssignRequest):
    member = handle_assign_task(request)
    return {"assignedMember": member}

@app.post("/review/code")
def review_code(request: ReviewRequest):
    suggestions = handle_review_code(request)
    return {"suggestions": [s.dict() for s in suggestions]}

@app.post("/file/saved")
def file_saved(event: FileEvent):
    notify_file_saved(event)
    return {"status": "ok"}

@app.get("/suggestions")
def suggestions():
    data = get_suggestions()
    clear_suggestions()
    return {"suggestions": [s.dict() for s in data]}

@app.get("/risk/report")
def risk_report():
    # For demo purposes, return dummy data
    project = {"tasks": []}
    return get_risk_report(project)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
