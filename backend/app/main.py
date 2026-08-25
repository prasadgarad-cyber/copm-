from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import engine, Base
from .routes import health, complaints, similarity

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CivicSync Backend")

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(complaints.router, prefix="/api", tags=["complaints"])
app.include_router(similarity.router, prefix="/api", tags=["similarity"])

@app.get("/")
def read_root():
    return {"message": "Welcome to CivicSync Backend"}
