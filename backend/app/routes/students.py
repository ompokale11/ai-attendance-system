from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import pandas as pd
import json
import cv2
import numpy as np
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.crud import crud
from app.schemas import schemas
from app.models import models
from app.ai.face_engine import face_engine
from app.core.email import send_real_verification_email
import random
from datetime import datetime, timedelta

router = APIRouter(prefix="/students", tags=["Students"])

def calculate_progress(student: models.Student) -> int:
    pct = 25
    if student.profile_photo:
        pct += 25
    if student.face_registered:
        pct += 25
    if student.mobile and student.is_email_verified:
        pct += 25
    return pct

# Pre-Record Routes
@router.post("/pre-record", response_model=schemas.StudentPreRecordResponse)
def create_pre_record(
    record: schemas.StudentPreRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
    
    existing = crud.get_student_pre_record(db, student_id=record.student_id)
    if existing:
        raise HTTPException(status_code=400, detail="Student ID already exists in pre-records")
        
    return crud.create_student_pre_record(db, record)

@router.get("/pre-records", response_model=List[schemas.StudentPreRecordResponse])
def get_pre_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
    return crud.get_student_pre_records(db, skip=skip, limit=limit)

@router.post("/import-excel")
async def import_students_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
        
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload an Excel or CSV file.")
        
    # Create temp directory
    temp_dir = "/tmp" if os.name != 'nt' else os.environ.get('TEMP', 'C:\\temp')
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, filename)
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        if ext == ".csv":
            df = pd.read_csv(temp_file_path)
        else:
            df = pd.read_excel(temp_file_path)
            
        required_cols = ["student_id", "name", "course", "year", "division", "roll_number"]
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
                
        imported_count = 0
        skipped_count = 0
        
        for _, row in df.iterrows():
            student_id = str(row["student_id"]).strip()
            # Check duplicates
            existing = crud.get_student_pre_record(db, student_id=student_id)
            if existing:
                skipped_count += 1
                continue
                
            record = schemas.StudentPreRecordCreate(
                student_id=student_id,
                name=str(row["name"]).strip(),
                course=str(row["course"]).strip(),
                year=str(row["year"]).strip(),
                division=str(row["division"]).strip(),
                roll_number=str(row["roll_number"]).strip()
            )
            crud.create_student_pre_record(db, record)
            imported_count += 1
            
        return {"imported": imported_count, "skipped": skipped_count, "detail": "Excel import completed successfully."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing Excel file: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# Account activation controls
@router.put("/{student_id}/status")
def toggle_student_account(
    student_id: str,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
        
    student = crud.get_student_by_student_id(db, student_id=student_id)
    if not student or student.user_id is None:
        raise HTTPException(status_code=404, detail="Active Student account not found")
        
    crud.update_user_status(db, user_id=student.user_id, is_active=is_active)
    
    # In-app notification to student
    status_str = "activated" if is_active else "deactivated"
    crud.create_notification(
        db,
        user_id=student.user_id,
        title=f"Account {status_str}",
        message=f"Your student login account has been {status_str} by the administrator.",
        type="warning" if not is_active else "success"
    )
    
    return {"student_id": student_id, "is_active": is_active, "detail": f"Account status updated to {status_str}."}

# Standard Student Management
@router.post("", response_model=schemas.StudentResponse)
def create_student(
    student_in: schemas.StudentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_student = crud.get_student_by_student_id(db, student_id=student_in.student_id)
    if db_student:
        raise HTTPException(status_code=400, detail="Student ID already exists")
    return crud.create_student(db, student_in)

@router.get("", response_model=List[schemas.StudentResponse])
def read_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_students(db, skip=skip, limit=limit)

@router.get("/me", response_model=schemas.StudentResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_user_id(db, user_id=current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.get("/{student_id}", response_model=schemas.StudentResponse)
def read_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_student = crud.get_student_by_student_id(db, student_id=student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@router.put("/{student_id}", response_model=schemas.StudentResponse)
def update_student(
    student_id: str,
    student_update: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_student = crud.update_student(db, student_id=student_id, student_update=student_update)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Recalculate progress percentage
    pct = calculate_progress(db_student)
    db_student.profile_completed_percentage = pct
    db.commit()
    db.refresh(db_student)
    
    return db_student

@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student_dir = os.path.join(settings.DATASET_DIR, student_id)
    if os.path.exists(student_dir):
        shutil.rmtree(student_dir)
        
    success = crud.delete_student(db, student_id=student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"detail": "Student deleted successfully"}

# 3-Angle Face Registration Route
@router.post("/{student_id}/register-faces")
async def upload_multi_angle_faces(
    student_id: str,
    front: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_student_id(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    student_dir = os.path.join(settings.DATASET_DIR, student_id)
    os.makedirs(student_dir, exist_ok=True)
    
    files = {"front": front, "left": left, "right": right}
    saved_paths = {}
    
    # Process and validate each image using OpenCV and the FaceEngine quality check
    for angle, f in files.items():
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail=f"Invalid format for {angle} face. Only JPG/JPEG/PNG allowed.")
            
        file_path = os.path.join(student_dir, f"{angle}{ext}")
        
        # Save temp copy to validate quality
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
            
        # Read back in OpenCV to perform quality validation
        img = cv2.imread(file_path)
        if img is None:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail=f"Corrupt image file for {angle} face")
            
        val_res = face_engine.validate_face_photo(img)
        if not val_res["valid"]:
            # Clean up saved file and fail fast
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Face quality check failed for {angle} image: {val_res['error']}"
            )
            
        saved_paths[angle] = file_path

    # Train SFace on these uploaded images
    success = face_engine.train_student(student_id, student.name, student_dir)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to compile and register SFace embeddings.")
        
    # Update student profile completion
    student.face_registered = True
    student.face_photos_json = json.dumps(saved_paths)
    student.profile_completed_percentage = calculate_progress(student)
    db.commit()
    db.refresh(student)
    
    # Notify student
    crud.create_notification(
        db,
        user_id=student.user_id,
        title="Faces registered successfully!",
        message="Your 3-angle facial verification model is now trained and live.",
        type="success"
    )
    
    return {
        "detail": "Multi-angle faces registered and trained successfully.",
        "paths": saved_paths,
        "profile_completed_percentage": student.profile_completed_percentage
    }

# Profile picture upload
@router.post("/{student_id}/profile-photo")
async def upload_profile_photo(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_student_id(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG are allowed.")
        
    uploads_dir = os.path.join(settings.UPLOADS_DIR, "profile_photos")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_path = os.path.join(uploads_dir, f"{student_id}{ext}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    student.profile_photo = f"/uploads/profile_photos/{student_id}{ext}"
    student.profile_completed_percentage = calculate_progress(student)
    db.commit()
    db.refresh(student)
    
    return {"photo_url": student.profile_photo, "profile_completed_percentage": student.profile_completed_percentage}

# Real Email Verification via SMTP
@router.post("/{student_id}/send-verification-email")
def send_verification_email(
    student_id: str,
    email: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_student_id(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    clean_email = email.strip()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        
    student.email = clean_email
    db.commit()
    
    # Generate random 6-digit OTP code
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store in database
    crud.create_or_update_email_verification(
        db, student_id=student.student_id, email=clean_email, code=code, expires_at=expires_at
    )
    
    # Dispatch real email
    sent, msg = send_real_verification_email(
        to_email=clean_email, student_name=student.name, code=code
    )
    
    if not sent:
        raise HTTPException(
            status_code=400,
            detail=msg
        )
        
    return {"detail": f"Verification code sent to {clean_email}. Please check your inbox and spam folder."}

@router.post("/{student_id}/verify-email")
def verify_email_code(
    student_id: str,
    code: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_student_id(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    verification = crud.get_email_verification(db, student_id=student.student_id)
    if not verification:
        raise HTTPException(
            status_code=400, 
            detail="No verification code found. Please click 'Send Verification Email' first."
        )
        
    if datetime.utcnow() > verification.expires_at:
        crud.delete_email_verification(db, student_id=student.student_id)
        raise HTTPException(
            status_code=400, 
            detail="Verification code has expired. Please request a new code."
        )
        
    if verification.code.strip() != code.strip():
        raise HTTPException(
            status_code=400, 
            detail="Invalid 6-digit verification code. Please check your email and try again."
        )
        
    # Mark verified and delete OTP
    student.is_email_verified = True
    student.profile_completed_percentage = calculate_progress(student)
    crud.delete_email_verification(db, student_id=student.student_id)
    
    db.commit()
    db.refresh(student)
    
    crud.create_notification(
        db,
        user_id=student.user_id,
        title="Email Verified",
        message="Your email address has been verified successfully.",
        type="success"
    )
    
    return {"detail": "Email verified successfully.", "profile_completed_percentage": student.profile_completed_percentage}

