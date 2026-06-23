"""Milestone 2 & 3: Product resolution and local inventory schema

Revision ID: 042_milestone_2_3
Revises: 042aa75bd826
Create Date: 2026-06-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '042_milestone_2_3'
down_revision = '042aa75bd826'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to products table
    op.add_column('products', sa.Column('upc', sa.String(), nullable=True))
    op.add_column('products', sa.Column('brand', sa.String(), nullable=True))
    op.add_column('products', sa.Column('image_url', sa.String(), nullable=True))
    op.create_index(op.f('ix_products_upc'), 'products', ['upc'], unique=True)

    # Enhance price_snapshots table
    op.add_column('price_snapshots', sa.Column('store_id', sa.String(), nullable=True))
    op.add_column('price_snapshots', sa.Column('original_price', sa.Float(), nullable=True))
    op.add_column('price_snapshots', sa.Column('in_stock', sa.Boolean(), nullable=True))
    op.add_column('price_snapshots', sa.Column('url', sa.String(), nullable=True))
    op.create_index('idx_price_snapshots_retailer_captured', 'price_snapshots', ['retailer', 'captured_at'])

    # Create stores table
    op.create_table(
        'stores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer', sa.String(), nullable=False),
        sa.Column('store_number', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('zip', sa.String(), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lon', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stores_retailer'), 'stores', ['retailer'])
    op.create_index(op.f('ix_stores_city'), 'stores', ['city'])
    op.create_index(op.f('ix_stores_state'), 'stores', ['state'])
    op.create_index(op.f('ix_stores_zip'), 'stores', ['zip'])
    op.create_index(op.f('ix_stores_store_number'), 'stores', ['store_number'])

    # Create coupons table
    op.create_table(
        'coupons',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('retailer', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('discount_type', sa.String(), nullable=False),
        sa.Column('discount_value', sa.Float(), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupons_retailer'), 'coupons', ['retailer'])
    op.create_index(op.f('ix_coupons_expires_at'), 'coupons', ['expires_at'])

    # Create portal_rates table
    op.create_table(
        'portal_rates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('portal_name', sa.String(), nullable=False),
        sa.Column('retailer', sa.String(), nullable=False),
        sa.Column('cashback_rate', sa.Float(), nullable=False),
        sa.Column('scraped_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_portal_rates_portal_name'), 'portal_rates', ['portal_name'])
    op.create_index(op.f('ix_portal_rates_retailer'), 'portal_rates', ['retailer'])
    op.create_index(op.f('ix_portal_rates_expires_at'), 'portal_rates', ['expires_at'])

    # Enhance alerts table
    op.add_column('alerts', sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('alerts', sa.Column('notify_email', sa.String(), nullable=True))
    op.add_column('alerts', sa.Column('last_checked_at', sa.DateTime(), nullable=True))
    op.create_foreign_key('fk_alerts_product_id', 'alerts', 'products', ['product_id'], ['id'])
    op.create_index(op.f('ix_alerts_product_id'), 'alerts', ['product_id'])


def downgrade() -> None:
    # Drop indices and columns added in upgrade
    op.drop_index(op.f('ix_alerts_product_id'), table_name='alerts')
    op.drop_constraint('fk_alerts_product_id', 'alerts', type_='foreignkey')
    op.drop_column('alerts', 'last_checked_at')
    op.drop_column('alerts', 'notify_email')
    op.drop_column('alerts', 'product_id')

    op.drop_index(op.f('ix_portal_rates_expires_at'), table_name='portal_rates')
    op.drop_index(op.f('ix_portal_rates_retailer'), table_name='portal_rates')
    op.drop_index(op.f('ix_portal_rates_portal_name'), table_name='portal_rates')
    op.drop_table('portal_rates')

    op.drop_index(op.f('ix_coupons_expires_at'), table_name='coupons')
    op.drop_index(op.f('ix_coupons_retailer'), table_name='coupons')
    op.drop_table('coupons')

    op.drop_index(op.f('ix_stores_store_number'), table_name='stores')
    op.drop_index(op.f('ix_stores_zip'), table_name='stores')
    op.drop_index(op.f('ix_stores_state'), table_name='stores')
    op.drop_index(op.f('ix_stores_city'), table_name='stores')
    op.drop_index(op.f('ix_stores_retailer'), table_name='stores')
    op.drop_table('stores')

    op.drop_index('idx_price_snapshots_retailer_captured', table_name='price_snapshots')
    op.drop_column('price_snapshots', 'url')
    op.drop_column('price_snapshots', 'in_stock')
    op.drop_column('price_snapshots', 'original_price')
    op.drop_column('price_snapshots', 'store_id')

    op.drop_index(op.f('ix_products_upc'), table_name='products')
    op.drop_column('products', 'image_url')
    op.drop_column('products', 'brand')
    op.drop_column('products', 'upc')
