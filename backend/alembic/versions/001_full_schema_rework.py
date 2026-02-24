"""Full schema rework for iOS app

Revision ID: 001_full_schema
Revises:
Create Date: 2026-02-23

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = '001_full_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Safety: refuse to drop tables if they already contain data
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = 'users')"
    ))
    if result.scalar():
        # Check if it has data
        try:
            count = conn.execute(sa.text("SELECT COUNT(*) FROM users")).scalar()
            if count and count > 0:
                raise RuntimeError(
                    "Refusing to drop existing tables with data. "
                    "This migration is for initial setup only. "
                    f"Found {count} users in the database."
                )
        except Exception as e:
            if "RuntimeError" in str(type(e)):
                raise
            pass  # Table might not be accessible, proceed with migration

    # Drop old tables if they exist (order matters for FK constraints)
    op.execute("DROP TABLE IF EXISTS refresh_tokens CASCADE")
    op.execute("DROP TABLE IF EXISTS contributions CASCADE")
    op.execute("DROP TABLE IF EXISTS reservations CASCADE")
    op.execute("DROP TABLE IF EXISTS items CASCADE")
    op.execute("DROP TABLE IF EXISTS wishlists CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")

    # === USERS ===
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('username', sa.String(50), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_online', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expo_push_token', sa.Text(), nullable=True),
        sa.Column('biometrics_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('theme', sa.String(50), nullable=False, server_default=sa.text("'deep_amethyst'")),
        sa.Column('google_id', sa.String(255), nullable=True),
        sa.Column('apple_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('google_id'),
        sa.UniqueConstraint('apple_id'),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])

    # === FRIENDSHIPS ===
    op.create_table(
        'friendships',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('requester_id', sa.Uuid(), nullable=False),
        sa.Column('addressee_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['addressee_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('requester_id', 'addressee_id', name='uq_friendship'),
    )
    op.create_index('ix_friendships_requester_id', 'friendships', ['requester_id'])
    op.create_index('ix_friendships_addressee_id', 'friendships', ['addressee_id'])

    # === WISHLISTS ===
    op.create_table(
        'wishlists',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('occasion', sa.String(50), nullable=True),
        sa.Column('event_date', sa.Date(), nullable=True),
        sa.Column('share_token', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('theme', sa.String(50), nullable=False, server_default=sa.text("'deep_amethyst'")),
        sa.Column('cover_image_url', sa.Text(), nullable=True),
        sa.Column('privacy', sa.String(20), nullable=False, server_default=sa.text("'friends'")),
        sa.Column('show_prices', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('anonymous_reservations', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('notifications_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('item_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('reserved_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('share_token'),
    )
    op.create_index('ix_wishlists_owner_id', 'wishlists', ['owner_id'])
    op.create_index('ix_wishlists_share_token', 'wishlists', ['share_token'])

    # === WISHLIST ACCESS ===
    op.create_table(
        'wishlist_access',
        sa.Column('wishlist_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint('wishlist_id', 'user_id'),
        sa.ForeignKeyConstraint(['wishlist_id'], ['wishlists.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # === ITEMS ===
    op.create_table(
        'items',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('wishlist_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, server_default=sa.text("'RUB'")),
        sa.Column('source_domain', sa.String(255), nullable=True),
        sa.Column('is_group_gift', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('priority', sa.String(20), nullable=False, server_default=sa.text("'normal'")),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('is_liked_by_owner', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wishlist_id'], ['wishlists.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_items_wishlist_id', 'items', ['wishlist_id'])

    # === ITEM LIKES ===
    op.create_table(
        'item_likes',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('item_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('item_id', 'user_id', name='uq_item_like'),
    )
    op.create_index('ix_item_likes_item_id', 'item_likes', ['item_id'])
    op.create_index('ix_item_likes_user_id', 'item_likes', ['user_id'])

    # === RESERVATIONS ===
    op.create_table(
        'reservations',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('item_id', sa.Uuid(), nullable=False),
        sa.Column('reserver_id', sa.Uuid(), nullable=True),
        sa.Column('guest_name', sa.String(255), nullable=True),
        sa.Column('guest_identifier', sa.String(255), nullable=True),
        sa.Column('is_anonymous', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_purchased', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('purchased_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('thanks_sent', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('thanks_reaction', sa.String(50), nullable=True),
        sa.Column('thanks_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reserver_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_reservations_item_id', 'reservations', ['item_id'])
    op.create_index('ix_reservations_guest_identifier', 'reservations', ['guest_identifier'])

    # === CONTRIBUTIONS ===
    op.create_table(
        'contributions',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('item_id', sa.Uuid(), nullable=False),
        sa.Column('contributor_id', sa.Uuid(), nullable=True),
        sa.Column('guest_name', sa.String(255), nullable=True),
        sa.Column('guest_identifier', sa.String(255), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['contributor_id'], ['users.id'], ondelete='SET NULL'),
        sa.CheckConstraint('amount > 0', name='check_positive_amount'),
    )
    op.create_index('ix_contributions_item_id', 'contributions', ['item_id'])
    op.create_index('ix_contributions_guest_identifier', 'contributions', ['guest_identifier'])

    # === NOTIFICATIONS ===
    op.create_table(
        'notifications',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('recipient_id', sa.Uuid(), nullable=False),
        sa.Column('sender_id', sa.Uuid(), nullable=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('data', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'])

    # === ITEM CATEGORIES ===
    op.create_table(
        'item_categories',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('item_id', sa.Uuid(), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_item_categories_item_id', 'item_categories', ['item_id'])

    # === REFRESH TOKENS ===
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Uuid(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('token', sa.String(512), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token'),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_token', 'refresh_tokens', ['token'])


def downgrade() -> None:
    op.drop_table('refresh_tokens')
    op.drop_table('item_categories')
    op.drop_table('notifications')
    op.drop_table('contributions')
    op.drop_table('reservations')
    op.drop_table('item_likes')
    op.drop_table('items')
    op.drop_table('wishlist_access')
    op.drop_table('wishlists')
    op.drop_table('friendships')
    op.drop_table('users')
