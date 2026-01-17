from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .models import GuestStatus, TableStatus
import uuid

# Venue Schemas
class VenueBase(BaseModel):
    name: str

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    id: int
    
    class Config:
        from_attributes = True

# Table Schemas
class TableBase(BaseModel):
    table_number: str
    capacity: int
    table_number: str
    capacity: int
    status: TableStatus = TableStatus.AVAILABLE

class TableWithGuest(TableBase):
    id: int
    venue_id: int
    active_guest: Optional['Guest'] = None

    class Config:
        from_attributes = True

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    capacity: Optional[int] = None
    status: Optional[TableStatus] = None

class Table(TableBase):
    id: int
    venue_id: int
    
    class Config:
        from_attributes = True

# Guest Schemas
class GuestBase(BaseModel):
    name: str
    party_size: int

class GuestCreate(GuestBase):
    venue_id: int
    table_id: Optional[int] = None
    status: Optional[GuestStatus] = GuestStatus.WAITING

class GuestUpdateStatus(BaseModel):
    status: GuestStatus
    table_id: Optional[int] = None
    cancellation_reason: Optional[str] = None

class Guest(GuestBase):
    id: str
    venue_id: int
    table_id: Optional[int] = None
    status: GuestStatus
    cancellation_reason: Optional[str] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    seated_at: Optional[datetime] = None
    left_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Resolve forward reference
TableWithGuest.model_rebuild()
