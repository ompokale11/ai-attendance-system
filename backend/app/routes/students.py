from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.crud import crud
from app.schemas import schemas
from app.models import models

router = APIRouter(prefix="/students", tags=["Students"])

@router.post("", response_model=schemas.StudentResponse)
def create_student(
    student_in: schemas.StudentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_student = crud.get_student_by_student_id(db, student_id=student_in.student_id)
    if db_student:
        raise HTTPException(
            status_code=400,
            detail="Student ID already exists"
        )
    return crud.create_student(db, student_in)

@router.get("", response_model=List[schemas.StudentResponse])
def read_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_students(db, skip=skip, limit=limit)

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
    return db_student

@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Also delete their face photos folder if it exists
    student_dir = os.path.join(settings.DATASET_DIR, student_id)
    if os.path.exists(student_dir):
        shutil.rmtree(student_dir)
        
    success = crud.delete_student(db, student_id=student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"detail": "Student deleted successfully"}

@router.post("/{student_id}/upload-face")
async def upload_face_image(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_student_id(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Save the file to dataset/{student_id}/{filename}
    student_dir = os.path.join(settings.DATASET_DIR, student_id)
    os.makedirs(student_dir, exist_ok=True)
    
    # Clean filename and generate a path
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image format. Only JPG, JPEG, and PNG are allowed."
        )
        
    filename = f"{len(os.listdir(student_dir)) + 1}{file_extension}"
    file_path = os.path.join(student_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update student face registration status
    crud.update_student(
        db, 
        student_id=student_id, 
        student_update=schemas.StudentUpdate(face_registered=True)
    )
    
    return {"filename": filename, "path": file_path, "detail": "Face image uploaded successfully"}

@router.post("/train-all")
def train_all_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app.ai.face_engine import face_engine
    students = crud.get_students(db)
    trained_count = 0
    failed_students = []
    
    for s in students:
        student_dir = os.path.join(settings.DATASET_DIR, s.student_id)
        if os.path.exists(student_dir) and len(os.listdir(student_dir)) > 0:
            success = face_engine.train_student(s.student_id, s.name, student_dir)
            if success:
                trained_count += 1
            else:
                failed_students.append(s.student_id)
                
    return {
        "detail": f"Successfully trained model for {trained_count} students.",
        "failed_students": failed_students
    }
