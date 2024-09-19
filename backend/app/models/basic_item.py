# backend/app/models/basic_item.py

from ..extensions import db


class BasicItem(db.Model):
    __tablename__ = 'basic_items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    unit_point_price = db.Column(db.Float, nullable=False)
    pack_size = db.Column(db.Integer, nullable=False)
    pack_price = db.Column(db.Float, nullable=False)
    buy_out_price = db.Column(db.Float, nullable=False)

    # Relationship with ComplexItem
    complex_items = db.relationship('ComplexItemBasicItem', back_populates='basic_item')

    def __repr__(self):
        return f"<BasicItem {self.name}>"
