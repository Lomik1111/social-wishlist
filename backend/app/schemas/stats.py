from typing import Optional
from pydantic import BaseModel


class MonthlyActivity(BaseModel):
    month: str
    count: int


class TopGiver(BaseModel):
    user_id: str
    full_name: Optional[str]
    username: Optional[str]
    avatar_url: Optional[str]
    count: int


class UserStatsResponse(BaseModel):
    total_gifts: int = 0
    reserved_count: int = 0
    top_category: Optional[str] = None
    avg_price: float = 0.0
    monthly_activity: list[MonthlyActivity] = []
    top_givers: list[TopGiver] = []
