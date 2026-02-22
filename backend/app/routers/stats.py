from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func, extract
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.wishlist import Wishlist
from app.models.reservation import Reservation
from app.models.item_category import ItemCategory
from app.schemas.stats import UserStatsResponse, MonthlyActivity, TopGiver
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserStatsResponse)
async def get_my_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Total gifts (items across all wishlists)
    total_result = await db.execute(
        select(sa_func.count(Item.id))
        .join(Wishlist, Item.wishlist_id == Wishlist.id)
        .where(Wishlist.owner_id == user.id)
    )
    total_gifts = total_result.scalar_one() or 0

    # Reserved count
    reserved_result = await db.execute(
        select(sa_func.count(Reservation.id))
        .join(Item, Reservation.item_id == Item.id)
        .join(Wishlist, Item.wishlist_id == Wishlist.id)
        .where(Wishlist.owner_id == user.id)
    )
    reserved_count = reserved_result.scalar_one() or 0

    # Top category
    cat_result = await db.execute(
        select(ItemCategory.category, sa_func.count(ItemCategory.id).label("cnt"))
        .join(Item, ItemCategory.item_id == Item.id)
        .join(Wishlist, Item.wishlist_id == Wishlist.id)
        .where(Wishlist.owner_id == user.id)
        .group_by(ItemCategory.category)
        .order_by(sa_func.count(ItemCategory.id).desc())
        .limit(1)
    )
    top_cat_row = cat_result.first()
    top_category = top_cat_row[0] if top_cat_row else None

    # Average price
    avg_result = await db.execute(
        select(sa_func.avg(Item.price))
        .join(Wishlist, Item.wishlist_id == Wishlist.id)
        .where(Wishlist.owner_id == user.id, Item.price.isnot(None))
    )
    avg_price = float(avg_result.scalar_one() or 0)

    # Monthly activity (last 6 months)
    monthly_result = await db.execute(
        select(
            extract("month", Item.created_at).label("month"),
            sa_func.count(Item.id),
        )
        .join(Wishlist, Item.wishlist_id == Wishlist.id)
        .where(Wishlist.owner_id == user.id)
        .group_by(extract("month", Item.created_at))
        .order_by(extract("month", Item.created_at))
        .limit(6)
    )
    months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
    monthly_activity = [
        MonthlyActivity(month=months[int(row[0]) - 1] if row[0] else "?", count=row[1])
        for row in monthly_result.all()
    ]

    # Top givers (people who reserved items from user's wishlists)
    givers_result = await db.execute(
        select(User.id, User.full_name, User.username, User.avatar_url, sa_func.count(Reservation.id).label("cnt"))
        .join(Reservation, Reservation.reserver_id == User.id)
        .join(Item, Reservation.item_id == Item.id)
        .join(Wishlist, Item.wishlist_id == Wishlist.id)
        .where(Wishlist.owner_id == user.id, Reservation.reserver_id.isnot(None))
        .group_by(User.id, User.full_name, User.username, User.avatar_url)
        .order_by(sa_func.count(Reservation.id).desc())
        .limit(5)
    )
    top_givers = [
        TopGiver(user_id=str(row[0]), full_name=row[1], username=row[2], avatar_url=row[3], count=row[4])
        for row in givers_result.all()
    ]

    return UserStatsResponse(
        total_gifts=total_gifts,
        reserved_count=reserved_count,
        top_category=top_category,
        avg_price=avg_price,
        monthly_activity=monthly_activity,
        top_givers=top_givers,
    )
