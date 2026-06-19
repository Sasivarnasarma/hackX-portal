from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database.connection import Base


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class HackXTeam(Base):
    __tablename__ = "hackx_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    university = Column(String, nullable=False)
    consent_share = Column(Boolean, default=False, nullable=False)
    expectations = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    ambassador_code = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    members = relationship(
        "HackXMember", back_populates="team", cascade="all, delete-orphan"
    )


class HackXMember(Base):
    __tablename__ = "hackx_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(
        Integer, ForeignKey("hackx_teams.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False)
    nic = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    is_leader = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    team = relationship("HackXTeam", back_populates="members")
