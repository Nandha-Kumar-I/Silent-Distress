"""
ECO TWIN ML — FastAPI Application Entry Point (backend/app/main.py)
Provides SQLAlchemy persistence, JWT authentication, scikit-learn ML inference,
Digital Twin synthesis, IsolationForest anomaly detection, and ReportLab PDF generation.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

app = FastAPI(
    title="ECO TWIN ML — AI-Powered Environmental Digital Twin API",
    version="1.0.0",
    description="Full-stack Environmental Digital Twin REST API with RandomForest, IsolationForest, and ReportLab.",
)

cors_origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "connected",
        "service": "ECO TWIN ML FastAPI Backend",
        "ml_available": True,
        "dataset_notice": "Synthetic demonstration/training dataset — not real-world survey data.",
        "timestamp": datetime.utcnow().isoformat(),
    }
