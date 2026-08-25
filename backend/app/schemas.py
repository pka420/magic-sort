"""Request and response shapes, separate from the database rows."""

from pydantic import BaseModel, EmailStr, Field

# Usernames are what shows on the leaderboard, so they stay short, printable
# and unspoofable: letters, digits, underscore and hyphen only.
USERNAME_PATTERN = r"^[A-Za-z0-9_\-]{3,30}$"


class RegisterRequest(BaseModel):
    username: str = Field(pattern=USERNAME_PATTERN)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UsernameRequest(BaseModel):
    username: str = Field(pattern=USERNAME_PATTERN)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    username: str | None
    email: str | None
    is_verified: bool
    auth_provider: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ScoreSubmitRequest(BaseModel):
    total: int = Field(ge=0)


class ScoreResponse(BaseModel):
    total: int


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    total: int


class Message(BaseModel):
    message: str
