import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Get the database URL from the environment variable Railway provides
DATABASE_URL = os.environ.get("DATABASE_URL")

# Railway gives a URL starting with "postgres://" but SQLAlchemy needs "postgresql://"
# This line fixes that automatically
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# The engine is the connection between Python and the database
engine = create_engine(DATABASE_URL)

# A temporary connection used to talk with the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Is what we use to define database tables
Base = declarative_base()
