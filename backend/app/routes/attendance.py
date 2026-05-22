from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import pandas as pd
import io
from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas import schemas
from app.models import models

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.get("", response_model=List[schemas.AttendanceResponse])
def read_attendance_records(
    student_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_attendance_records(
        db, 
        student_id=student_id, 
        start_date=start_date, 
        end_date=end_date, 
        skip=skip, 
        limit=limit
    )

@router.get("/dashboard-stats", response_model=schemas.DashboardStats)
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_dashboard_stats(db)

@router.post("/mark", response_model=schemas.AttendanceResponse)
def mark_attendance_manually(
    attendance_in: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if student exists
    student = crud.get_student_by_student_id(db, student_id=attendance_in.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Check for duplicate today
    existing = crud.get_student_today_attendance(db, attendance_in.student_id, attendance_in.date)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already marked for {student.name} today."
        )
        
    return crud.create_attendance_record(db, attendance_in)

@router.get("/export")
def export_attendance_records(
    student_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    format: str = Query("csv", pattern="^(csv|excel)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    records = crud.get_attendance_records(
        db, 
        student_id=student_id, 
        start_date=start_date, 
        end_date=end_date, 
        limit=100000  # Large limit for exports
    )
    
    if not records:
        raise HTTPException(status_code=404, detail="No records found to export")
        
    # Format data for DataFrame
    data = []
    for r in records:
        # Load associated student details for more info in export
        dept = r.student.department if r.student else ""
        year = r.student.year if r.student else ""
        
        data.append({
            "Student ID": r.student_id,
            "Name": r.name,
            "Department": dept,
            "Year": year,
            "Date": r.date.strftime("%Y-%m-%d"),
            "Time": r.time.strftime("%H:%M:%S"),
            "Status": r.status
        })
        
    df = pd.DataFrame(data)
    
    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        response = StreamingResponse(
            iter([stream.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = f"attachment; filename=attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return response
    else:  # excel
        stream = io.BytesIO()
        with pd.ExcelWriter(stream, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Attendance")
        
        stream.seek(0)
        response = StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = f"attachment; filename=attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return response
