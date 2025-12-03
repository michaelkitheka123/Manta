import logging
import uuid

def log(message: str):
    logging.info(f"[AI] {message}")

def generate_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"
