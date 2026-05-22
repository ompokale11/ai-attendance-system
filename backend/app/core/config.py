import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Attendance System"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-ai-attendance-system-12345")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database.db")
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    UPLOADS_DIR: str = os.path.join(BASE_DIR, "uploads")
    DATASET_DIR: str = os.path.join(BASE_DIR, "dataset")
    
    class Config:
        case_sensitive = True

settings = Settings()

# Helper to check if a directory is writeable
def check_writable(path):
    try:
        os.makedirs(path, exist_ok=True)
        test_file = os.path.join(path, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        return True
    except Exception:
        return False

# Ensure directories exist with fallback to /tmp
if not check_writable(settings.UPLOADS_DIR):
    settings.UPLOADS_DIR = "/tmp/uploads"
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)

if not check_writable(settings.DATASET_DIR):
    settings.DATASET_DIR = "/tmp/dataset"
    os.makedirs(settings.DATASET_DIR, exist_ok=True)

# Ensure SQLite database parent directory exists and is writeable
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        if not check_writable(db_dir):
            settings.DATABASE_URL = "sqlite:////tmp/database.db"
        else:
            os.makedirs(db_dir, exist_ok=True)


