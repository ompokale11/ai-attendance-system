from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import base64
import cv2
import numpy as np
from datetime import datetime, date, time
import logging
from app.core.database import SessionLocal
from app.ai.face_engine import face_engine
from app.crud import crud
from app.schemas import schemas

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["WebSockets"])

# Attendance session window config
SESSION_START_HOUR = 9
SESSION_START_MINUTE = 0
LATE_CUTOFF_HOUR = 10
LATE_CUTOFF_MINUTE = 0

def get_attendance_status(checkin_time: time) -> str:
    """
    Smart Rule:
    - Before 09:00 AM: Too Early
    - 09:00 AM to 10:00 AM: Present
    - After 10:00 AM: Late
    """
    start_time = time(SESSION_START_HOUR, SESSION_START_MINUTE)
    cutoff_time = time(LATE_CUTOFF_HOUR, LATE_CUTOFF_MINUTE)
    
    if checkin_time < start_time:
        return "Too Early"
    elif checkin_time <= cutoff_time:
        return "Present"
    else:
        return "Late"

@router.websocket("/attendance")
async def websocket_attendance_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established for attendance scanning.")
    
    try:
        while True:
            # Receive base64 frame from client
            # Expected payload: {"image": "data:image/jpeg;base64,...", "token": "..."}
            data_str = await websocket.receive_text()
            payload = json.loads(data_str)
            
            image_data = payload.get("image")
            if not image_data:
                await websocket.send_json({"error": "No image data provided"})
                continue
                
            # Strip data URL prefix if present
            if "," in image_data:
                image_data = image_data.split(",")[1]
                
            # Decode base64 to numpy array
            try:
                img_bytes = base64.b64decode(image_data)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    raise ValueError("CV2 decode failed")
            except Exception as e:
                await websocket.send_json({"error": f"Failed to decode image: {str(e)}"})
                continue
                
            # Run face recognition
            recognitions = face_engine.recognize_faces_in_frame(frame)
            if len(recognitions) > 0:
                logger.info(f"WebSocket detected {len(recognitions)} faces.")
            
            # DB Session for processing
            db = SessionLocal()
            try:
                responses = []
                for rec in recognitions:
                    student_id = rec["student_id"]
                    name = rec["name"]
                    box = rec["box"]
                    confidence = rec["confidence"]
                    
                    rec_status = "Scanning"
                    detail = ""
                    
                    if student_id != "Unknown":
                        db_student = crud.get_student_by_student_id(db, student_id)
                        if db_student:
                            name = db_student.name
                        today = date.today()
                        now_time = datetime.now().time()
                        
                        # Check if attendance is already marked today
                        existing = crud.get_student_today_attendance(db, student_id, today)
                        if existing:
                            rec_status = "Already Marked"
                            detail = f"Attendance already marked at {existing.time.strftime('%I:%M %p')}"
                        else:
                            # Apply Smart Rules: check if present or late
                            status = get_attendance_status(now_time)
                            
                            if status == "Too Early":
                                rec_status = "Too Early"
                                detail = "Attendance starts at 09:00 AM"
                            else:
                                # Create attendance record
                                attendance_in = schemas.AttendanceCreate(
                                    student_id=student_id,
                                    name=name,
                                    date=today,
                                    time=now_time,
                                    status=status
                                )
                                crud.create_attendance_record(db, attendance_in)
                                rec_status = "Marked"
                                detail = f"Marked {status} at {now_time.strftime('%I:%M %p')}"
                            
                    responses.append({
                        "box": box,
                        "student_id": student_id,
                        "name": name,
                        "confidence": confidence,
                        "status": rec_status,
                        "detail": detail
                    })
                    
                # Send detection boxes and status back to frontend
                await websocket.send_json({"faces": responses})
                
            except Exception as e:
                logger.error(f"Error processing websocket frame database operations: {e}")
                await websocket.send_json({"error": "Internal database error"})
            finally:
                db.close()
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
