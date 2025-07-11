from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from database import SessionLocal
from models import Activity
from fastapi import Body
from tracking import start_file_tracking, start_window_tracking
from memory import collection, embedder
from datetime import datetime, timedelta
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware
load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Your frontend URL; add "*" for all (dev only)
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, etc.
    allow_headers=["*"],  # Allows all headers
)
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

@app.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    activities = db.query(Activity).filter(func.date(Activity.timestamp) == today).all()

    # Aggregate by hour and type
    timeline_data = {}
    switches = 0
    last_app = None
    for act in activities:
        hour = act.timestamp.hour
        if hour not in timeline_data:
            timeline_data[hour] = {'apps': [], 'focus': 100}  # Start high
        timeline_data[hour]['apps'].append(act.app_name or act.type)

        # Simple focus calc: Count switches
        if act.app_name and act.app_name != last_app:
            switches += 1
            last_app = act.app_name

    # Overall focus score
    total_activities = len(activities)
    focus_score = max(100 - (switches * 10), 0) if total_activities else 0

    # Basic prediction with darts
    prediction = 0
    if activities:
        from darts import TimeSeries
        from darts.models import ExponentialSmoothing
        times = [act.timestamp.hour for act in activities]
        series = TimeSeries.from_values([1] * len(times))  # Dummy series
        model = ExponentialSmoothing()
        model.fit(series)
        pred_ts = model.predict(1)
        prediction = float(pred_ts.values()[0][0])  # Convert to Python float for serialization

    return {
        "timeline": timeline_data,
        "focus_score": focus_score,
        "prediction": prediction
    }