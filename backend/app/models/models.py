"""
ECO TWIN ML — SQLAlchemy ORM Models (PostgreSQL & SQLite Compatible)
Tables: users, profiles, footprint_records, goals, scenarios, achievements, recommendations, reports
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from app.database.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    age = Column(Integer, default=26)
    city = Column(String, default="")
    household_size = Column(Integer, default=2)
    units = Column(String, default="metric")
    theme = Column(String, default="light")
    notifications_enabled = Column(Boolean, default=True)
    eco_points = Column(Integer, default=0)
    level = Column(Integer, default=1)


class FootprintRecord(Base):
    __tablename__ = "footprint_records"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    month_label = Column(String, nullable=False)
    inputs = Column(JSON, nullable=False)
    predicted_footprint_kg = Column(Float, nullable=False)
    eco_score = Column(Integer, nullable=False)
    risk_category = Column(String, nullable=False)
    top_contributor = Column(String, nullable=False)
    emission_breakdown = Column(JSON, nullable=False)
    feature_importances = Column(JSON, nullable=False)


class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    baseline_footprint_kg = Column(Float, nullable=False)
    target_footprint_kg = Column(Float, nullable=False)
    target_reduction_pct = Column(Float, nullable=False)
    start_date = Column(String, nullable=False)
    target_date = Column(String, nullable=False)
    status = Column(String, default="On Track")


class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    parameters = Column(JSON, nullable=False)
    predicted_footprint_kg = Column(Float, nullable=False)
    reduction_vs_current_kg = Column(Float, nullable=False)
    reduction_vs_current_pct = Column(Float, nullable=False)
    eco_score = Column(Integer, nullable=False)
    emission_breakdown = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    code = Column(String, nullable=False)
    unlocked = Column(Boolean, default=False)
    unlocked_at = Column(DateTime, nullable=True)


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    estimated_reduction_kg = Column(Float, nullable=False)
    priority = Column(String, nullable=False)


class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    report_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    summary = Column(String, nullable=False)
