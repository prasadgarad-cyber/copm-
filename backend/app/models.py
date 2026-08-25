from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    category = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    image_path = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)  # pending, verified, duplicate, resolved
    parent_id = Column(Integer, ForeignKey("complaints.id"), nullable=True, index=True)
    duplicate_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    parent = relationship("Complaint", remote_side=[id], backref="duplicates")

