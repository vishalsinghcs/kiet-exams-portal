import os
import requests
from fastapi import HTTPException

# Using simple requests to avoid SDK dependency hell
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def send_otp_email(to_email: str, otp: str, purpose: str = "signup"):
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        print(f"WARNING: BREVO_API_KEY not set. Would have sent OTP {otp} to {to_email} for {purpose}")
        return

    subject = "KIET Exams - Verify your email" if purpose == "signup" else "KIET Exams - Password Reset OTP"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>KIET Exams Portal</h2>
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
        response = requests.post(BREVO_API_URL, json=payload, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Failed to send email via Brevo: {e}")
        # We don't want to crash the app if the email fails, just raise an HTTP error
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again later.")
