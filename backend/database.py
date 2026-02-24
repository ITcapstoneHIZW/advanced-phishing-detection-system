from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Create a SQLite database file called phishing.db in the current folder
DATABASE_URL = "sqlite:///./phishing.db"

# The engine is the connection between python and the database
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# A temporary connection used to talk with the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Is what we use to define database tables
Base = declarative_base()