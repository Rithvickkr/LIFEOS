from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Activity(Base):
    __tablename__ = 'activities'
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    app_name = Column(String)
    window_title = Column(String)
    url = Column(String)
    file_path = Column(String)
    type = Column(String)  # e.g., 'read', 'code', 'video'

    embeddings = relationship("Embedding", back_populates="activity")

class Embedding(Base):
    __tablename__ = 'embeddings'
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey('activities.id'))
    text = Column(String)
    vector = Column(JSON)  # Store vector as JSON array for simplicity

    activity = relationship("Activity", back_populates="embeddings")