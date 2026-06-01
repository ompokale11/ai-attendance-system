from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date
import io
import pandas as pd
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import crud
from app.models import models

# Import ReportLab for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(tags=["Reports"])

@router.get("/teachers/reports/export")
def export_attendance_report(
    student_id: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    file_format: str = Query("excel", pattern="^(excel|pdf)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Unauthorized action")
        
    # Get filtered attendance records
    # Limit is set to large (e.g. 10000) to export all matching records
    records = crud.get_attendance_records(
        db,
        student_id=student_id,
        course=course,
        year=year,
        division=division,
        subject=subject,
        start_date=start_date,
        end_date=end_date,
        limit=10000
    )
    
    if not records:
        raise HTTPException(status_code=404, detail="No attendance records found matching filters.")
        
    if file_format == "excel":
        # Create Excel export using pandas and openpyxl
        data = []
        for r in records:
            # We can get student's division/course info if available
            student_div = "N/A"
            student_course = "N/A"
            student_year = "N/A"
            # Since student is loaded via relationship or join, we extract it
            if hasattr(r, 'student') and r.student:
                student_div = r.student.division or "N/A"
                student_course = r.student.course or "N/A"
                student_year = r.student.year or "N/A"
                
            data.append({
                "Student ID": r.student_id,
                "Name": r.name,
                "Course": student_course,
                "Year": student_year,
                "Division": student_div,
                "Subject": r.subject,
                "Date": r.date.isoformat(),
                "Time": r.time.strftime("%H:%M:%S") if r.time else "N/A",
                "Status": r.status,
                "Face Confidence": f"{r.face_confidence * 100:.1f}%" if r.face_confidence else "N/A"
            })
            
        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Attendance Report', index=False)
            
        output.seek(0)
        
        filename = f"attendance_report_{date.today().isoformat()}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif file_format == "pdf":
        # Create PDF export using ReportLab
        output = io.BytesIO()
        doc = SimpleDocTemplate(
            output,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=18,
            textColor=colors.HexColor("#1e293b"), # Slate-800
            spaceAfter=12
        )
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#64748b"), # Slate-500
            spaceAfter=20
        )
        cell_style = ParagraphStyle(
            name="CellStyle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#334155")
        )
        header_style = ParagraphStyle(
            name="HeaderStyle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.white,
            fontName="Helvetica-Bold"
        )
        
        story = []
        
        # Header title
        story.append(Paragraph("AI Attendance SaaS - Report Log", title_style))
        
        # Metadata / Filters summary
        filters_str = f"Filters: "
        if subject: filters_str += f"Subject: {subject} | "
        if course: filters_str += f"Course: {course} | "
        if year: filters_str += f"Year: {year} | "
        if division: filters_str += f"Division: {division} | "
        if start_date or end_date:
            dates = f"Date: {start_date or 'Any'} to {end_date or 'Any'}"
            filters_str += dates
        else:
            filters_str += "All records"
            
        story.append(Paragraph(f"Generated on {date.today().isoformat()} | {filters_str}", subtitle_style))
        story.append(Spacer(1, 10))
        
        # Build Table Data
        # Column widths summing to ~540pt (letter width 612 - margin 72)
        # student_id, name, subject, date, time, status, face_confidence
        table_data = [[
            Paragraph("Student ID", header_style),
            Paragraph("Name", header_style),
            Paragraph("Subject", header_style),
            Paragraph("Date", header_style),
            Paragraph("Time", header_style),
            Paragraph("Status", header_style),
            Paragraph("Confidence", header_style)
        ]]
        
        for r in records:
            table_data.append([
                Paragraph(r.student_id, cell_style),
                Paragraph(r.name, cell_style),
                Paragraph(r.subject, cell_style),
                Paragraph(r.date.isoformat(), cell_style),
                Paragraph(r.time.strftime("%H:%M:%S") if r.time else "N/A", cell_style),
                Paragraph(r.status, cell_style),
                Paragraph(f"{r.face_confidence * 100:.1f}%" if r.face_confidence else "N/A", cell_style)
            ])
            
        col_widths = [65, 110, 110, 65, 60, 60, 70]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Table Styling
        t_style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), # Slate 900
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")), # Slate 300
        ])
        
        # Row striping colors
        for idx in range(1, len(table_data)):
            if idx % 2 == 0:
                t_style.add('BACKGROUND', (0, idx), (-1, idx), colors.HexColor("#f8fafc")) # Slate 50
                
        t.setStyle(t_style)
        story.append(t)
        
        doc.build(story)
        output.seek(0)
        
        filename = f"attendance_report_{date.today().isoformat()}.pdf"
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
