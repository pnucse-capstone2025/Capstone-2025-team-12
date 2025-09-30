from pydantic import BaseModel, Field

class AuthSigninReq(BaseModel):
    login_id: str = Field(..., min_length=3, max_length=50)
    pwd: str = Field(..., min_length=8, max_length=100)

class AuthSignupReq(BaseModel):
    login_id: str = Field(..., min_length=3, max_length=50)
    pwd: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=30)

