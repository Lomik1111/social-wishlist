diff --git a/backend/app/schemas/user.py b/backend/app/schemas/user.py
index 3711a66b2843cedf6b4a1524787a78990468ffbd..19ead88bea816668a440f599ea851e4e5c130930 100644
--- a/backend/app/schemas/user.py
+++ b/backend/app/schemas/user.py
@@ -16,25 +16,29 @@ class UserUpdate(BaseModel):
 
 class UserLogin(BaseModel):
     email: EmailStr
     password: str
 
 
 class UserResponse(BaseModel):
     id: UUID
     email: str
     full_name: str | None
     avatar_url: str | None
     created_at: datetime
 
     model_config = {"from_attributes": True}
 
 
 class TokenResponse(BaseModel):
     access_token: str
     refresh_token: str
     token_type: str = "bearer"
     user: UserResponse
 
 
 class RefreshRequest(BaseModel):
     refresh_token: str
+
+
+class GoogleAuthRequest(BaseModel):
+    credential: str = Field(min_length=1)
