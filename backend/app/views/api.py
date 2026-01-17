from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from datetime import datetime
from .. import schemas, database, models
from ..controllers import crud

router = APIRouter()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Venues
@router.post("/venues/", response_model=schemas.Venue)
def create_venue(venue: schemas.VenueCreate, db: Session = Depends(get_db)):
    return crud.create_venue(db=db, venue=venue)

@router.get("/venues/", response_model=List[schemas.Venue])
def read_venues(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_venues(db, skip=skip, limit=limit)

@router.get("/venues/{venue_id}", response_model=schemas.Venue)
def read_venue(venue_id: int, db: Session = Depends(get_db)):
    db_venue = crud.get_venue(db, venue_id=venue_id)
    if db_venue is None:
        raise HTTPException(status_code=404, detail="Venue not found")
    return db_venue

# Tables
@router.post("/venues/{venue_id}/tables/", response_model=schemas.Table)
def create_table_for_venue(venue_id: int, table: schemas.TableCreate, db: Session = Depends(get_db)):
    return crud.create_table(db=db, table=table, venue_id=venue_id)

@router.get("/venues/{venue_id}/tables/", response_model=List[schemas.TableWithGuest])
def read_tables(venue_id: int, db: Session = Depends(get_db)):
    return crud.get_tables_by_venue(db, venue_id=venue_id)

@router.put("/tables/{table_id}", response_model=schemas.Table)
def update_table(table_id: int, table_update: schemas.TableUpdate, db: Session = Depends(get_db)):
    db_table = crud.update_table(db, table_id=table_id, table_update=table_update)
    if db_table is None:
        raise HTTPException(status_code=404, detail="Table not found")
    return db_table

# Guests
@router.post("/guests/", response_model=schemas.Guest)
def create_guest(guest: schemas.GuestCreate, db: Session = Depends(get_db)):
    return crud.create_guest(db=db, guest=guest)

@router.get("/guests/{guest_id}", response_model=schemas.Guest)
def read_guest(guest_id: str, db: Session = Depends(get_db)):
    db_guest = crud.get_guest(db, guest_id=guest_id)
    if db_guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")
    return db_guest

@router.put("/guests/{guest_id}/status", response_model=schemas.Guest)
def update_guest_status(guest_id: str, status_update: schemas.GuestUpdateStatus, db: Session = Depends(get_db)):
    db_guest = crud.update_guest_status(db, guest_id=guest_id, status_update=status_update)
    if db_guest is None:
        raise HTTPException(status_code=404, detail="Guest not found")
    return db_guest

@router.get("/venues/{venue_id}/guests", response_model=List[schemas.Guest])
def read_guests_for_venue(
    venue_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    status: List[models.GuestStatus] = Query(None), # Query allows repeating param like ?status=WAITING&status=READY
    created_after: datetime = None,
    db: Session = Depends(get_db)
):
    return crud.get_guests_by_venue(db, venue_id=venue_id, skip=skip, limit=limit, statuses=status, created_after=created_after)

@router.get("/tables/{table_id}/history", response_model=List[schemas.Guest])
def read_table_history(table_id: int, db: Session = Depends(get_db)):
    # Simple query to get guests who were seated at this table today
    today = datetime.utcnow().date()
    return db.query(models.Guest).filter(
        models.Guest.table_id == table_id,
        models.Guest.seated_at >= today
    ).order_by(models.Guest.seated_at.desc()).all()
