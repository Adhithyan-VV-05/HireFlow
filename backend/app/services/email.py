import os
from app.core.llm_utils import call_llm

def generate_interview_email(candidate_name, job_title, required_skills, candidate_skills, date_str, time_str):
    """Generate a professional interview invitation using Gemini."""
    
    system_prompt = (
        "You are a professional technical recruiter. Write a clear, inviting, and professional "
        "interview confirmation email. Highlight how the candidate's skills match the role requirements."
    )
    
    user_content = (
        f"Candidate Name: {candidate_name}\n"
        f"Job Role: {job_title}\n"
        f"Required Skills for Job: {', '.join(required_skills)}\n"
        f"Candidate's Matching Skills: {', '.join(candidate_skills)}\n"
        f"Interview Date: {date_str}\n"
        f"Interview Time: {time_str}\n\n"
        "Please generate the Subject line and the Email Body. Keep it concise and professional."
    )
    
    messages = [{"role": "user", "content": user_content}]
    
    try:
        response = call_llm(system_prompt, messages)
        return response
    except Exception as e:
        print(f"[EmailService] LLM generation failed: {e}")
        return f"Subject: Interview Confirmation - {job_title}\n\nDear {candidate_name},\n\nWe are pleased to confirm your interview for the {job_title} position on {date_str} at {time_str}.\n\nBest regards,\nHireFlow Recruitment Team"

def send_interview_email(to_email, email_content):
    """
    Sends an email via SMTP (Gmail) if credentials are provided.
    Otherwise, logs to a file and terminal.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    email_user = os.environ.get("EMAIL_USER")
    email_pass = os.environ.get("EMAIL_PASS") # Requires App Password for Gmail

    # 1. Always Log Locally (for verification)
    print(f"\n[EMAIL LOGGED TO {to_email}]")
    print("-" * 40)
    print(email_content)
    print("-" * 40 + "\n")
    
    with open("sent_emails.txt", "a", encoding="utf-8") as f:
        f.write(f"\nTo: {to_email}\n{email_content}\n" + "="*50 + "\n")

    # 2. Try sending real email if configured
    if email_user and email_pass:
        try:
            # Parse Subject and Body if possible
            lines = email_content.split('\n')
            subject = "Interview Invitation"
            body = email_content
            
            for i, line in enumerate(lines):
                if line.lower().startswith("subject:"):
                    subject = line.replace("Subject:", "").strip()
                    body = "\n".join(lines[i+1:]).strip()
                    break

            msg = MIMEMultipart()
            msg['From'] = email_user
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(email_user, email_pass)
            server.send_message(msg)
            server.quit()
            print(f"[EmailService] Real email sent to {to_email}")
            return True
        except Exception as e:
            print(f"[EmailService] Failed to send real email: {e}")
            return False
    else:
        print("[EmailService] No SMTP credentials found. Email log saved to sent_emails.txt.")
    
    return True
