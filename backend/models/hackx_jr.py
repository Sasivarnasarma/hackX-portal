from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database.connection import Base


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class HackXJrTeam(Base):
    __tablename__ = "hackx_jr_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    school_name = Column(String, nullable=False)
    school_district = Column(String, nullable=False)  # stored in lowercase
    teacher_name = Column(String, nullable=True)
    teacher_phone = Column(String, nullable=True)
    teacher_email = Column(String, nullable=True)
    consent_share = Column(Boolean, default=False, nullable=False)
    expectations = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    ambassador_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    members = relationship(
        "HackXJrMember", back_populates="team", cascade="all, delete-orphan"
    )


class HackXJrMember(Base):
    __tablename__ = "hackx_jr_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(
        Integer, ForeignKey("hackx_jr_teams.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False)
    dob = Column(Date, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    is_leader = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    team = relationship("HackXJrTeam", back_populates="members")
