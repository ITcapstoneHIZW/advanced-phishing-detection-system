import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Get the database URL from the environment variable Railway provides
DATABASE_URL = os.environ.get("DATABASE_URL")

# Railway gives a URL starting with "postgres://" but SQLAlchemy needs "postgresql://"
# This line fixes that automatically
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Local development fallback: if no DATABASE_URL is set (i.e. not on Railway),
# use a local SQLite file so the app can run and be tested locally.
# In production Railway always sets DATABASE_URL, so this never triggers there.
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./phishing.db"

# SQLite needs check_same_thread=False to work with FastAPI's threading;
# Postgres does not take that argument.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# A temporary connection used to talk with the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Is what we use to define database tables
Base = declarative_base()
