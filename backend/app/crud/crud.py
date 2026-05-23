from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, time, datetime, timedelta
from app.models import models
from app.schemas import schemas
from app.core.security import get_password_hash

# User Helpers
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Student Helpers
def get_student_by_id(db: Session, id: int):
    return db.query(models.Student).filter(models.Student.id == id).first()

def get_student_by_student_id(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.student_id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(
        student_id=student.student_id,
        name=student.name,
        department=student.department,
        year=student.year,
        mobile=student.mobile,
        face_registered=False
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def update_student(db: Session, student_id: str, student_update: schemas.StudentUpdate):
    db_student = get_student_by_student_id(db, student_id)
    if not db_student:
        return None
    
    update_data = student_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
        
    db.commit()
    db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: str):
    db_student = get_student_by_student_id(db, student_id)
    if not db_student:
        return False
    db.delete(db_student)
    db.commit()
    return True

# Attendance Helpers
def get_attendance_records(
    db: Session, 
    student_id: str = None, 
    start_date: date = None, 
    end_date: date = None,
    skip: int = 0, 
    limit: int = 100
):
    query = db.query(models.Attendance)
    if student_id:
        query = query.filter(models.Attendance.student_id == student_id)
    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)
    
    return query.order_by(models.Attendance.created_at.desc()).offset(skip).limit(limit).all()

def get_student_today_attendance(db: Session, student_id: str, target_date: date):
    return db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.date == target_date
    ).first()

def create_attendance_record(db: Session, attendance: schemas.AttendanceCreate):
    db_attendance = models.Attendance(
        student_id=attendance.student_id,
        name=attendance.name,
        date=attendance.date,
        time=attendance.time,
        status=attendance.status
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

# Dashboard Stats Helper
def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    total_students = db.query(models.Student).count()
    
    today = date.today()
    today_present = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == "Present"
    ).count()
    
    today_late = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == "Late"
    ).count()
    
    attendance_rate = 0.0
    if total_students > 0:
        attendance_rate = round(((today_present + today_late) / total_students) * 100, 2)
        
    recent_activity = db.query(models.Attendance).order_by(
        models.Attendance.created_at.desc()
    ).limit(5).all()
    
    # 7-day stats
    daily_stats = []
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        p_count = db.query(models.Attendance).filter(
            models.Attendance.date == target_date,
            models.Attendance.status == "Present"
        ).count()
        l_count = db.query(models.Attendance).filter(
            models.Attendance.date == target_date,
            models.Attendance.status == "Late"
        ).count()
        
        daily_stats.append(
            schemas.DailyStats(
                date=target_date,
                present=p_count,
                late=l_count,
                total=p_count + l_count
            )
        )
        
    # Department stats
    dept_counts = db.query(
        models.Student.department, 
        func.count(models.Student.id)
    ).group_by(models.Student.department).all()
    
    department_stats = [
        schemas.DepartmentStats(department=dept, count=count) 
        for dept, count in dept_counts if dept
    ]
    
    return schemas.DashboardStats(
        total_students=total_students,
        today_present=today_present,
        today_late=today_late,
        attendance_rate=attendance_rate,
        recent_activity=recent_activity,
        daily_stats=daily_stats,
        department_stats=department_stats
    )
