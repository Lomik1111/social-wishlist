from fastapi import APIRouter
from pydantic import BaseModel
from app.services.autofill_service import fetch_metadata

router = APIRouter()


class AutoFillRequest(BaseModel):
    url: str


@router.post("")
async def autofill(data: AutoFillRequest):
    result = await fetch_metadata(data.url)
    return result
