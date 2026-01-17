from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from .database import engine, Base
from .views import api

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Restaurant Queue API")

# CORS (allow all for now for dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Restaurant Queue API is running"}

handler = Mangum(app)
