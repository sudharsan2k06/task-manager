from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.db.database import Base, engine
from app.api.routes import auth, tasks
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["auth"])
app.include_router(tasks.router, tags=["tasks"])

# ✅ FIXED PATH
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(BASE_DIR, "frontend")

print("Serving frontend from:", frontend_dir)

app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(frontend_dir, "index.html"))