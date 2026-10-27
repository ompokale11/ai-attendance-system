from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.crud import crud
from app.schemas import schemas
from app.models import models

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    return crud.create_user(db, user_in)

@router.post("/student-register", response_model=schemas.Token)
def student_register(
    reg_in: schemas.StudentRegister,
    db: Session = Depends(get_db)
):
    # 1. Validate against StudentPreRecord
    pre_record = crud.get_student_pre_record(db, student_id=reg_in.student_id)
    if not pre_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Student ID. Please ensure your ID exists in the teacher registry."
        )
    
    # Verify pre-record details match
    mismatches = []
    
    if pre_record.name.strip().lower() != reg_in.name.strip().lower():
        mismatches.append(f"Full Name (Expected: '{pre_record.name}', Got: '{reg_in.name}')")
        
    norm_pre_course = pre_record.course.strip().lower().rstrip('s')
    norm_reg_course = reg_in.course.strip().lower().rstrip('s')
    if norm_pre_course != norm_reg_course:
        mismatches.append(f"Course (Expected: '{pre_record.course}', Got: '{reg_in.course}')")
        
    if pre_record.year.strip().lower() != reg_in.year.strip().lower():
        mismatches.append(f"Year (Expected: '{pre_record.year}', Got: '{reg_in.year}')")
        
    if pre_record.division.strip().lower() != reg_in.division.strip().lower():
        mismatches.append(f"Division (Expected: '{pre_record.division}', Got: '{reg_in.division}')")
        
    if mismatches:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification failed. Provided details do not match the pre-registered database: {'; '.join(mismatches)}."
        )
        
    # 2. Check if student already has a user account
    db_student = crud.get_student_by_student_id(db, student_id=reg_in.student_id)
    if db_student and db_student.user_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This Student ID is already linked to a registered account."
        )
        
    # 3. Check username uniqueness
    db_user = crud.get_user_by_username(db, username=reg_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken."
        )
        
    # 4. Create User (role="student")
    user_create = schemas.UserCreate(
        username=reg_in.username,
        password=reg_in.password,
        role="student"
    )
    user = crud.create_user(db, user_create)
    
    # 5. Create Student or link existing
    if db_student:
        db_student.user_id = user.id
        db.commit()
        db.refresh(db_student)
    else:
        student_create = schemas.StudentCreate(
            student_id=reg_in.student_id,
            user_id=user.id,
            name=reg_in.name,
            department=reg_in.course,
            course=reg_in.course,
            year=reg_in.year,
            division=reg_in.division
        )
        crud.create_student(db, student_create)
        
    # 6. Delete pre-record (or mark registered, let's keep database clean by deleting pre-record)
    crud.delete_student_pre_record(db, student_id=reg_in.student_id)
    
    # 7. Create welcome notification
    crud.create_notification(
        db, 
        user_id=user.id, 
        title="Welcome to AI Attendance!", 
        message="Please complete your profile to register your face model and begin scanning.",
        type="success"
    )
    
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=schemas.Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact your teacher."
        )
    
    # Record login activity log
    ip_addr = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "Unknown Device")
    crud.create_login_log(db, user_id=user.id, ip_address=ip_addr, device_info=user_agent)
    
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/login-logs", response_model=List[schemas.LoginLogResponse])
def get_login_activity_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can view login logs")
    return crud.get_login_logs(db, limit=100)

