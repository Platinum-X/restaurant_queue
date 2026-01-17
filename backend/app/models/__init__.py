import uuid
import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class GuestStatus(str, enum.Enum):
    WAITING = "WAITING"
    READY = "READY"
    SEATED = "SEATED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"

class TableStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    CLEARDOWN = "CLEARDOWN"
    CLOSED = "CLOSED"

class Venue(Base):
    __tablename__ = "venues"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    
    tables = relationship("Table", back_populates="venue")
    guests = relationship("Guest", back_populates="venue")

class Table(Base):
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"))
    table_number = Column(String(50))
    capacity = Column(Integer)
    status = Column(Enum(TableStatus), default=TableStatus.AVAILABLE)
    
    venue = relationship("Venue", back_populates="tables")

class Guest(Base):
    __tablename__ = "guests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    venue_id = Column(Integer, ForeignKey("venues.id"))
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    name = Column(String(255))
    party_size = Column(Integer)
    status = Column(Enum(GuestStatus), default=GuestStatus.WAITING)
    cancellation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    seated_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)
    
    venue = relationship("Venue", back_populates="guests")
    table = relationship("Table", backref="guests")
