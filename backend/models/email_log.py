from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Text

from database.connection import Base


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String, nullable=False, index=True)
    provider = Column(
        String, nullable=False, index=True
    )  # resend_hackx, mailtrap_hackx, resend_fallback, etc.
    domain = Column(String, nullable=False, index=True)  # hackx, hackx_jr
    purpose = Column(String, nullable=False)  # otp, welcome_x, welcome_jr
    subject = Column(String, nullable=False)
    status = Column(String, nullable=False, index=True)  # success, failed
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=utc_now, nullable=False, index=True)
