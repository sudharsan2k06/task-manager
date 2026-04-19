import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./taskmanager.db")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
