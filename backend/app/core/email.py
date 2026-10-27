import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_real_verification_email(to_email: str, student_name: str, code: str, db=None):
    """
    Sends a real 6-digit verification code email via SMTP.
    Returns (True, message) on success, or (False, error_message) on failure.
    """
    from app.crud import crud
    
    smtp_user = (crud.get_system_setting(db, "smtp_user") if db else None) or settings.SMTP_USER
    smtp_password = (crud.get_system_setting(db, "smtp_password") if db else None) or settings.SMTP_PASSWORD
    smtp_host = (crud.get_system_setting(db, "smtp_host") if db else None) or settings.SMTP_HOST
    smtp_port_raw = (crud.get_system_setting(db, "smtp_port") if db else None) or settings.SMTP_PORT
    try:
        smtp_port = int(smtp_port_raw)
    except (ValueError, TypeError):
        smtp_port = 587
        
    smtp_from_name = (crud.get_system_setting(db, "smtp_from_name") if db else None) or settings.SMTP_FROM_NAME or "AI Attendance System"
    smtp_from_email = (crud.get_system_setting(db, "smtp_from_email") if db else None) or settings.SMTP_FROM_EMAIL or smtp_user

    if not smtp_user or not smtp_password:
        logger.warning(
            f"SMTP credentials not configured. OTP generated for {to_email} ({student_name}): {code}"
        )
        return False, (
            "SMTP email service is not configured. "
            "Please configure your Sender Email & App Password in the Admin Super Dashboard or Render Environment Variables."
        )

    from_email = smtp_from_email
    from_name = smtp_from_name
    subject = f"{code} is your AI Attendance Verification Code"


    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #030712;
                color: #f1f5f9;
            }}
            .wrapper {{
                width: 100%;
                background-color: #030712;
                padding: 40px 10px;
            }}
            .container {{
                max-width: 520px;
                margin: 0 auto;
                background: #0f172a;
                border: 1px solid #1e293b;
                border-radius: 20px;
                padding: 36px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
            }}
            .badge-wrapper {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .badge {{
                display: inline-block;
                background: linear-gradient(135deg, #6366f1, #a855f7);
                color: #ffffff;
                font-weight: 700;
                font-size: 13px;
                padding: 6px 18px;
                border-radius: 9999px;
                letter-spacing: 0.5px;
            }}
            h1 {{
                color: #ffffff;
                font-size: 24px;
                font-weight: 800;
                margin: 0 0 12px 0;
                text-align: center;
            }}
            p {{
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
                margin: 10px 0;
            }}
            .otp-box {{
                background: #030712;
                border: 2px dashed #6366f1;
                border-radius: 14px;
                padding: 24px 10px;
                text-align: center;
                margin: 28px 0;
            }}
            .otp {{
                font-size: 38px;
                font-weight: 900;
                letter-spacing: 10px;
                color: #818cf8;
                font-family: 'Courier New', Courier, monospace;
                display: inline-block;
                padding-left: 10px;
            }}
            .expiry {{
                text-align: center;
                font-weight: 600;
                color: #cbd5e1;
                font-size: 13px;
            }}
            .note {{
                font-size: 12px;
                color: #64748b;
                text-align: center;
                margin-top: 16px;
            }}
            .footer {{
                border-top: 1px solid #1e293b;
                padding-top: 20px;
                margin-top: 28px;
                font-size: 11px;
                color: #475569;
                text-align: center;
                line-height: 1.5;
            }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="badge-wrapper">
                    <div class="badge">AI Attendance System &bull; Verification</div>
                </div>
                <h1>Confirm Your Email Address</h1>
                <p>Hello <strong>{student_name}</strong>,</p>
                <p>We received a request to verify your email address on the <strong>AI Attendance System</strong> platform. Enter the 6-digit code below to complete your student profile setup:</p>
                
                <div class="otp-box">
                    <div class="otp">{code}</div>
                </div>
                
                <p class="expiry">&bull; This verification code expires in <strong>10 minutes</strong>.</p>
                <p class="note">If you did not request this email, you can safely disregard it. Your account will not be activated without this code.</p>
                
                <div class="footer">
                    &copy; {from_name}. All rights reserved.<br>
                    Automated system email &bull; Please do not reply directly to this message.
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text_content = (
        f"Hello {student_name},\n\n"
        f"Your AI Attendance System email verification code is: {code}\n\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you did not request this code, please ignore this email.\n\n"
        f"Regards,\n{from_name}"
    )

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Verification email successfully delivered to {to_email}")
        return True, "Email sent successfully"
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False, f"Failed to deliver email via SMTP: {str(e)}"
