# backend/app/models/complex_item.py

from ..extensions import db
from .rarity import RarityEnum
from sqlalchemy.orm import relationship
from sqlalchemy import Enum


class ComplexItem(db.Model):
    __tablename__ = 'complex_items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    total_price = db.Column(db.Float, nullable=False)
    buy_out_price = db.Column(db.Float, nullable=False)
    special_conditions = db.Column(db.Text, nullable=True)
    rarity = db.Column(Enum(RarityEnum), nullable=False)

    # Relationship with BasicItem through association table
    basic_items = db.relationship('ComplexItemBasicItem', back_populates='complex_item')

    def __repr__(self):
        return f"<ComplexItem {self.name}>"


class ComplexItemBasicItem(db.Model):
    __tablename__ = 'complex_item_basic_item'

    complex_item_id = db.Column(db.Integer, db.ForeignKey('complex_items.id'), primary_key=True)
    basic_item_id = db.Column(db.Integer, db.ForeignKey('basic_items.id'), primary_key=True)

    complex_item = db.relationship('ComplexItem', back_populates='basic_items')
    basic_item = db.relationship('BasicItem', back_populates='complex_items')

    def __repr__(self):
        return f"<ComplexItemBasicItem ComplexItem ID: {self.complex_item_id}, BasicItem ID: {self.basic_item_id}>"
