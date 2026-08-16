import os
import requests
from fastapi import HTTPException
from app.utils.logger import logger

# Using simple requests to avoid SDK dependency hell
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def send_otp_email(to_email: str, otp: str, purpose: str = "signup"):
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        logger.warning(f"BREVO_API_KEY not set. Would have sent OTP to {to_email} for {purpose}")
        return

    subject = "CodeML - Verify your email" if purpose == "signup" else "CodeML - Password Reset OTP"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>CodeML Portal</h2>
        <p>Your One-Time Password (OTP) for {purpose} is:</p>
        <h1 style="color: #0d0d3b; letter-spacing: 5px;">{otp}</h1>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    </div>
    """

    payload = {
        "sender": {"name": "KIET Exams", "email": "noreply@kietexams.edu"},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }

    try:
        logger.debug(f"Attempting to send OTP email to {to_email} via Brevo")
        response = requests.post(BREVO_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Successfully sent OTP email to {to_email}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send email via Brevo: {e}")
        # We don't want to crash the app if the email fails, just raise an HTTP error
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again later.")
