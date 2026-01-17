from sqlalchemy.orm import Session
from .. import models, schemas
import uuid
from datetime import datetime

from typing import List

# Guest Controller
def create_guest(db: Session, guest: schemas.GuestCreate):
    db_guest = models.Guest(
        name=guest.name, 
        party_size=guest.party_size, 
        venue_id=guest.venue_id,
        status=guest.status or models.GuestStatus.WAITING,
        table_id=guest.table_id
    )
    db.add(db_guest)
    
    # If immediately seated, update table status
    if guest.table_id and guest.status == models.GuestStatus.SEATED:
        db_guest.seated_at = datetime.utcnow()
        db_table = db.query(models.Table).filter(models.Table.id == guest.table_id).first()
        if db_table:
            db_table.status = models.TableStatus.OCCUPIED
            
    db.commit()
    db.refresh(db_guest)
    return db_guest

def get_guest(db: Session, guest_id: str):
    return db.query(models.Guest).filter(models.Guest.id == guest_id).first()

def get_guests_by_venue(db: Session, venue_id: int, skip: int = 0, limit: int = 100, statuses: List[models.GuestStatus] = None, created_after: datetime = None):
    query = db.query(models.Guest).filter(models.Guest.venue_id == venue_id)
    
    if statuses:
        query = query.filter(models.Guest.status.in_(statuses))
        
    if created_after:
        query = query.filter(models.Guest.created_at >= created_after)
        
    return query.offset(skip).limit(limit).all()

def update_guest_status(db: Session, guest_id: str, status_update: schemas.GuestUpdateStatus):
    db_guest = get_guest(db, guest_id)
    if db_guest:
        db_guest.status = status_update.status
        if status_update.cancellation_reason:
            db_guest.cancellation_reason = status_update.cancellation_reason
        
        if status_update.status == models.GuestStatus.ACKNOWLEDGED:
            db_guest.acknowledged_at = datetime.utcnow()
            
        # Handle Table Assignment
        if status_update.table_id:
            db_guest.table_id = status_update.table_id
            # Mark table as occupied
            db_table = db.query(models.Table).filter(models.Table.id == status_update.table_id).first()
            if db_table:
                db_table.status = models.TableStatus.OCCUPIED
                
        if status_update.status == models.GuestStatus.SEATED and not db_guest.seated_at:
             db_guest.seated_at = datetime.utcnow()
                
        # If successfully SEATED (with or without new table_id), ensure table is occupied? 
        # (Already handled above if table_id is passed. If mostly table_id passed with SEATED)
        
        db.commit()
        db.refresh(db_guest)
    return db_guest

# Table Controller
def create_table(db: Session, table: schemas.TableCreate, venue_id: int):
    db_table = models.Table(**table.dict(), venue_id=venue_id)
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

def get_tables_by_venue(db: Session, venue_id: int):
    tables = db.query(models.Table).filter(models.Table.venue_id == venue_id).all()
    # Manual join/logic for simple active guest retrieval since relationship might be 1:N
    # We want the guest currently SEATED at this table
    result = []
    for t in tables:
        active_guest = db.query(models.Guest).filter(
            models.Guest.table_id == t.id, 
            models.Guest.status == models.GuestStatus.SEATED
        ).first()
        t_data = schemas.TableWithGuest.from_orm(t)
        if active_guest:
            t_data.active_guest = active_guest
        result.append(t_data)
    return result

def update_table(db: Session, table_id: int, table_update: schemas.TableUpdate):
    db_table = db.query(models.Table).filter(models.Table.id == table_id).first()
    if db_table:
        if table_update.capacity is not None:
            db_table.capacity = table_update.capacity
        if table_update.status is not None:
            # Handle State Transitions
            old_status = db_table.status
            new_status = table_update.status
            db_table.status = new_status
            
            # OCCUPIED -> CLEARDOWN: Guest has left
            if old_status == models.TableStatus.OCCUPIED and new_status == models.TableStatus.CLEARDOWN:
                 seated_guest = db.query(models.Guest).filter(
                    models.Guest.table_id == table_id, 
                    models.Guest.status == models.GuestStatus.SEATED
                 ).first()
                 if seated_guest:
                     seated_guest.status = models.GuestStatus.COMPLETED
                     seated_guest.left_at = datetime.utcnow()

        db.commit()
        db.refresh(db_table)
    return db_table

# Venue Controller
def create_venue(db: Session, venue: schemas.VenueCreate):
    db_venue = models.Venue(name=venue.name)
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

def get_venue(db: Session, venue_id: int):
    return db.query(models.Venue).filter(models.Venue.id == venue_id).first()

def get_venues(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Venue).offset(skip).limit(limit).all()
