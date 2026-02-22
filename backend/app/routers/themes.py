from fastapi import APIRouter

router = APIRouter()

THEMES = {
    "deep_amethyst": {
        "name": "Глубокий Аметист",
        "description": "Мистический и спокойный",
        "gradient": ["#1A0533", "#2D1B69"],
        "accent": "#A29BFE",
        "icon": "💜",
    },
    "midnight_emerald": {
        "name": "Полночный Изумруд",
        "description": "Свежий и натуральный",
        "gradient": ["#0D2818", "#1A472A"],
        "accent": "#00B894",
        "icon": "💚",
    },
    "silver_fog": {
        "name": "Серебряный Туман",
        "description": "Строгий минимализм",
        "gradient": ["#1C1C1E", "#2C2C2E"],
        "accent": "#8E8E93",
        "icon": "🩶",
    },
    "volcanic_ash": {
        "name": "Вулканический Пепел",
        "description": "Энергичный и тёплый",
        "gradient": ["#2D0A0A", "#4A1A1A"],
        "accent": "#FF6348",
        "icon": "🧡",
    },
}


@router.get("")
async def get_themes():
    return THEMES
