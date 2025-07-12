import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, func, delete
from sqlalchemy.orm import sessionmaker
from models import Activity, Embedding, Base # Import your models (adjust path if needed)

# DB setup (update with your DB URL, e.g., from .env)
DB_URL = os.getenv('DATABASE_URL', 'sqlite:///default.db')  # Example SQLite
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(engine)

def clear_old_records():
    with Session() as session:
        today = datetime.now(timezone.utc).date()
        
        # Delete old Activities
        delete_activities = delete(Activity).where(func.date(Activity.timestamp) < today)
        session.execute(delete_activities)
        
        # Delete old Embeddings (assuming linked to activities via activity_id)
        # First get activity IDs that will be deleted
        old_activity_ids = session.query(Activity.id).filter(func.date(Activity.timestamp) < today).subquery()
        delete_embeddings = delete(Embedding).where(Embedding.activity_id.in_(old_activity_ids))
        session.execute(delete_embeddings)
        
        session.commit()
        print(f"Cleared old records before {today}. DB is now fresh!")

if __name__ == "__main__":
    clear_old_records()