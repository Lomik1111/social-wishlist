"""Add indexes and check constraints

Revision ID: 002_indexes_constraints
Revises: 002_password_reset
Create Date: 2026-02-24

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers
revision: str = '002_indexes_constraints'
down_revision: Union[str, None] = '002_password_reset'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Additional indexes for query performance ---
    op.create_index(
        'ix_reservations_reserver_id',
        'reservations',
        ['reserver_id'],
    )
    op.create_index(
        'ix_contributions_contributor_id',
        'contributions',
        ['contributor_id'],
    )
    op.create_index(
        'ix_notifications_sender_id',
        'notifications',
        ['sender_id'],
    )
    op.create_index(
        'ix_notifications_recipient_unread',
        'notifications',
        ['recipient_id', 'is_read'],
    )
    op.create_index(
        'ix_friendships_addressee_status',
        'friendships',
        ['addressee_id', 'status'],
    )

    # --- Check constraints for data integrity ---
    op.create_check_constraint(
        'check_item_priority',
        'items',
        "priority IN ('must_have', 'nice_to_have', 'dream', 'normal')",
    )
    op.create_check_constraint(
        'check_wishlist_privacy',
        'wishlists',
        "privacy IN ('public', 'friends', 'selected', 'private')",
    )
    op.create_check_constraint(
        'check_friendship_status',
        'friendships',
        "status IN ('pending', 'accepted', 'blocked')",
    )
    op.create_check_constraint(
        'check_thanks_reaction',
        'reservations',
        "thanks_reaction IS NULL OR thanks_reaction IN ('love', 'gift', 'fire', 'sparkle')",
    )


def downgrade() -> None:
    # --- Drop check constraints ---
    op.drop_constraint('check_thanks_reaction', 'reservations', type_='check')
    op.drop_constraint('check_friendship_status', 'friendships', type_='check')
    op.drop_constraint('check_wishlist_privacy', 'wishlists', type_='check')
    op.drop_constraint('check_item_priority', 'items', type_='check')

    # --- Drop indexes ---
    op.drop_index('ix_friendships_addressee_status', table_name='friendships')
    op.drop_index('ix_notifications_recipient_unread', table_name='notifications')
    op.drop_index('ix_notifications_sender_id', table_name='notifications')
    op.drop_index('ix_contributions_contributor_id', table_name='contributions')
    op.drop_index('ix_reservations_reserver_id', table_name='reservations')
