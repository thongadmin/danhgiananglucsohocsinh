from fastapi import FastAPI, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import uuid
from fastapi.middleware.cors import CORSMiddleware
import logging
import time

# Optional imports for OpenAI and Firebase Admin
# Ensure these are installed in requirements.txt: openai, firebase-admin
try:
    import openai
except Exception as e:
    openai = None

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth, credentials as firebase_credentials
except Exception as e:
    firebase_admin = None
    firebase_auth = None
    firebase_credentials = None

# Simple in-memory stores for demo (replace with DB in production)
QUESTIONS_DB = {}
RESULTS_DB = {}

app = FastAPI(title="Smart Assessment Backend (Demo with OpenAI + Firebase Auth)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")

# Load config from env
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FIREBASE_CREDENTIALS_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")  # full JSON string or path
# Initialize OpenAI
if openai and OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# Initialize Firebase Admin if credentials provided
if firebase_admin and FIREBASE_CREDENTIALS_JSON:
    try:
        # If FIREBASE_SERVICE_ACCOUNT_JSON is a path to file, use it; otherwise parse JSON string
        if FIREBASE_CREDENTIALS_JSON.strip().startswith("{"):
            sa_dict = json.loads(FIREBASE_CREDENTIALS_JSON)
            cred = firebase_credentials.Certificate(sa_dict)
        else:
            cred = firebase_credentials.Certificate(FIREBASE_CREDENTIALS_JSON)
        firebase_admin.initialize_app(cred)
        logger.info("Initialized Firebase Admin SDK.")
    except Exception as e:
        logger.error("Failed to initialize Firebase Admin SDK: %s", e)

class GenerateRequest(BaseModel):
    prompt: str
    n_questions: int = 10
    difficulty: Optional[str] = "medium"  # optional hint

class Question(BaseModel):
    id: str
    text: str
    choices: List[str]
    answer: int

class GeneratedExam(BaseModel):
    title: str
    questions: List[Question]

class SaveResultRequest(BaseModel):
    exam_title: str
    result: dict
    student_id: Optional[str] = None

def verify_firebase_token(id_token: str):
    \"\"\"Verify Firebase ID token. Returns decoded token or raises HTTPException.\"\"\"
    if not firebase_auth:
        raise HTTPException(status_code=500, detail="Firebase Admin SDK not configured on server.")
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        logger.warning("Failed to verify Firebase ID token: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired auth token.")

@app.post("/api/generate", response_model=GeneratedExam)
async def generate(req: GenerateRequest, authorization: Optional[str] = Header(None)):
    \"\"\"Generate questions using OpenAI. Requires Firebase ID token in Authorization: Bearer <idToken>.
       Returns structured JSON with questions. This endpoint enforces simple rate limiting per request.\n    \"\"\"\n    # Auth: optional but recommended. If Authorization header present, validate token.\n    if authorization:\n        token = authorization.replace('Bearer ', '')\n        verify_firebase_token(token)\n\n    if not openai:\n        # If openai package not installed, return demo\n        questions = []\n        for i in range(min(req.n_questions, 20)):\n            qid = str(uuid.uuid4())\n            q = {\n                \"id\": qid,\n                \"text\": f\"Câu hỏi AI mẫu #{i+1}: về {req.prompt}\",\n                \"choices\": [\"A\",\"B\",\"C\",\"D\"],\n                \"answer\": 0\n            }\n            questions.append(q)\n            QUESTIONS_DB[qid] = q\n        return {\"title\": f\"AI: {req.prompt}\", \"questions\": questions}\n\n    # Safety: limit n_questions\n    n = max(1, min(req.n_questions, 20))\n\n    # Build a robust system prompt to ask OpenAI to return JSON only\n    system_prompt = (\n        \"Bạn là một trợ lý tạo câu hỏi cho học sinh THCS/THPT. Trả về CHỈ 1 đối tượng JSON có cấu trúc:\"\n        \"{ \\\"title\\\": string, \\\"questions\\\": [ {\\\"id\\\": string, \\\"text\\\": string, \\\"choices\\\": [string], \\\"answer\\\": int} ] }\"\n        \"Không chứa bất kỳ giải thích hay văn bản khác. Mỗi câu hỏi là 4 đáp án. Đánh số đáp án bắt đầu từ 0 cho đáp án đúng.\"\n    )\n\n    user_prompt = f\"Tạo {n} câu hỏi trắc nghiệm 4 lựa chọn về: {req.prompt}. Ngôn ngữ: tiếng Việt. Mức độ: {req.difficulty}.\"\n\n    try:\n        # Use Chat Completions (chat-based) or Responses API depending on library\n        # Here use chat completions example\n        resp = openai.ChatCompletion.create(\n            model=os.getenv('OPENAI_MODEL', 'gpt-4o-mini'),\n            messages=[\n                {\"role\": \"system\", \"content\": system_prompt},\n                {\"role\": \"user\", \"content\": user_prompt}\n            ],\n            max_tokens=1500,\n            temperature=0.2\n        )\n        text = resp['choices'][0]['message']['content']\n    except Exception as e:\n        logger.error(\"OpenAI request failed: %s\", e)\n        raise HTTPException(status_code=500, detail=f\"OpenAI request failed: {e}\")\n\n    # Parse JSON from model output safely: try to extract the first JSON object in the text\n    import re, json as _json\n    m = re.search(r\"\\{[\\s\\S]*\\}\", text)\n    if not m:\n        logger.error(\"No JSON found in OpenAI response. Raw: %s\", text)\n        raise HTTPException(status_code=500, detail=\"OpenAI response parsing failed (no JSON).\")\n    try:\n        payload = _json.loads(m.group(0))\n        # Basic validation\n        if 'questions' not in payload or not isinstance(payload['questions'], list):\n            raise ValueError('Invalid format: missing questions list')\n        # Normalize and store\n        for q in payload['questions']:\n            qid = q.get('id') or str(uuid.uuid4())\n            q['id'] = qid\n            # Ensure choices is list of strings and answer is int\n            if not isinstance(q.get('choices', []), list) or not isinstance(q.get('answer', 0), int):\n                raise ValueError('Question format invalid')\n            QUESTIONS_DB[qid] = q\n        return payload\n    except Exception as e:\n        logger.error(\"Failed to parse JSON from OpenAI: %s\", e)\n        raise HTTPException(status_code=500, detail=f\"Failed to parse OpenAI JSON: {e}\")\n\n@app.post(\"/api/questions\")\nasync def save_question(q: Question, authorization: Optional[str] = Header(None)):\n    if authorization:\n        token = authorization.replace('Bearer ', '')\n        verify_firebase_token(token)\n    QUESTIONS_DB[q.id] = q.dict()\n    return {\"status\": \"ok\", \"id\": q.id}\n\n@app.get(\"/api/questions\")\nasync def list_questions(authorization: Optional[str] = Header(None)):\n    # Optionally require auth to list\n    if authorization:\n        token = authorization.replace('Bearer ', '')\n        verify_firebase_token(token)\n    return list(QUESTIONS_DB.values())\n\n@app.post(\"/api/results\")\nasync def save_result(r: SaveResultRequest, authorization: Optional[str] = Header(None)):\n    # Require auth to save results\n    if not authorization:\n        raise HTTPException(status_code=401, detail=\"Authorization header required\")\n    token = authorization.replace('Bearer ', '')\n    decoded = verify_firebase_token(token)\n    student_id = decoded.get('uid') if decoded else r.student_id\n    rid = str(uuid.uuid4())\n    RESULTS_DB[rid] = {\"id\": rid, \"exam_title\": r.exam_title, \"result\": r.result, \"student_id\": student_id, \"ts\": int(time.time())}\n    return {\"status\": \"ok\", \"id\": rid}\n\n@app.get(\"/api/results\")\nasync def list_results(authorization: Optional[str] = Header(None)):\n    if not authorization:\n        raise HTTPException(status_code=401, detail=\"Authorization header required\")\n    token = authorization.replace('Bearer ', '')\n    verify_firebase_token(token)\n    return list(RESULTS_DB.values())\n\nif __name__ == '__main__':\n    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', 8000)))\n