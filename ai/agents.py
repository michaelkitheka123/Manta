from models import Task, AssignRequest, Suggestion
import random
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

def auto_assign_task(request: AssignRequest) -> str:
    """
    Assigns a task to a member using Gemini AI or random fallback.
    """
    if not request.members:
        return "unassigned"

    if GEMINI_API_KEY:
        try:
            prompt = f"""
            You are a project manager. Assign the task '{request.taskName}' to one of these members: {', '.join(request.members)}.
            Consider their likely skills based on the task name.
            Return ONLY the member name.
            """
            response = model.generate_content(prompt)
            assigned = response.text.strip()
            if assigned in request.members:
                return assigned
        except Exception as e:
            print(f"Gemini Error: {e}")

    # Fallback
    return random.choice(request.members)

def review_code(file_path: str, content: str, review_type: str) -> list[Suggestion]:
    """
    Reviews code using Gemini AI or simple heuristic fallback.
    """
    suggestions = []
    
    if GEMINI_API_KEY:
        try:
            prompt = f"""
            Review this {review_type} code in '{file_path}'.
            Identify up to 3 critical issues.
            Return ONLY a raw JSON array of objects with keys: "line" (number), "message" (string), "fix" (string or null).
            Do not use markdown formatting.
            
            Code:
            {content}
            """
            response = model.generate_content(prompt)
            import json
            # Clean response if it contains markdown code blocks
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("\n", 1)[0]
            
            data = json.loads(text)
            for item in data:
                suggestions.append(Suggestion(
                    line=item.get("line", 1),
                    message=item.get("message", "Issue found"),
                    fix=item.get("fix")
                ))
            return suggestions
        except Exception as e:
            print(f"Gemini Review Error: {e}")

    # Fallback Mock Logic
    lines = content.split("\n")
    for idx, line in enumerate(lines, start=1):
        if review_type == "logic" and "eval" in line:
            suggestions.append(Suggestion(line=idx, message="Avoid eval() for security reasons", fix=None))
        elif review_type == "style" and len(line) > 80:
            suggestions.append(Suggestion(line=idx, message="Line exceeds 80 characters", fix=None))
            
    return suggestions

def risk_analysis(project: dict) -> dict:
    """
    Analyzes project risk using Gemini or dummy logic.
    """
    if GEMINI_API_KEY:
        try:
            prompt = f"Analyze the risk of this project state: {project}. Return a JSON object with 'risk' (0-100) and 'reason'."
            response = model.generate_content(prompt)
            # Simplified for now
            return {"risk": 50, "reason": "AI analysis pending implementation"}
        except:
            pass

    blocked = sum(1 for t in project.get("tasks", []) if t.get("status") == "blocked")
    return {"risk": blocked * 10}
