from database import SessionLocal
from models import Activity

session = SessionLocal()
try:
    # Test query (no data yet, just connection)
    session.query(Activity).first()
    print("DB connection good!")
except Exception as e:
    print(f"Error: {e}")
finally:
    session.close()