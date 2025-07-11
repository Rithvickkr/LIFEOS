from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from database import SessionLocal
from models import Activity
from fastapi import Body
from tracking import start_file_tracking, start_window_tracking
from memory import collection, embedder
load_dotenv()

app = FastAPI()
start_window_tracking()
start_file_tracking(os.getenv('MONITORED_FOLDER'))

# Dependency for DB sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "LIFEOS Backend Running"}

@app.post("/track/activity")
def track_activity(data: dict = Body(...), db: Session = Depends(get_db)):
    new_activity = Activity(
        app_name=data.get('app_name'),
        window_title=data.get('window_title'),
        url=data.get('url'),
        file_path=data.get('file_path'),
        type=data.get('type')
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return {"status": "logged", "id": new_activity.id}

@app.get("/search")
def search(query: str, top_k: int = 5):
    query_emb = embedder.encode(query).tolist()
    results = collection.query(query_embeddings=[query_emb], n_results=top_k)
    return {"results": results['documents'][0], "metadatas": results['metadatas'][0]}