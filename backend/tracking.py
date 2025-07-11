import time
import threading
import pygetwindow as gw
from sqlalchemy.orm import Session
from models import Activity
from database import SessionLocal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os

def log_window_activity(db: Session):
    active = gw.getActiveWindow()
    if active:
        app_name = active._getProcessName() if hasattr(active, '_getProcessName') else 'Unknown'
        window_title = active.title
        new_activity = Activity(app_name=app_name, window_title=window_title, type='app')
        db.add(new_activity)
        db.commit()

def start_window_tracking():
    def run():
        while True:
            db = SessionLocal()
            try:
                log_window_activity(db)
            finally:
                db.close()
            time.sleep(5)  # Poll every 5s to keep CPU low

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    

class FileHandler(FileSystemEventHandler):
    def __init__(self, db_session):
        self.db_session = db_session

    def on_modified(self, event):
        if not event.is_directory:
            new_activity = Activity(file_path=event.src_path, type='file_edit')
            self.db_session.add(new_activity)
            self.db_session.commit()

def start_file_tracking(monitored_folder: str):
    # Expand ~ and env vars
    monitored_folder = os.path.expandvars(os.path.expanduser(monitored_folder))
    print(f"📂 Monitoring folder: {monitored_folder}")

    # Check if path exists, create if not
    if not os.path.exists(monitored_folder):
        print(f"⚠️ Folder not found: {monitored_folder}")
        print("📁 Creating monitored folder...")
        os.makedirs(monitored_folder, exist_ok=True)

    # Confirm path being watched
    print(f"👀 LIFEOS is now watching: {monitored_folder}")

    # Start tracking
    db = SessionLocal()
    event_handler = FileHandler(db)
    observer = Observer()
    observer.schedule(event_handler, monitored_folder, recursive=True)
    observer.start()