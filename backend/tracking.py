import time
import threading
import win32gui
import win32process
import psutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from sqlalchemy.orm import Session
from models import Activity
from database import SessionLocal
import os
from memory import process_activity_content  # Import from Step 6 for embedding

def log_window_activity(db: Session):
    try:
        hwnd = win32gui.GetForegroundWindow()
        if hwnd == 0:
            return  # No foreground window

        pid = win32process.GetWindowThreadProcessId(hwnd)[1]
        process = psutil.Process(pid)
        app_name = process.name()
        window_title = win32gui.GetWindowText(hwnd)

        new_activity = Activity(
            app_name=app_name,
            window_title=window_title,
            type='app'
        )
        db.add(new_activity)
        db.commit()
        db.refresh(new_activity)  # Refresh to get ID

        print(f"🧠 LOGGED: {app_name} — {window_title}")

        # Embed if relevant (e.g., for content-rich windows; expand as needed)
        process_activity_content(new_activity)

    except Exception as e:
        print(f"❌ Failed to log activity: {e}")

def start_window_tracking():
    def run():
        while True:
            db = SessionLocal()
            try:
                log_window_activity(db)
            finally:
                db.close()
            time.sleep(5)  # Poll every 5s, low CPU

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
            self.db_session.refresh(new_activity)  # Refresh for ID

            print(f"🧠 LOGGED FILE: {event.src_path}")

            # Process for embedding (PDFs, media, etc.)
            process_activity_content(new_activity)

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