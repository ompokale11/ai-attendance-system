from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.routes import auth, students, attendance, websocket
from app.crud import crud
from app.schemas import schemas

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set up CORS middleware
# In production, specify authorized origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Admin User if not exists
@app.on_event("startup")
def seed_admin_user():
    db = SessionLocal()
    try:
        admin_username = "admin"
        admin_password = "adminpassword123"
        
        existing = crud.get_user_by_username(db, admin_username)
        if not existing:
            logger.info(f"Seeding default admin user: {admin_username}")
            crud.create_user(
                db, 
                schemas.UserCreate(username=admin_username, password=admin_password)
            )
            logger.info("Admin user seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding admin user: {e}")
    finally:
        db.close()

# Register routes
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the AI Attendance System API",
        "docs": "/docs",
        "status": "healthy"
    }

@app.get("/diagnose")
def diagnose():
    import traceback
    result = {
        "database_url": settings.DATABASE_URL,
        "uploads_dir": settings.UPLOADS_DIR,
        "dataset_dir": settings.DATASET_DIR,
        "uploads_writeable": False,
        "dataset_writeable": False,
        "db_writeable": False,
        "db_error": None,
        "status": "unknown"
    }
    
    # Check upload dirs
    try:
        test_file = os.path.join(settings.UPLOADS_DIR, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        result["uploads_writeable"] = True
    except Exception as e:
        result["uploads_write_error"] = str(e)
        
    try:
        test_file = os.path.join(settings.DATASET_DIR, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        result["dataset_writeable"] = True
    except Exception as e:
        result["dataset_write_error"] = str(e)

    # Check database write
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        from sqlalchemy import text
        # Try to execute a simple table check or write
        db.execute(text("CREATE TABLE IF NOT EXISTS _test_write (id INTEGER PRIMARY KEY, val TEXT)"))
        db.execute(text("INSERT INTO _test_write (val) VALUES ('test')"))
        db.execute(text("DROP TABLE _test_write"))
        db.commit()
        db.close()
        result["db_writeable"] = True
        result["status"] = "ok"
    except Exception as e:
        result["db_error"] = str(e)
        result["db_traceback"] = traceback.format_exc()
        result["status"] = "error"
        
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
