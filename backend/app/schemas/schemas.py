from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional, List, Dict, Any

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "student"  # admin / teacher / student

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Student Pre-Record Schemas
class StudentPreRecordBase(BaseModel):
    student_id: str
    name: str
    course: str
    year: str
    division: str
    roll_number: str

class StudentPreRecordCreate(StudentPreRecordBase):
    pass

class StudentPreRecordResponse(StudentPreRecordBase):
    id: int

    class Config:
        from_attributes = True

# Student Schemas
class StudentBase(BaseModel):
    student_id: str
    name: str
    department: str
    course: Optional[str] = None
    year: str
    division: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None

class StudentCreate(StudentBase):
    user_id: Optional[int] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[str] = None
    division: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    is_email_verified: Optional[bool] = None
    face_registered: Optional[bool] = None
    profile_photo: Optional[str] = None
    face_photos_json: Optional[str] = None
    profile_completed_percentage: Optional[int] = None

class StudentResponse(StudentBase):
    id: int
    user_id: Optional[int] = None
    is_email_verified: bool
    face_registered: bool
    profile_photo: Optional[str] = None
    face_photos_json: Optional[str] = None
    profile_completed_percentage: int
    created_at: datetime

    class Config:
        from_attributes = True

# Student Self-Registration Schema
class StudentRegister(BaseModel):
    username: str
    password: str
    student_id: str
    name: str
    course: str
    year: str
    division: str
    roll_number: str

# Attendance Schemas
class AttendanceBase(BaseModel):
    student_id: str
    name: str
    subject: str = "Default Subject"
    date: date
    time: time
    status: str = "Present"

class AttendanceCreate(AttendanceBase):
    face_confidence: Optional[float] = None

class AttendanceResponse(AttendanceBase):
    id: int
    face_confidence: Optional[float] = None
    created_at: datetime
    student: Optional[StudentResponse] = None

    class Config:
        from_attributes = True

# QR Code Attendance Schemas
class QRCodeAttendanceBase(BaseModel):
    subject: str
    course: str
    year: str
    division: str
    lecture_number: int
    date: date
    start_time: time
    end_time: time

class QRCodeAttendanceCreate(QRCodeAttendanceBase):
    pass

class QRCodeAttendanceResponse(QRCodeAttendanceBase):
    id: str
    teacher_id: int
    expires_at: datetime
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class QRCodeScanPayload(BaseModel):
    qr_id: str

class QRCodeVerifyFacePayload(BaseModel):
    qr_id: str
    image: str  # Base64 live capture image

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Login Log Schemas
class LoginLogResponse(BaseModel):
    id: int
    user_id: int
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Stats and Dashboard Schemas
class DailyStats(BaseModel):
    date: date
    present: int
    late: int
    total: int

class DepartmentStats(BaseModel):
    department: str
    count: int

class CourseStats(BaseModel):
    course: str
    count: int

class DashboardStats(BaseModel):
    total_students: int
    today_present: int
    today_absent: int
    attendance_rate: float
    qrs_generated_today: int
    active_classes: int
    recent_activity: List[AttendanceResponse]
    daily_stats: List[DailyStats]
    course_stats: List[CourseStats]
