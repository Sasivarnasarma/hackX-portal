from pydantic import BaseModel, EmailStr, Field


class SendOTPRequest(BaseModel):
    email: EmailStr
    turnstile_token: str
    purpose: str = Field(
        ..., description="Must be 'hackx_registration' or 'hackx_jr_registration'"
    )


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    captcha_session_token: str
    purpose: str = Field(
        ..., description="Must be 'hackx_registration' or 'hackx_jr_registration'"
    )


class ResendOTPRequest(BaseModel):
    email: EmailStr
    captcha_session_token: str
    purpose: str = Field(
        ..., description="Must be 'hackx_registration' or 'hackx_jr_registration'"
    )
