from datetime import date
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator

# Sri Lankan NIC Pattern: 9 digits with optional V/X, or 12 digits
NIC_PATTERN = r"^(?:\d{9}[vVxX]|\d{12})$"
# Sri Lankan Phone Number Pattern (e.g. 0771234567)
PHONE_PATTERN = r"^07\d{8}$"

DISTRICTS = {
    "colombo",
    "gampaha",
    "kalutara",
    "kandy",
    "matale",
    "nuwara eliya",
    "galle",
    "matara",
    "hambantota",
    "jaffna",
    "kilinochchi",
    "mannar",
    "vavuniya",
    "mullaitivu",
    "batticaloa",
    "ampara",
    "trincomalee",
    "kurunegala",
    "puttalam",
    "anuradhapura",
    "polonnaruwa",
    "badulla",
    "moneragala",
    "ratnapura",
    "kegalle",
}


# ==========================================
# HackX (University Tier) Schemas
# ==========================================


class HackXMemberSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    nic: str = Field(..., pattern=NIC_PATTERN)
    phone: str = Field(..., pattern=PHONE_PATTERN)
    email: EmailStr
    is_leader: bool = False


class HackXRegisterSchema(BaseModel):
    team_name: str = Field(..., min_length=2, max_length=50)
    university: str = Field(..., min_length=2, max_length=100)
    consent_share: bool = False
    expectations: Optional[str] = Field(None, max_length=1000)
    source: Optional[str] = Field(None, max_length=100)
    ambassador_code: Optional[str] = None
    verification_token: str
    members: List[HackXMemberSchema] = Field(..., min_length=1, max_length=5)

    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, data):
        if isinstance(data, dict):
            for field in ["expectations", "source", "ambassador_code"]:
                if field in data and data[field] == "":
                    data[field] = None
        return data

    @model_validator(mode="after")
    def validate_hackx_registration(self) -> "HackXRegisterSchema":
        # 1. Verify Member Count (1-5 members)
        # Already handled by min_length=1 and max_length=5 in Field, but let's double check
        if not (1 <= len(self.members) <= 5):
            raise ValueError("Team must have between 1 and 5 members.")

        # 2. Check for exactly one leader
        leaders = [m for m in self.members if m.is_leader]
        if len(leaders) != 1:
            raise ValueError("Team registration must designate exactly one leader.")

        # 3. Check for unique member details (name, email, NIC) within this submission
        names = set()
        emails = set()
        nics = set()

        for m in self.members:
            n_lower = m.name.strip().lower()
            e_lower = m.email.strip().lower()
            nic_normalized = m.nic.strip().upper()

            if n_lower in names:
                raise ValueError(f"Duplicate member name detected: '{m.name}'")
            if e_lower in emails:
                raise ValueError(f"Duplicate member email detected: '{m.email}'")
            if nic_normalized in nics:
                raise ValueError(f"Duplicate member NIC detected: '{m.nic}'")

            names.add(n_lower)
            emails.add(e_lower)
            nics.add(nic_normalized)

        return self


# ==========================================
# HackX Jr (School Tier) Schemas
# ==========================================


class HackXJrMemberSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    dob: date = Field(..., description="Date of birth")
    phone: str = Field(..., pattern=PHONE_PATTERN)
    email: Optional[EmailStr] = None
    is_leader: bool = False

    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, data):
        if isinstance(data, dict):
            if "email" in data and data["email"] == "":
                data["email"] = None
        return data


class HackXJrRegisterSchema(BaseModel):
    team_name: str = Field(..., min_length=2, max_length=50)
    school_name: str = Field(..., min_length=2, max_length=100)
    school_district: str = Field(..., min_length=2, max_length=50)
    teacher_name: Optional[str] = Field(None, max_length=100)
    teacher_phone: Optional[str] = Field(None, pattern=PHONE_PATTERN)
    teacher_email: Optional[EmailStr] = None
    consent_share: bool = False
    expectations: Optional[str] = Field(None, max_length=1000)
    source: Optional[str] = Field(None, max_length=100)
    ambassador_code: Optional[str] = None
    verification_token: str
    members: List[HackXJrMemberSchema] = Field(..., min_length=1, max_length=5)

    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, data):
        if isinstance(data, dict):
            for field in [
                "teacher_name",
                "teacher_phone",
                "teacher_email",
                "expectations",
                "source",
                "ambassador_code",
            ]:
                if field in data and data[field] == "":
                    data[field] = None
        return data

    @model_validator(mode="after")
    def validate_hackx_jr_registration(self) -> "HackXJrRegisterSchema":
        # 1. Verify Member Count (1-5 members)
        if not (1 <= len(self.members) <= 5):
            raise ValueError("Team must have between 1 and 5 members.")

        # 2. Check for exactly one leader
        leaders = [m for m in self.members if m.is_leader]
        if len(leaders) != 1:
            raise ValueError("Team registration must designate exactly one leader.")

        # 3. Check for unique member details (name, email)
        names = set()
        emails = set()

        for m in self.members:
            n_lower = m.name.strip().lower()
            if n_lower in names:
                raise ValueError(f"Duplicate member name detected: '{m.name}'")
            names.add(n_lower)

            if m.is_leader and not m.email:
                raise ValueError("Leader's email is required.")

            if m.email:
                e_lower = m.email.strip().lower()
                if e_lower in emails:
                    raise ValueError(f"Duplicate member email detected: '{m.email}'")
                emails.add(e_lower)

        # 4. District validation and lowercasing
        district_lower = self.school_district.strip().lower()
        if district_lower not in DISTRICTS:
            raise ValueError(
                f"'{self.school_district}' is not a valid Sri Lankan school district."
            )
        self.school_district = district_lower

        return self
