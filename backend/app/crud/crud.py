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
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_status(db: Session, user_id: int, is_active: bool):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.is_active = is_active
        db.commit()
        db.refresh(db_user)
    return db_user

# Student Pre-Record Helpers
def get_student_pre_record(db: Session, student_id: str):
    return db.query(models.StudentPreRecord).filter(models.StudentPreRecord.student_id == student_id).first()

def create_student_pre_record(db: Session, record: schemas.StudentPreRecordCreate):
    db_record = models.StudentPreRecord(
        student_id=record.student_id,
        name=record.name,
        course=record.course,
        year=record.year,
        division=record.division,
        roll_number=record.roll_number
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_student_pre_records(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.StudentPreRecord).offset(skip).limit(limit).all()

def delete_student_pre_record(db: Session, student_id: str):
    db_record = get_student_pre_record(db, student_id)
    if db_record:
        db.delete(db_record)
        db.commit()
        return True
    return False

# Student Helpers
def get_student_by_id(db: Session, id: int):
    return db.query(models.Student).filter(models.Student.id == id).first()

def get_student_by_student_id(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.student_id == student_id).first()

def get_student_by_user_id(db: Session, user_id: int):
    return db.query(models.Student).filter(models.Student.user_id == user_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(
        student_id=student.student_id,
        user_id=student.user_id,
        name=student.name,
        department=student.department,
        course=student.course if student.course else student.department,
        year=student.year,
        division=student.division,
        mobile=student.mobile,
        email=student.email,
        face_registered=False,
        profile_completed_percentage=25
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def update_student(db: Session, student_id: str, student_update: schemas.StudentUpdate):
    db_student = get_student_by_student_id(db, student_id)
    if not db_student:
        return None
    
    update_data = student_update.model_dump(exclude_unset=True)
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
    course: str = None,
    year: str = None,
    division: str = None,
    subject: str = None,
    start_date: date = None, 
    end_date: date = None,
    skip: int = 0, 
    limit: int = 100
):
    query = db.query(models.Attendance)
    if student_id:
        query = query.filter(models.Attendance.student_id == student_id)
    if subject:
        query = query.filter(models.Attendance.subject == subject)
    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)
        
    # Join with Student for course/year/division filtering
    if course or year or division:
        query = query.join(models.Student)
        if course:
            query = query.filter(models.Student.course == course)
        if year:
            query = query.filter(models.Student.year == year)
        if division:
            query = query.filter(models.Student.division == division)
            
    return query.order_by(models.Attendance.created_at.desc()).offset(skip).limit(limit).all()

def get_student_today_attendance(db: Session, student_id: str, target_date: date, subject: str):
    return db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id,
        models.Attendance.date == target_date,
        models.Attendance.subject == subject
    ).first()

def create_attendance_record(db: Session, attendance: schemas.AttendanceCreate):
    db_attendance = models.Attendance(
        student_id=attendance.student_id,
        name=attendance.name,
        subject=attendance.subject,
        date=attendance.date,
        time=attendance.time,
        status=attendance.status,
        face_confidence=attendance.face_confidence
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

# QR Code Helpers
def get_qr_code(db: Session, qr_id: str):
    return db.query(models.QRCodeAttendance).filter(models.QRCodeAttendance.id == qr_id).first()

def get_teacher_daily_qr_count(db: Session, teacher_id: int, target_date: date):
    return db.query(models.QRCodeAttendance).filter(
        models.QRCodeAttendance.teacher_id == teacher_id,
        models.QRCodeAttendance.date == target_date
    ).count()

def create_qr_code(db: Session, teacher_id: int, qr_id: str, qr_in: schemas.QRCodeAttendanceCreate, expires_at: datetime):
    db_qr = models.QRCodeAttendance(
        id=qr_id,
        teacher_id=teacher_id,
        subject=qr_in.subject,
        course=qr_in.course,
        year=qr_in.year,
        division=qr_in.division,
        lecture_number=qr_in.lecture_number,
        date=qr_in.date,
        start_time=qr_in.start_time,
        end_time=qr_in.end_time,
        expires_at=expires_at,
        is_active=True
    )
    db.add(db_qr)
    db.commit()
    db.refresh(db_qr)
    return db_qr

# Notification Helpers
def create_notification(db: Session, user_id: int, title: str, message: str, type: str = "info"):
    db_notif = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        is_read=False
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif

def get_user_notifications(db: Session, user_id: int, limit: int = 50):
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(models.Notification.created_at.desc()).limit(limit).all()

def mark_notification_as_read(db: Session, notif_id: int):
    db_notif = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if db_notif:
        db_notif.is_read = True
        db.commit()
        db.refresh(db_notif)
    return db_notif

# Login Log Helpers
def create_login_log(db: Session, user_id: int, ip_address: str = None, device_info: str = None):
    db_log = models.LoginLog(
        user_id=user_id,
        ip_address=ip_address,
        device_info=device_info
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_login_logs(db: Session, limit: int = 100):
    return db.query(models.LoginLog).order_by(models.LoginLog.timestamp.desc()).limit(limit).all()

# Dashboard Analytics Helpers
def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    total_students = db.query(models.Student).count()
    
    today = date.today()
    today_present = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == "Present"
    ).count()
    
    today_absent = 0
    if total_students > 0:
        today_absent = max(0, total_students - today_present)
        
    qrs_today = db.query(models.QRCodeAttendance).filter(
        models.QRCodeAttendance.date == today
    ).count()
    
    # Active classes: count distinct courses/divisions of QRs that are active and not expired today
    active_classes = db.query(models.QRCodeAttendance).filter(
        models.QRCodeAttendance.date == today,
        models.QRCodeAttendance.expires_at > datetime.utcnow(),
        models.QRCodeAttendance.is_active == True
    ).distinct(models.QRCodeAttendance.course, models.QRCodeAttendance.division).count()
    
    attendance_rate = 0.0
    if total_students > 0:
        # Rate across present students relative to total
        attendance_rate = round((today_present / total_students) * 100, 2)
        
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
        
    # Course stats
    course_counts = db.query(
        models.Student.course, 
        func.count(models.Student.id)
    ).group_by(models.Student.course).all()
    
    course_stats = [
        schemas.CourseStats(course=c if c else "Unknown", count=count) 
        for c, count in course_counts
    ]
    
    return schemas.DashboardStats(
        total_students=total_students,
        today_present=today_present,
        today_absent=today_absent,
        attendance_rate=attendance_rate,
        qrs_generated_today=qrs_today,
        active_classes=active_classes,
        recent_activity=recent_activity,
        daily_stats=daily_stats,
        course_stats=course_stats
    )
