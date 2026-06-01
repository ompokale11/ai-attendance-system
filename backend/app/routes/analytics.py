from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, time, datetime, timedelta
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.models import models
from app.schemas import schemas

router = APIRouter(tags=["Analytics"])

@router.get("/analytics/teachers/dashboard", response_model=Dict[str, Any])
def get_teacher_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
        
    stats = crud.get_dashboard_stats(db)
    
    # Calculate low attendance alert count (< 75% attendance)
    alert_count = 0
    students = db.query(models.Student).all()
    for student in students:
        # Get count of lectures scheduled for this student's class
        lectures_count = db.query(models.QRCodeAttendance).filter(
            models.QRCodeAttendance.course == student.course,
            models.QRCodeAttendance.year == student.year,
            models.QRCodeAttendance.division == student.division
        ).count()
        
        if lectures_count > 0:
            attendance_count = db.query(models.Attendance).filter(
                models.Attendance.student_id == student.student_id
            ).count()
            rate = (attendance_count / lectures_count) * 100
            if rate < 75.0:
                alert_count += 1
        else:
            # If no classes were held, we don't alert
            pass
            
    return {
        "total_students": stats.total_students,
        "today_present": stats.today_present,
        "today_absent": stats.today_absent,
        "attendance_rate": stats.attendance_rate,
        "qrs_generated_today": stats.qrs_generated_today,
        "active_classes": stats.active_classes,
        "alert_count": alert_count,
        "recent_activity": [
            {
                "id": a.id,
                "student_id": a.student_id,
                "name": a.name,
                "subject": a.subject,
                "date": a.date.isoformat(),
                "time": a.time.strftime("%H:%M:%S") if a.time else None,
                "status": a.status,
                "face_confidence": f"{a.face_confidence * 100:.1f}%" if a.face_confidence else "N/A"
            }
            for a in stats.recent_activity
        ]
    }

@router.get("/analytics/teachers/charts", response_model=Dict[str, Any])
def get_teacher_charts_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
        
    total_students = db.query(models.Student).count()
    
    # 1. 7-Day Trend data
    trend_data = []
    today = date.today()
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        present = db.query(models.Attendance).filter(
            models.Attendance.date == target_date,
            models.Attendance.status == "Present"
        ).count()
        late = db.query(models.Attendance).filter(
            models.Attendance.date == target_date,
            models.Attendance.status == "Late"
        ).count()
        
        # Estimate absent
        if present + late > 0 or db.query(models.QRCodeAttendance).filter(models.QRCodeAttendance.date == target_date).count() > 0:
            absent = max(0, total_students - (present + late))
        else:
            absent = 0
            
        trend_data.append({
            "date": target_date.strftime("%b %d"),
            "present": present,
            "late": late,
            "absent": absent
        })
        
    # 2. Division Rankings (Attendance rate per division)
    divisions_query = db.query(models.Student.division).distinct().all()
    division_rankings = []
    for (div_name,) in divisions_query:
        if not div_name:
            continue
        # Count students in division
        students_in_div = db.query(models.Student).filter(models.Student.division == div_name).all()
        student_ids = [s.student_id for s in students_in_div]
        if not student_ids:
            continue
            
        # Count total QR codes for this division
        lectures_count = db.query(models.QRCodeAttendance).filter(
            models.QRCodeAttendance.division == div_name
        ).count()
        
        if lectures_count > 0:
            # Total expected attendance slots
            expected_slots = len(student_ids) * lectures_count
            # Total marked attendance
            marked_count = db.query(models.Attendance).filter(
                models.Attendance.student_id.in_(student_ids)
            ).count()
            rate = round((marked_count / expected_slots) * 100, 1)
        else:
            rate = 100.0  # default if no lectures held
            
        division_rankings.append({
            "division": f"Div {div_name}",
            "rate": rate
        })
    # Sort rankings descending
    division_rankings = sorted(division_rankings, key=lambda x: x["rate"], reverse=True)

    # 3. Subject breakdown
    subject_stats = db.query(
        models.Attendance.subject,
        func.count(models.Attendance.id).label("total")
    ).group_by(models.Attendance.subject).all()
    
    subject_breakdown = []
    for subj, total in subject_stats:
        present = db.query(models.Attendance).filter(
            models.Attendance.subject == subj,
            models.Attendance.status == "Present"
        ).count()
        late = db.query(models.Attendance).filter(
            models.Attendance.subject == subj,
            models.Attendance.status == "Late"
        ).count()
        subject_breakdown.append({
            "subject": subj,
            "present": present,
            "late": late,
            "absent": max(0, total_students - (present + late)) # simplified
        })
        
    # 4. Low attendance list (< 75%)
    low_attendance_students = []
    all_students = db.query(models.Student).all()
    for student in all_students:
        lectures_count = db.query(models.QRCodeAttendance).filter(
            models.QRCodeAttendance.course == student.course,
            models.QRCodeAttendance.year == student.year,
            models.QRCodeAttendance.division == student.division
        ).count()
        
        attendance_count = db.query(models.Attendance).filter(
            models.Attendance.student_id == student.student_id
        ).count()
        
        rate = (attendance_count / lectures_count) * 100 if lectures_count > 0 else 100.0
        
        if rate < 75.0:
            low_attendance_students.append({
                "student_id": student.student_id,
                "name": student.name,
                "course": student.course,
                "division": student.division,
                "rate": round(rate, 1),
                "attended": attendance_count,
                "total_lectures": lectures_count
            })
            
    return {
        "trend_data": trend_data,
        "division_rankings": division_rankings,
        "subject_breakdown": subject_breakdown,
        "low_attendance_students": low_attendance_students
    }

@router.get("/analytics/students/history", response_model=Dict[str, Any])
def get_student_history_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_user_id(db, user_id=current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Total lectures scheduled for this student's class
    lectures_count = db.query(models.QRCodeAttendance).filter(
        models.QRCodeAttendance.course == student.course,
        models.QRCodeAttendance.year == student.year,
        models.QRCodeAttendance.division == student.division
    ).count()
    
    # Total student attendance
    attendance_records = db.query(models.Attendance).filter(
        models.Attendance.student_id == student.student_id
    ).order_by(models.Attendance.date.desc(), models.Attendance.time.desc()).all()
    
    attendance_count = len(attendance_records)
    rate = round((attendance_count / lectures_count) * 100, 1) if lectures_count > 0 else 100.0
    
    # Subject breakdown for this student
    subjects_query = db.query(models.QRCodeAttendance.subject).filter(
        models.QRCodeAttendance.course == student.course,
        models.QRCodeAttendance.year == student.year,
        models.QRCodeAttendance.division == student.division
    ).distinct().all()
    
    subject_stats = []
    for (subj,) in subjects_query:
        # Total lectures in subject
        subj_lectures = db.query(models.QRCodeAttendance).filter(
            models.QRCodeAttendance.course == student.course,
            models.QRCodeAttendance.year == student.year,
            models.QRCodeAttendance.division == student.division,
            models.QRCodeAttendance.subject == subj
        ).count()
        
        # Student attendance in subject
        subj_att = db.query(models.Attendance).filter(
            models.Attendance.student_id == student.student_id,
            models.Attendance.subject == subj
        ).count()
        
        subj_rate = round((subj_att / subj_lectures) * 100, 1) if subj_lectures > 0 else 100.0
        
        subject_stats.append({
            "subject": subj,
            "attended": subj_att,
            "total": subj_lectures,
            "rate": subj_rate
        })
        
    return {
        "attendance_rate": rate,
        "attended_classes": attendance_count,
        "total_classes": lectures_count,
        "calendar_logs": [
            {
                "id": a.id,
                "subject": a.subject,
                "date": a.date.isoformat(),
                "time": a.time.strftime("%H:%M:%S") if a.time else None,
                "status": a.status,
                "face_confidence": f"{a.face_confidence * 100:.1f}%" if a.face_confidence else "N/A"
            }
            for a in attendance_records
        ],
        "subject_stats": subject_stats
    }
