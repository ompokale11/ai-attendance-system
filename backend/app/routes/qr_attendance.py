from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
import io
import base64
import qrcode
from datetime import date, time, datetime, timedelta
import numpy as np
import cv2

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.schemas import schemas
from app.models import models
from app.ai.face_engine import face_engine

router = APIRouter(prefix="/qr", tags=["QR Attendance"])

@router.post("/generate", response_model=Dict if not hasattr(schemas, 'QRCodeAttendanceResponse') else Any)
def generate_attendance_qr(
    qr_in: schemas.QRCodeAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only teachers or administrators can generate QRs")
        
    # Enforce maximum 2 QR generations per teacher per day
    today_count = crud.get_teacher_daily_qr_count(db, teacher_id=current_user.id, target_date=date.today())
    if today_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="Daily limit reached. You can only generate up to 2 attendance QRs per day."
        )
        
    # Generate unique QR ID (UUID)
    qr_id = str(uuid.uuid4())
    
    # QR code expires after 30 minutes
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    
    # Save to database
    qr_record = crud.create_qr_code(db, teacher_id=current_user.id, qr_id=qr_id, qr_in=qr_in, expires_at=expires_at)
    
    # Generate QR Code image (base64 encoded)
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        # Payload holds essential validation keys
        payload = {
            "qr_id": qr_id,
            "subject": qr_in.subject,
            "course": qr_in.course,
            "year": qr_in.year,
            "division": qr_in.division
        }
        import json
        qr.add_data(json.dumps(payload))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render QR Code: {str(e)}")
        
    return {
        "qr_id": qr_id,
        "subject": qr_record.subject,
        "course": qr_record.course,
        "year": qr_record.year,
        "division": qr_record.division,
        "lecture_number": qr_record.lecture_number,
        "expires_at": qr_record.expires_at,
        "qr_base64": f"data:image/png;base64,{qr_base64}"
    }

@router.post("/scan")
def validate_scan(
    payload: schemas.QRCodeScanPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_user_id(db, user_id=current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    qr_record = crud.get_qr_code(db, qr_id=payload.qr_id)
    if not qr_record or not qr_record.is_active:
        raise HTTPException(status_code=400, detail="This QR code is invalid or has been closed.")
        
    # Check expiry
    # Note: DB expires_at is saved as UTC
    if datetime.utcnow() > qr_record.expires_at:
        qr_record.is_active = False
        db.commit()
        raise HTTPException(status_code=400, detail="This QR code has expired (exceeded 30 minutes limit).")
        
    # Verify student class info matches QR target group
    if (student.course.lower() != qr_record.course.lower() or 
        student.year.lower() != qr_record.year.lower() or 
        student.division.lower() != qr_record.division.lower()):
        raise HTTPException(
            status_code=400,
            detail=f"Class mismatch. This attendance session is targeted for: {qr_record.course} ({qr_record.year}) Div {qr_record.division}."
        )
        
    # Check if duplicate attendance is being marked
    existing = crud.get_student_today_attendance(
        db, 
        student_id=student.student_id, 
        target_date=date.today(), 
        subject=qr_record.subject
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already marked attendance for this class today.")
        
    return {"status": "valid", "detail": "Verification successful. Please capture your face to confirm attendance."}

@router.post("/verify-face")
def verify_qr_face(
    payload: schemas.QRCodeVerifyFacePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    student = crud.get_student_by_user_id(db, user_id=current_user.id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if not student.face_registered:
        raise HTTPException(status_code=400, detail="Please register your face model in your profile first.")
        
    qr_record = crud.get_qr_code(db, qr_id=payload.qr_id)
    if not qr_record or not qr_record.is_active or datetime.utcnow() > qr_record.expires_at:
        raise HTTPException(status_code=400, detail="QR code is no longer valid or expired.")
        
    # Decode base64 image
    try:
        header, encoded = payload.image.split(",", 1)
        data = base64.b64decode(encoded)
        np_arr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webcam capture image payload")
        
    # Perform SFace matching against registered embeddings
    results = face_engine.recognize_faces_in_frame(frame)
    matched = False
    confidence = 0.0
    
    for face in results:
        if face["student_id"] == student.student_id:
            matched = True
            confidence = face["confidence"]
            break
            
    if not matched:
        raise HTTPException(
            status_code=400,
            detail="Face verification failed. Please align your face clearly in the camera."
        )
        
    # Determine Present or Late based on start_time and current time
    current_time = datetime.now().time()
    status_str = "Present"
    # Convert start_time/end_time to comparable formats if needed
    if current_time > qr_record.end_time:
        status_str = "Late"
        
    # Write attendance record
    attendance_in = schemas.AttendanceCreate(
        student_id=student.student_id,
        name=student.name,
        subject=qr_record.subject,
        date=date.today(),
        time=current_time,
        status=status_str,
        face_confidence=confidence
    )
    crud.create_attendance_record(db, attendance_in)
    
    # Log notification to student
    crud.create_notification(
        db,
        user_id=student.user_id,
        title="Attendance Marked",
        message=f"Your attendance for {qr_record.subject} has been marked as {status_str}.",
        type="success"
    )
    
    return {
        "student_name": student.name,
        "subject": qr_record.subject,
        "date": date.today(),
        "time": current_time.strftime("%H:%M:%S"),
        "status": status_str,
        "face_confidence": f"{confidence * 100:.1f}%"
    }
