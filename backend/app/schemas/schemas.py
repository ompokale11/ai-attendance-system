from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Student Schemas
class StudentBase(BaseModel):
    student_id: str
    name: str
    department: str
    year: str
    mobile: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    mobile: Optional[str] = None
    face_registered: Optional[bool] = None

class StudentResponse(StudentBase):
    id: int
    face_registered: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceBase(BaseModel):
    student_id: str
    name: str
    date: date
    time: time
    status: str = "Present"

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    id: int
    created_at: datetime
    student: Optional[StudentResponse] = None

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

class DashboardStats(BaseModel):
    total_students: int
    today_present: int
    today_late: int
    attendance_rate: float
    recent_activity: List[AttendanceResponse]
    daily_stats: List[DailyStats]
    department_stats: List[DepartmentStats]
