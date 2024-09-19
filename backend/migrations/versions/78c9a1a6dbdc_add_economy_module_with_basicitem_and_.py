"""Add Economy module with BasicItem and ComplexItem

Revision ID: 78c9a1a6dbdc
Revises: 
Create Date: 2024-09-19 19:45:30.574671

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '78c9a1a6dbdc'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('basic_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('unit_point_price', sa.Float(), nullable=False),
    sa.Column('pack_size', sa.Integer(), nullable=False),
    sa.Column('pack_price', sa.Float(), nullable=False),
    sa.Column('buy_out_price', sa.Float(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('complex_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('total_price', sa.Float(), nullable=False),
    sa.Column('buy_out_price', sa.Float(), nullable=False),
    sa.Column('special_conditions', sa.Text(), nullable=True),
    sa.Column('rarity', sa.Enum('COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY', 'ARTEFACT', name='rarityenum'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('user',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=64), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('password_hash', sa.String(length=128), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('username')
    )
    op.create_table('complex_item_basic_item',
    sa.Column('complex_item_id', sa.Integer(), nullable=False),
    sa.Column('basic_item_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['basic_item_id'], ['basic_items.id'], ),
    sa.ForeignKeyConstraint(['complex_item_id'], ['complex_items.id'], ),
    sa.PrimaryKeyConstraint('complex_item_id', 'basic_item_id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('complex_item_basic_item')
    op.drop_table('user')
    op.drop_table('complex_items')
    op.drop_table('basic_items')
    # ### end Alembic commands ###
